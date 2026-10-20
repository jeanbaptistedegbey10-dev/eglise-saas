import type { DefaultSession } from "next-auth";

import type { RoleUtilisateurValeur } from "@/lib/utilisateur";

/**
 * Augmentation des types Auth.js v5 : la session JWT transporte l'identifiant
 * et le rôle de l'utilisateur Prisma (`Utilisateur`).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleUtilisateurValeur;
    } & DefaultSession["user"];
  }

  interface User {
    role: RoleUtilisateurValeur;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: RoleUtilisateurValeur;
  }
}