"use server";

import { randomInt } from "node:crypto";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { z } from "zod";

import { signIn } from "@/lib/auth";
import { envoyerCodeOtp } from "@/lib/email";
import { verifierMotDePasse } from "@/lib/mot-de-passe";
import { prisma } from "@/lib/prisma";
import type { AuthFormState } from "@/types/auth";

// ---------------------------------------------------------------------------
// Server Actions de connexion en deux temps (mot de passe + 2FA par OTP e-mail).
// 1. `connecter` vérifie le mot de passe (scrypt), génère un code OTP à
//    6 chiffres (valable 10 min), l'enregistre puis l'envoie via Brevo et
//    redirige vers /verifier-code sans ouvrir de session.
// 2. `verifierCodeOtp` contrôle le code puis ouvre la session NextAuth.
// 3. `renvoyerCodeOtp` régénère un code et le renvoie par e-mail.
// ---------------------------------------------------------------------------

/** Schéma du formulaire de connexion (page /login). */
const connexionSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  motDePasse: z.string().min(1, "Mot de passe requis."),
  /** Présence du champ = case « Se souvenir de moi » cochée. */
  seSouvenir: z.boolean(),
});

/** Schéma du formulaire de vérification du code OTP (page /verifier-code). */
const verificationCodeSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Le code doit contenir 6 chiffres."),
  seSouvenir: z.boolean(),
});

/** Schéma pour renvoyer un code OTP. */
const renvoiCodeSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  seSouvenir: z.boolean(),
});

/** Durée de validité du code OTP (10 minutes). */
const DUREE_OTP_MS = 10 * 60 * 1_000;

/**
 * Noms de cookie de session Auth.js v5 (préfixe `__Secure-` en HTTPS).
 * Utilisés pour raccourcir la session quand « Se souvenir de moi » est
 * décoché.
 */
const COOKIES_SESSION = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
] as const;

/**
 * Convertit un cookie existant en cookie de session du navigateur (supprime
 * la durée de vie persistante : le cookie disparaît à la fermeture du
 * navigateur). Nécessaire quand l'utilisateur ne souhaite pas être mémorisé.
 */
async function transformerEnCookieDeSession(): Promise<void> {
  const store = await cookies();
  for (const nom of COOKIES_SESSION) {
    const cookie = store.get(nom);
    if (cookie) {
      store.set(nom, cookie.value, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: nom.startsWith("__Secure"),
      });
    }
  }
}

/**
 * Étape 1 : vérifie e-mail + mot de passe (scrypt) SANS ouvrir de session.
 * Génère un OTP à 6 chiffres (10 min), l'enregistre, l'envoie via Brevo,
 * puis redirige vers /verifier-code.
 */
export async function connecter(
  _precedent: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const analyse = connexionSchema.safeParse({
    email: formData.get("email"),
    motDePasse: formData.get("motDePasse"),
    seSouvenir: formData.get("seSouvenir") === "on",
  });
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return { success: false, message: "Vérifiez les champs signalés.", fieldErrors };
  }

  const demandeEtape1 = formData.get("redirectTo");
  const cibleEtape1 =
    typeof demandeEtape1 === "string" && demandeEtape1.startsWith("/") && !demandeEtape1.startsWith("//")
      ? demandeEtape1
      : "/dashboard";

  const email = analyse.data.email.trim().toLowerCase();
  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
  const echec = {
    success: false,
    message:
      "Adresse e-mail ou mot de passe incorrect. Si votre compte n'a pas encore été confirmé, validez d'abord votre adresse e-mail.",
    fieldErrors: {},
  } as const;
  if (!utilisateur || !utilisateur.actif) return { ...echec };

  const ok = await verifierMotDePasse(analyse.data.motDePasse, utilisateur.motDePasseHash);
  if (!ok) return { ...echec };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: { codeOtp: code, expirationOtp: new Date(Date.now() + DUREE_OTP_MS) },
  });

  try {
    await envoyerCodeOtp(utilisateur.email, code);
  } catch (e) {
    console.error("Échec d'envoi du code OTP (Brevo) :", e);
  }

  const urlVerification =
    `/verifier-code?email=${encodeURIComponent(utilisateur.email)}` +
    `&redirectTo=${encodeURIComponent(cibleEtape1)}` +
    `&seSouvenir=${analyse.data.seSouvenir ? "1" : "0"}`;
  return { success: true, message: "", fieldErrors: {}, redirectTo: urlVerification };
}

