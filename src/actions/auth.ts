"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { consignerAudit } from "@/lib/audit";
import {
  envoyerEmailVerification,
  envoyerLienReinitialisation,
} from "@/lib/email";
import {
  genererJetonReinitialisation,
  genererJetonVerification,
  verifierJetonReinitialisation,
} from "@/lib/jetons";
import { hacherMotDePasse } from "@/lib/mot-de-passe";
import { prisma } from "@/lib/prisma";
import type { AuthFormState } from "@/types/auth";

// ---------------------------------------------------------------------------
// Server Actions d'authentification : inscription publique (avec confirmation
// d'e-mail via Brevo) et réinitialisation de mot de passe.
// ---------------------------------------------------------------------------

const LONGUEUR_MOT_DE_PASSE = 8;

/** Schéma d'inscription publique (page /register). */
const inscriptionSchema = z
  .object({
    prenom: z
      .string()
      .trim()
      .min(2, "Le prénom doit contenir au moins 2 caractères.")
      .max(60, "60 caractères maximum."),
    nom: z
      .string()
      .trim()
      .min(2, "Le nom doit contenir au moins 2 caractères.")
      .max(60, "60 caractères maximum."),
    email: z.email("Adresse e-mail invalide."),
    motDePasse: z
      .string()
      .min(
        LONGUEUR_MOT_DE_PASSE,
        `Le mot de passe doit contenir au moins ${LONGUEUR_MOT_DE_PASSE} caractères.`,
      )
      .max(128, "128 caractères maximum.")
      .refine(
        (valeur) => /[A-Za-z]/.test(valeur) && /\d/.test(valeur),
        "Le mot de passe doit contenir au moins une lettre et un chiffre.",
      ),
    confirmation: z.string(),
    cgu: z.literal("on", { message: "Vous devez accepter les conditions." }),
  })
  .refine((donnees) => donnees.motDePasse === donnees.confirmation, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmation"],
  });

/** Aides de retour (même convention que src/actions/utilisateurs.ts). */
function echec(message: string, champ = "_form"): AuthFormState {
  return {
    success: false,
    message,
    fieldErrors: { [champ]: [message] },
  };
}

function echecChamps(
  fieldErrors: Record<string, string[]>,
  message = "Le formulaire contient des erreurs. Vérifiez les champs signalés.",
): AuthFormState {
  return { success: false, message, fieldErrors };
}

/**
 * Inscription publique : valide le formulaire, hache le mot de passe (scrypt),
 * crée le compte **inactif** (`actif: false`) puis envoie l'e-mail de
 * confirmation Brevo. Le compte n'est activé qu'après clic sur le lien de
 * vérification (route /api/auth/verification-email).
 */
export async function inscrireUtilisateur(
  _precedent: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const brut = {
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    motDePasse: formData.get("motDePasse"),
    confirmation: formData.get("confirmation"),
    // Une case cochée soumet "on" ; non cochée → null (validation Zod en échec).
    cgu: formData.get("cgu"),
  };

  const analyse = inscriptionSchema.safeParse(brut);
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return echecChamps(fieldErrors);
  }

  const donnees = analyse.data;
  const email = donnees.email.trim().toLowerCase();
  const nomComplet = `${donnees.prenom} ${donnees.nom}`.trim();

  try {
    const existant = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existant) {
      return echec("Un compte existe déjà avec cette adresse e-mail.", "email");
    }

    const motDePasseHash = await hacherMotDePasse(donnees.motDePasse);
    const utilisateur = await prisma.utilisateur.create({
      data: {
        nomComplet,
        email,
        role: "MEMBRE_CONSULTATION",
        motDePasseHash,
        motDePasseTemporaire: false,
        // Inactif tant que l'adresse e-mail n'est pas confirmée.
        actif: false,
      },
    });

    await consignerAudit({
      action: "CREATION",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      auteurNom: nomComplet,
      details: `Inscription de « ${nomComplet} » (${email}) — compte en attente de confirmation d'e-mail.`,
    });

    // E-mail de confirmation via Brevo (best effort : l'échec d'envoi ne
    // supprime pas le compte, mais est signalé à l'utilisateur).
    const jeton = genererJetonVerification(email);
    const envoye = await envoyerEmailVerification(email, jeton);

    if (!envoye) {
      console.error(
        `Échec d'envoi de l'e-mail de confirmation pour ${email} — compte ${utilisateur.id} créé mais inactif.`,
      );
      return {
        success: false,
        message:
          "Votre compte a été créé, mais l'e-mail de confirmation n'a pas pu être envoyé. Contactez votre administrateur pour activer votre compte.",
        fieldErrors: {},
      };
    }

    revalidatePath("/login");

    return {
      success: true,
      message:
        "Votre compte a été créé ! Confirmez votre adresse e-mail grâce au lien envoyé, puis connectez-vous.",
      fieldErrors: {},
    };
  } catch (erreur) {
    console.error("Erreur serveur (inscription) :", erreur);
    return echec(
      "Impossible de créer le compte. Vérifiez la connexion à la base de données.",
    );
  }
}

