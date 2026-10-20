import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

// ---------------------------------------------------------------------------
// Middleware de protection des routes (runtime Edge).
// La config importée est edge-safe (src/lib/auth.config.ts) : le provider
// Credentials et Prisma ne sont chargés que côté serveur (src/lib/auth.ts).
//
// Zones protégées : /finances, /administration, /patrimoine, /communaute
// (voir CHEMINES_PROTEGES dans src/lib/auth.config.ts).
// ---------------------------------------------------------------------------

export default NextAuth(authConfig).auth;

export const config = {
  // Toutes les routes sauf les ressources statiques, l'API NextAuth
  // et les fichiers média (images, favicon...).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};