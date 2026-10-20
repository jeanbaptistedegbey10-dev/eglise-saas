import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { consignerAudit } from "@/lib/audit";
import { authConfig } from "@/lib/auth.config";
import { verifierMotDePasse } from "@/lib/mot-de-passe";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Configuration Auth.js v5 — provider Credentials (e-mail + mot de passe
// haché scrypt). Étend la config edge-safe de auth.config.ts (callbacks de
// protection des routes) avec la partie serveur (Prisma, base de données).
//
// Le middleware (src/middleware.ts) importe uniquement auth.config.ts :
// Prisma n'est jamais chargé en runtime Edge.
// ---------------------------------------------------------------------------

/** Schéma des identifiants : mot de passe OU code OTP (2FA, étape 2). */
const identifiantsSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  motDePasse: z.string().min(1).optional(),
  codeOtp: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/)
    .optional(),
});

/** Session : JWT (aucun adapter requis), durée pilotée par AUTH_SESSION_MAX_AGE. */
const DUREE_SESSION = Number(process.env.AUTH_SESSION_MAX_AGE ?? 2_592_000);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: Number.isFinite(DUREE_SESSION) && DUREE_SESSION > 0 ? DUREE_SESSION : 2_592_000,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Adresse e-mail", type: "email" },
        motDePasse: { label: "Mot de passe", type: "password" },
        codeOtp: { label: "Code OTP", type: "text" },
      },
      /**
       * Authentifie un utilisateur (compte actif exigé) selon deux modes :
       * - `motDePasse` : e-mail + mot de passe scrypt valide ;
       * - `codeOtp` : e-mail + code OTP à 6 chiffres non expiré (2FA, étape 2
       *   — le code est consommé : effacé après succès).
       * Retourne `null` sinon (message générique côté client).
       */
      async authorize(identifiants) {
        const analyse = identifiantsSchema.safeParse(identifiants);
        if (!analyse.success) {
          return null;
        }

        const email = analyse.data.email.trim().toLowerCase();
        const utilisateur = await prisma.utilisateur.findUnique({
          where: { email },
        });

        // Compte introuvable OU suspendu (actif: false) → accès refusé.
        if (!utilisateur || !utilisateur.actif) {
          return null;
        }

        // Mode 2FA : vérification du code OTP (temps constant, non expiré).
        if (typeof analyse.data.codeOtp === "string" && analyse.data.codeOtp.length === 6) {
          const attendu = utilisateur.codeOtp ?? "";
          const expiration = utilisateur.expirationOtp;
          const codeValide =
            attendu.length === 6 &&
            expiration instanceof Date &&
            expiration.getTime() > Date.now() &&
            attendu.length === analyse.data.codeOtp.length &&
            timingSafeEqual(Buffer.from(attendu), Buffer.from(analyse.data.codeOtp));
          if (!codeValide) {
            return null;
          }
        } else if (typeof analyse.data.motDePasse === "string" && analyse.data.motDePasse.length > 0) {
          const motDePasseValide = await verifierMotDePasse(
            analyse.data.motDePasse,
            utilisateur.motDePasseHash,
          );
          if (!motDePasseValide) {
            return null;
          }
        } else {
          return null;
        }

        // Horodatage de connexion + consommation du code OTP (best effort).
        await prisma.utilisateur
          .update({
            where: { id: utilisateur.id },
            data: { derniereConnexion: new Date(), codeOtp: null, expirationOtp: null },
          })
          .catch((erreur) =>
            console.error("Mise à jour de derniereConnexion impossible :", erreur),
          );
        await consignerAudit({
          action: "CONNEXION",
          entite: "Utilisateur",
          entiteId: utilisateur.id,
          auteurNom: utilisateur.nomComplet,
          details: `Connexion de « ${utilisateur.nomComplet} » (${utilisateur.email}).`,
        });

        return {
          id: utilisateur.id,
          email: utilisateur.email,
          name: utilisateur.nomComplet,
          role: utilisateur.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Persistance du rôle Administrateur :
     * - Première connexion (`user` présent) : copie id + vrai rôle BDD.
     * - Sinon, si `trigger === "update"` OU si le token n'a pas été
     *   rafraîchi récemment (> 5 min), réinterroge Prisma pour récupérer
     *   le vrai rôle actuel en BDD (`user.role`).
     */
    async jwt({ token, user, trigger }) {
      const t = token as typeof token & {
        id?: string;
        role?: string;
        roleActualiseA?: number;
      };
      const FRAICHEUR_MAX_MS = 5 * 60 * 1000; // 5 minutes
      if (user) {
        const u = user as { id?: string; role?: string };
        if (u.id) t.id = u.id;
        if (u.role) t.role = u.role;
        t.roleActualiseA = Date.now();
        return t;
      }
      const dernierRefresh = t.roleActualiseA ?? 0;
      const perime = Date.now() - dernierRefresh > FRAICHEUR_MAX_MS;
      if (trigger === "update" || !t.roleActualiseA || perime) {
        try {
          const identifiant = t.id ?? t.sub;
          if (identifiant) {
            const enBase = await prisma.utilisateur.findUnique({
              where: { id: identifiant },
              select: { role: true },
            });
            if (enBase?.role) t.role = enBase.role;
            t.roleActualiseA = Date.now();
          }
        } catch (erreur) {
          console.error("Rafraîchissement du rôle JWT impossible :", erreur);
        }
      }
      return t;
    },
    /**
     * Expose id et rôle sur `session.user` (types : src/types/next-auth.d.ts).
     * Transmet systématiquement `session.user.role = token.role`.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token as { id?: string }).id ?? token.sub ?? "";
        const roleToken = (token as { role?: typeof session.user.role }).role;
        // Transmission systématique : le JWT fait foi, repli consultation.
        session.user.role = roleToken ?? session.user.role ?? "MEMBRE_CONSULTATION";
      }
      return session;
    },
  },
});

/**
 * Récour à la session serveur (Server Components / Server Actions).
 * Retourne `null` si aucune session valide n'existe.
 */
export async function obtenirSession() {
  return auth();
}