/** Schéma de demande de réinitialisation (page /mot-de-passe-oublie). */
const demandeReinitialisationSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
});

/**
 * Demande de réinitialisation de mot de passe : envoie un e-mail Brevo avec un
 * jeton valable 1 heure. Retourne toujours un message de succès pour ne pas
 * révéler l'existence (ou non) d'un compte.
 */
export async function demanderReinitialisation(
  _precedent: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const analyse = demandeReinitialisationSchema.safeParse({
    email: formData.get("email"),
  });
  if (!analyse.success) {
    return echecChamps(
      { email: [analyse.error.issues[0]?.message ?? "Adresse e-mail invalide."] },
      "Vérifiez l'adresse e-mail saisie.",
    );
  }

  const email = analyse.data.email.trim().toLowerCase();

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true, nomComplet: true },
    });

    if (utilisateur) {
      const jeton = genererJetonReinitialisation(email);
      await envoyerLienReinitialisation(email, jeton);
      await consignerAudit({
        action: "DEMANDE_REINITIALISATION",
        entite: "Utilisateur",
        entiteId: utilisateur.id,
        auteurNom: utilisateur.nomComplet,
        details: `Demande de réinitialisation du mot de passe pour ${email}.`,
      });
    }
  } catch (erreur) {
    console.error("Erreur serveur (demande de réinitialisation) :", erreur);
  }

  return {
    success: true,
    message:
      "Si un compte est associé à cette adresse, un e-mail de réinitialisation vient d'être envoyé.",
    fieldErrors: {},
  };
}

/** Schéma du nouveau mot de passe (page /reinitialisation-mot-de-passe). */
const nouveauMotDePasseSchema = z
  .object({
    jeton: z.string().min(1, "Jeton manquant."),
    motDePasse: z
      .string()
      .min(
        LONGUEUR_MOT_DE_PASSE,
        `Le mot de passe doit contenir au moins ${LONGUEUR_MOT_DE_PASSE} caractères.`,
      )
      .max(128, "128 caractères maximum.")
      .refine(
        (valeur) => /[A-Za-z]/.test(valeur) && /\d/.test(valeur),
        "Le mot de passe doit contenir au moins une lettre et un chiffre.",
      ),
    confirmation: z.string(),
  })
  .refine((donnees) => donnees.motDePasse === donnees.confirmation, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmation"],
  });

/**
 * Applique le nouveau mot de passe : vérifie le jeton (signature HMAC +
 * expiration), remplace le hachage scrypt et repasse le compte en actif s'il
 * était en attente de confirmation.
 */
export async function reinitialiserMotDePasse(
  _precedent: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const analyse = nouveauMotDePasseSchema.safeParse({
    jeton: formData.get("jeton"),
    motDePasse: formData.get("motDePasse"),
    confirmation: formData.get("confirmation"),
  });
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return echecChamps(fieldErrors);
  }

  const email = verifierJetonReinitialisation(analyse.data.jeton);
  if (!email) {
    return echec(
      "Lien de réinitialisation invalide ou expiré. Refaites une demande.",
      "jeton",
    );
  }

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true, nomComplet: true, actif: true },
    });
    if (!utilisateur) {
      return echec(
        "Lien de réinitialisation invalide ou expiré. Refaites une demande.",
        "jeton",
      );
    }

    const motDePasseHash = await hacherMotDePasse(analyse.data.motDePasse);
    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        motDePasseHash,
        motDePasseTemporaire: false,
        // Un utilisateur qui réinitialise son mot de passe devient actif
        // (couvre le cas d'un compte encore en attente de confirmation).
        actif: true,
      },
    });

    await consignerAudit({
      action: "REINITIALISATION_MOT_DE_PASSE",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      auteurNom: utilisateur.nomComplet,
      details: `Mot de passe réinitialisé pour « ${utilisateur.nomComplet} » (${email}).`,
    });

    return {
      success: true,
      message:
        "Votre mot de passe a été réinitialisé. Vous pouvez désormais vous connecter.",
      fieldErrors: {},
    };
  } catch (erreur) {
    console.error(
      "Erreur serveur (réinitialisation de mot de passe) :",
      erreur,
    );
    return echec("Impossible de réinitialiser le mot de passe. Réessayez.");
  }
}