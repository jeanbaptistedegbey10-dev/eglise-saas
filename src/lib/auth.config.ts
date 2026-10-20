import { NextResponse } from "next/server";
import type { NextAuthConfig } from "next-auth";

import { aAccesAuChemin } from "@/lib/permissions";
import type { RoleUtilisateurValeur } from "@/lib/utilisateur";

// ---------------------------------------------------------------------------
// Configuration Auth.js de base — « edge-safe » (aucune dépendance Prisma).
// Elle est partagée par le middleware (runtime Edge) et par src/lib/auth.ts
// qui y ajoute le provider Credentials et l'accès base de données.
// ---------------------------------------------------------------------------

/** Routes préfixées nécessitant une session valide. */
export const CHEMINES_PROTEGES = [
  "/dashboard",
  "/parametres",
  "/finances",
  "/administration",
  "/patrimoine",
  "/communaute",
  "/organisation",
  "/membres",
  "/cultes",
  "/solidarite",
  "/rapports",
] as const;

/** Indique si un chemin se situe dans une zone protégée. */
function estProtege(pathname: string): boolean {
  return CHEMINES_PROTEGES.some(
    (chemin) => pathname === chemin || pathname.startsWith(`${chemin}/`),
  );
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * JWT edge-safe : propagation systématique du rôle sans accès BDD.
     * Le rafraîchissement réel depuis Prisma est fait dans `src/lib/auth.ts`
     * (runtime Node). Ici on ne fait que conserver `token.role`.
     */
    jwt({ token, user, trigger }) {
      const t = token as typeof token & {
        id?: string;
        role?: string;
        roleActualiseA?: number;
      };
      const u = user as { id?: string; role?: string } | undefined;
      // Première connexion : copie id + vrai rôle BDD porté par `user.role`.
      if (u) {
        if (u.id) t.id = u.id;
        if (u.role) t.role = u.role as typeof t.role;
        t.roleActualiseA = Date.now();
      }
      // `trigger === "update"` (ex: update() côté client) : marque pour
      // rafraîchissement — la relecture Prisma a lieu dans src/lib/auth.ts.
      if (trigger === "update" && !t.roleActualiseA) {
        t.roleActualiseA = 0;
      }
      return t;
    },
    /** Session edge-safe : transmet systématiquement `session.user.role`. */
    session({ session, token }) {
      const t = token as { id?: string; sub?: string; role?: string };
      if (session.user) {
        const s = session.user as typeof session.user & {
          id: string;
          role: string;
        };
        s.id = t.id ?? t.sub ?? s.id ?? "";
        // Transmission systématique du rôle JWT vers la session.
        if (t.role) s.role = t.role as RoleUtilisateurValeur;
      }
      return session;
    },
    /**
     * Protège les routes listées : sans session valide, Auth.js redirige
     * vers `/login` en conservant l'URL d'origine en `callbackUrl`.
     * Un utilisateur déjà connecté est renvoyé depuis /login et /register
     * vers le tableau de bord. La route publique /register est désactivée
     * (redirigée vers /login) : la création de comptes se fait par l'Admin.
     * RBAC : toute route non autorisée pour `auth.user.role` redirige vers /dashboard.
     */
    authorized({ auth, request: { nextUrl } }) {
      const connecte = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Désactivation de l'inscription publique.
      if (pathname === "/register" || pathname.startsWith("/register/")) {
        return NextResponse.redirect(new URL("/login", nextUrl));
      }

      // Anti-boucle ERR_TOO_MANY_REDIRECTS : un utilisateur authentifié sur
      // /dashboard est systématiquement autorisé, sans redirection supplémentaire.
      if (connecte && (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
        return true;
      }

      if (estProtege(pathname)) {
        if (!connecte) return false;
        const role = (auth?.user as { role?: string } | undefined)?.role ?? null;
        if (!aAccesAuChemin(role, pathname)) {
          // Ne jamais rediriger vers /dashboard si on y est déjà (sécurité anti-boucle).
          if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
          return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }
      if (connecte && pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;