/**
 * Étape 2 : contrôle le code OTP (6 chiffres, 10 min) puis ouvre la session
 * NextAuth (provider Credentials, mode `codeOtp`) et redirige vers la cible (/dashboard par défaut).
 */
export async function verifierCodeOtp(
  _precedent: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const analyse = verificationCodeSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    seSouvenir: formData.get("seSouvenir") === "on",
  });
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return { success: false, message: "Vérifiez les champs signalés.", fieldErrors };
  }
  const demande = formData.get("redirectTo");
  const cible =
    typeof demande === "string" && demande.startsWith("/") && !demande.startsWith("//")
      ? demande
      : "/dashboard";
  try {
    const resultat = await signIn("credentials", {
      email: analyse.data.email.trim().toLowerCase(),
      codeOtp: analyse.data.code.trim(),
      redirectTo: cible,
      redirect: false,
    });
    // Avec `redirect: false`, `signIn` ne redirige pas via exception :
    // une URL contenant "error" signale un échec d'authentification.
    if (typeof resultat === "string" && resultat.includes("error")) {
      return {
        success: false,
        message: "Code invalide ou expiré. Vérifiez le code reçu ou renvoyez un nouveau code.",
        fieldErrors: {},
      };
    }
    if (!analyse.data.seSouvenir) await transformerEnCookieDeSession();
    // Redirection propre vers /dashboard (ou la cible validée) : on renvoie
    // un chemin relatif interne pour laisser le client faire `router.replace()`,
    // sans repasser par une redirection middleware bouclée.
    const destination =
      cible.startsWith("/") &&
      !cible.startsWith("//") &&
      cible !== "/login" &&
      !cible.startsWith("/register") &&
      !cible.startsWith("/verifier-code")
        ? cible
        : "/dashboard";
    return { success: true, message: "", fieldErrors: {}, redirectTo: destination };
  } catch (erreur) {
    if (erreur instanceof AuthError) {
      return {
        success: false,
        message: "Code invalide ou expiré. Vérifiez le code reçu ou renvoyez un nouveau code.",
        fieldErrors: {},
      };
    }
    throw erreur;
  }
}

/** Régénère un OTP (10 min) et le renvoie par e-mail via Brevo. */
export async function renvoyerCodeOtp(
  _precedent: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const analyse = renvoiCodeSchema.safeParse({
    email: formData.get("email"),
    seSouvenir: formData.get("seSouvenir") === "on",
  });
  if (!analyse.success) return { success: false, message: "Adresse e-mail invalide.", fieldErrors: {} };
  const generique: AuthFormState = {
    success: true,
    message: "Si un compte existe pour cette adresse, un nouveau code vient d'être envoyé.",
    fieldErrors: {},
  };
  const email = analyse.data.email.trim().toLowerCase();
  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
  if (!utilisateur || !utilisateur.actif) return generique;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: { codeOtp: code, expirationOtp: new Date(Date.now() + DUREE_OTP_MS) },
  });
  try {
    await envoyerCodeOtp(utilisateur.email, code);
  } catch (e) {
    console.error("Échec de renvoi du code OTP (Brevo) :", e);
  }
  return generique;
}

/**
 * Alias historique demandé (`validerOtpEtConnecter(email, code)`) :
 * réexport de `verifierCodeOtp` — même vérification (code 6 chiffres non
 * expiré), ouverture de la session NextAuth puis redirection vers /finances.
 */
export const validerOtpEtConnecter = verifierCodeOtp;