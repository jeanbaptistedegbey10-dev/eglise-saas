import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Client Prisma — instance globale en mode singleton.
 *
 * En développement, le Hot Reload de Next.js recrée les modules à chaque
 * sauvegarde : instancier `PrismaClient` à la racine d'un module multiplierait
 * les connexions à la base. On garde donc une unique instance stockée sur
 * `globalThis`, réutilisée d'un rechargement à l'autre.
 *
 * Note Prisma 7 : le générateur `prisma-client` (sortie `src/generated/prisma`)
 * impose un driver adapter pour PostgreSQL — ici `@prisma/adapter-pg` avec le
 * `DATABASE_URL` du fichier `.env`.
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// En production, pas de hot reload : une seule instance est créée naturellement.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
