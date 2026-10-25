-- Réconciliation de l'historique des migrations avec le schéma de référence
-- (prisma/schema.prisma), qui a complété le "baseline" initial.
--
-- Le "baseline" (20260101...) et le "photo" (20260115...) ne contenaient pas :
--   - les colonnes `Culte.lieu`, `Culte.description`, `Culte.statut` (et les
--     colonnes time-stamp courantes),
--   - la table `TacheEvenement` et les types `StatutEvenement` / `StatutTache`.
--
-- Les objets sont créés de façon **idempotente** (guards + blocs DO ... EXCEPTION
-- WHEN duplicate_object) afin que la migration soit une opération nulle sur la
-- base live (déjà à jour) et complète sur une base vierge.

-- ---------------------------------------------------------------------------
-- Types énumérés (idempotent)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "StatutEvenement" AS ENUM ('PLANIFIE', 'TERMINE', 'ANNULE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatutTache" AS ENUM ('A_FAIRE', 'EN_COURS', 'CLOTUREE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Colonnes de `Culte` (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE "Culte"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "lieu" TEXT,
  ADD COLUMN IF NOT EXISTS "statut" "StatutEvenement" NOT NULL DEFAULT 'PLANIFIE',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- Table `TacheEvenement` (idempotente)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TacheEvenement" (
    "id"                  TEXT NOT NULL,
    "culteId"             TEXT NOT NULL,
    "titre"               TEXT NOT NULL,
    "description"         TEXT,
    "statut"              "StatutTache" NOT NULL DEFAULT 'A_FAIRE',
    "responsableMembreId" TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TacheEvenement_pkey" PRIMARY KEY ("id")
);

-- Index (idempotents)
CREATE INDEX IF NOT EXISTS "TacheEvenement_culteId_idx" ON "TacheEvenement"("culteId");
CREATE INDEX IF NOT EXISTS "TacheEvenement_statut_idx" ON "TacheEvenement"("statut");
CREATE INDEX IF NOT EXISTS "TacheEvenement_responsableMembreId_idx" ON "TacheEvenement"("responsableMembreId");
CREATE INDEX IF NOT EXISTS "Culte_statut_idx" ON "Culte"("statut");

-- Table TypeTache (idempotente)
CREATE TABLE IF NOT EXISTS "TypeTache" (
    "id"           TEXT NOT NULL,
    "libelle"      TEXT NOT NULL,
    "couleur"      TEXT NOT NULL DEFAULT '#6366f1',
    "estParDefaut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TypeTache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TypeTache_libelle_key" ON "TypeTache"("libelle");
CREATE INDEX IF NOT EXISTS "TypeTache_estParDefaut_idx" ON "TypeTache"("estParDefaut");

-- Colonnes supplémentaires sur TacheEvenement (idempotent)
ALTER TABLE "TacheEvenement"
  ADD COLUMN IF NOT EXISTS "typeTacheId" TEXT,
  ADD COLUMN IF NOT EXISTS "membresEquipe" TEXT[] NOT NULL DEFAULT '{}';

-- Clés étrangères (idempotentes)
DO $$ BEGIN
  ALTER TABLE "TacheEvenement"
    ADD CONSTRAINT "TacheEvenement_culteId_fkey"
      FOREIGN KEY ("culteId") REFERENCES "Culte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TacheEvenement"
    ADD CONSTRAINT "TacheEvenement_responsableMembreId_fkey"
      FOREIGN KEY ("responsableMembreId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TacheEvenement"
    ADD CONSTRAINT "TacheEvenement_typeTacheId_fkey"
      FOREIGN KEY ("typeTacheId") REFERENCES "TypeTache"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
