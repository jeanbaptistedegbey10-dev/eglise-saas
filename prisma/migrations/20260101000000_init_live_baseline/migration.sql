-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."CategorieCaisse" AS ENUM ('GENERALE', 'SOLIDARITE', 'TRAVAUX_PROJETS');

-- CreateEnum
CREATE TYPE "public"."CategoriePatrimoine" AS ENUM ('SONORISATION', 'INSTRUMENT', 'MOBILIER', 'INFORMATIQUE', 'IMMOBILIER', 'AUTRE');

-- CreateEnum
CREATE TYPE "public"."CibleCotisation" AS ENUM ('TOUS', 'ADULTE', 'JEUNE', 'ENFANT', 'HOMME', 'FEMME');

-- CreateEnum
CREATE TYPE "public"."EtatBien" AS ENUM ('NEUF', 'BON_ETAT', 'USAGE', 'EN_PANNE', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "public"."FrequenceCotisation" AS ENUM ('HEBDOMADAIRE', 'MENSUEL', 'TRIMESTRIEL', 'ANNUEL', 'PONCTUEL');

-- CreateEnum
CREATE TYPE "public"."ModePaiement" AS ENUM ('ESPECES', 'MOBILE_MONEY', 'VIREMENT', 'CHEQUE', 'CARTE_BANCAIRE');

-- CreateEnum
CREATE TYPE "public"."RoleOrganisation" AS ENUM ('RESPONSABLE', 'MEMBRE_BUREAU', 'MEMBRE');

-- CreateEnum
CREATE TYPE "public"."RoleUtilisateur" AS ENUM ('ADMINISTRATEUR', 'PASTEUR', 'TRESORIER', 'SECRETARIAT', 'MEMBRE_CONSULTATION');

-- CreateEnum
CREATE TYPE "public"."TypeCotisation" AS ENUM ('RECURRENTE_CLASSE', 'PONCTUELLE_EVENEMENT', 'ANONYME_PROJET', 'QUETE_CULTE');

-- CreateEnum
CREATE TYPE "public"."TypeCotisationEnum" AS ENUM ('OBLIGATOIRE_BAREME', 'VOLONTAIRE_CAMPAGNE', 'QUETE_ANONYME');

-- CreateEnum
CREATE TYPE "public"."TypeDepense" AS ENUM ('AFFECTEE_COTISATION', 'CAISSE_DIRECTE');

-- CreateEnum
CREATE TYPE "public"."TypeMouvementCaisse" AS ENUM ('DON_LIBRE', 'TRANSFERT_COTISATION', 'COMPLEMENT_COTISATION', 'VIREMENT_INTERNE', 'AJUSTEMENT');

-- CreateTable
CREATE TABLE "public"."AideDistribution" (
    "id" TEXT NOT NULL,
    "beneficiaireMembreId" TEXT,
    "montantOuNature" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "dateDistribution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notesConflictuelles" TEXT,

    CONSTRAINT "AideDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BaremeCotisation" (
    "id" TEXT NOT NULL,
    "cotisationId" TEXT NOT NULL,
    "cible" "public"."CibleCotisation" NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "BaremeCotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BienPatrimoine" (
    "id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "categorie" "public"."CategoriePatrimoine" NOT NULL DEFAULT 'MOBILIER',
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "etat" "public"."EtatBien" NOT NULL DEFAULT 'BON_ETAT',
    "valeurEstimee" DOUBLE PRECISION,
    "lieuStockage" TEXT,
    "dateAcquisition" TIMESTAMP(3),
    "remarques" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BienPatrimoine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Caisse" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "soldeInitial" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "soldeActuel" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estParDefaut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cotisation" (
    "id" TEXT NOT NULL,
    "exerciceId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "frequence" "public"."FrequenceCotisation" NOT NULL DEFAULT 'MENSUEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "autoriserSurplus" BOOLEAN NOT NULL DEFAULT false,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "estCloture" BOOLEAN NOT NULL DEFAULT false,
    "montantCible" DECIMAL(12,2),
    "montantPlancher" DECIMAL(12,2),
    "type" "public"."TypeCotisation" NOT NULL DEFAULT 'RECURRENTE_CLASSE',
    "departementId" TEXT,
    "groupeId" TEXT,

    CONSTRAINT "Cotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Culte" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "intitule" TEXT NOT NULL,
    "totalQueteAnonyme" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Culte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Departement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "aUnBureau" BOOLEAN NOT NULL DEFAULT false,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DepartementMembre" (
    "id" TEXT NOT NULL,
    "departementId" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "role" "public"."RoleOrganisation" NOT NULL DEFAULT 'MEMBRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartementMembre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Depense" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "montant" DECIMAL(65,30) NOT NULL,
    "dateDepense" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modePaiement" "public"."ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "numeroPiece" TEXT,
    "type" "public"."TypeDepense" NOT NULL DEFAULT 'CAISSE_DIRECTE',
    "caisseSource" "public"."CategorieCaisse" NOT NULL DEFAULT 'GENERALE',
    "cotisationId" TEXT,
    "beneficiaireMembreId" TEXT,
    "beneficiaireTiers" TEXT,
    "exerciceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caisseId" TEXT,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Exercice" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "cloture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moisDebut" INTEGER NOT NULL DEFAULT 1,
    "moisFin" INTEGER NOT NULL DEFAULT 12,

    CONSTRAINT "Exercice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Groupe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "aUnBureau" BOOLEAN NOT NULL DEFAULT false,
    "estSousGroupe" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "departementId" TEXT,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupeMembre" (
    "id" TEXT NOT NULL,
    "groupeId" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "role" "public"."RoleOrganisation" NOT NULL DEFAULT 'MEMBRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupeMembre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JournalAudit" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "auteurNom" TEXT NOT NULL DEFAULT 'Responsable',
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membre" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenoms" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "adresse" TEXT,
    "profession" TEXT,
    "donneesEcclesiastiques" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tokenConsultation" TEXT,

    CONSTRAINT "Membre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MouvementCaisse" (
    "id" TEXT NOT NULL,
    "caisseId" TEXT NOT NULL,
    "type" "public"."TypeMouvementCaisse" NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "sens" TEXT NOT NULL,
    "dateMouvement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" TEXT NOT NULL,
    "cotisationId" TEXT,
    "membreId" TEXT,
    "donateurTiers" TEXT,
    "modePaiement" "public"."ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "numeroPiece" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Paiement" (
    "id" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modePaiement" "public"."ModePaiement" NOT NULL,
    "membreId" TEXT,
    "typeCotisationId" TEXT NOT NULL,
    "exerciceId" TEXT NOT NULL,
    "commentaire" TEXT,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaliereBareme" (
    "id" TEXT NOT NULL,
    "typeCotisationId" TEXT NOT NULL,
    "libelleClasse" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "exerciceId" TEXT NOT NULL,

    CONSTRAINT "PaliereBareme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Utilisateur" (
    "id" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "public"."RoleUtilisateur" NOT NULL DEFAULT 'MEMBRE_CONSULTATION',
    "motDePasseHash" TEXT NOT NULL,
    "motDePasseTemporaire" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniereConnexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codeOtp" TEXT,
    "expirationOtp" TIMESTAMP(3),

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VersementCotisation" (
    "id" TEXT NOT NULL,
    "cotisationId" TEXT NOT NULL,
    "membreId" TEXT,
    "montant" DECIMAL(12,2) NOT NULL,
    "dateVersement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modePaiement" "public"."ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEffective" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estAnonyme" BOOLEAN NOT NULL DEFAULT false,
    "moisCoches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "montantBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "surplusVolontaire" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "VersementCotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categorieCotisation" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."TypeCotisationEnum" NOT NULL,

    CONSTRAINT "categorieCotisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AideDistribution_beneficiaireMembreId_idx" ON "public"."AideDistribution"("beneficiaireMembreId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BaremeCotisation_cotisationId_cible_key" ON "public"."BaremeCotisation"("cotisationId" ASC, "cible" ASC);

-- CreateIndex
CREATE INDEX "BaremeCotisation_cotisationId_idx" ON "public"."BaremeCotisation"("cotisationId" ASC);

-- CreateIndex
CREATE INDEX "BienPatrimoine_categorie_idx" ON "public"."BienPatrimoine"("categorie" ASC);

-- CreateIndex
CREATE INDEX "BienPatrimoine_createdAt_idx" ON "public"."BienPatrimoine"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "BienPatrimoine_etat_idx" ON "public"."BienPatrimoine"("etat" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Caisse_code_key" ON "public"."Caisse"("code" ASC);

-- CreateIndex
CREATE INDEX "Cotisation_exerciceId_idx" ON "public"."Cotisation"("exerciceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Cotisation_exerciceId_nom_key" ON "public"."Cotisation"("exerciceId" ASC, "nom" ASC);

-- CreateIndex
CREATE INDEX "Culte_date_idx" ON "public"."Culte"("date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Culte_date_key" ON "public"."Culte"("date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Departement_nom_key" ON "public"."Departement"("nom" ASC);

-- CreateIndex
CREATE INDEX "Departement_responsableId_idx" ON "public"."Departement"("responsableId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DepartementMembre_departementId_membreId_key" ON "public"."DepartementMembre"("departementId" ASC, "membreId" ASC);

-- CreateIndex
CREATE INDEX "DepartementMembre_membreId_idx" ON "public"."DepartementMembre"("membreId" ASC);

-- CreateIndex
CREATE INDEX "Depense_caisseId_idx" ON "public"."Depense"("caisseId" ASC);

-- CreateIndex
CREATE INDEX "Depense_cotisationId_idx" ON "public"."Depense"("cotisationId" ASC);

-- CreateIndex
CREATE INDEX "Depense_exerciceId_idx" ON "public"."Depense"("exerciceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Exercice_annee_key" ON "public"."Exercice"("annee" ASC);

-- CreateIndex
CREATE INDEX "Groupe_departementId_idx" ON "public"."Groupe"("departementId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Groupe_nom_key" ON "public"."Groupe"("nom" ASC);

-- CreateIndex
CREATE INDEX "Groupe_parentId_idx" ON "public"."Groupe"("parentId" ASC);

-- CreateIndex
CREATE INDEX "Groupe_responsableId_idx" ON "public"."Groupe"("responsableId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GroupeMembre_groupeId_membreId_key" ON "public"."GroupeMembre"("groupeId" ASC, "membreId" ASC);

-- CreateIndex
CREATE INDEX "GroupeMembre_membreId_idx" ON "public"."GroupeMembre"("membreId" ASC);

-- CreateIndex
CREATE INDEX "JournalAudit_createdAt_idx" ON "public"."JournalAudit"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "JournalAudit_entite_idx" ON "public"."JournalAudit"("entite" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Membre_email_key" ON "public"."Membre"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Membre_telephone_key" ON "public"."Membre"("telephone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Membre_tokenConsultation_key" ON "public"."Membre"("tokenConsultation" ASC);

-- CreateIndex
CREATE INDEX "MouvementCaisse_caisseId_idx" ON "public"."MouvementCaisse"("caisseId" ASC);

-- CreateIndex
CREATE INDEX "MouvementCaisse_cotisationId_idx" ON "public"."MouvementCaisse"("cotisationId" ASC);

-- CreateIndex
CREATE INDEX "MouvementCaisse_dateMouvement_idx" ON "public"."MouvementCaisse"("dateMouvement" ASC);

-- CreateIndex
CREATE INDEX "MouvementCaisse_membreId_idx" ON "public"."MouvementCaisse"("membreId" ASC);

-- CreateIndex
CREATE INDEX "Paiement_datePaiement_idx" ON "public"."Paiement"("datePaiement" ASC);

-- CreateIndex
CREATE INDEX "Paiement_exerciceId_idx" ON "public"."Paiement"("exerciceId" ASC);

-- CreateIndex
CREATE INDEX "Paiement_membreId_idx" ON "public"."Paiement"("membreId" ASC);

-- CreateIndex
CREATE INDEX "Paiement_typeCotisationId_idx" ON "public"."Paiement"("typeCotisationId" ASC);

-- CreateIndex
CREATE INDEX "PaliereBareme_exerciceId_idx" ON "public"."PaliereBareme"("exerciceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PaliereBareme_typeCotisationId_libelleClasse_exerciceId_key" ON "public"."PaliereBareme"("typeCotisationId" ASC, "libelleClasse" ASC, "exerciceId" ASC);

-- CreateIndex
CREATE INDEX "Utilisateur_actif_idx" ON "public"."Utilisateur"("actif" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "public"."Utilisateur"("email" ASC);

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "public"."Utilisateur"("role" ASC);

-- CreateIndex
CREATE INDEX "VersementCotisation_cotisationId_idx" ON "public"."VersementCotisation"("cotisationId" ASC);

-- CreateIndex
CREATE INDEX "VersementCotisation_dateEffective_idx" ON "public"."VersementCotisation"("dateEffective" ASC);

-- CreateIndex
CREATE INDEX "VersementCotisation_dateVersement_idx" ON "public"."VersementCotisation"("dateVersement" ASC);

-- CreateIndex
CREATE INDEX "VersementCotisation_membreId_idx" ON "public"."VersementCotisation"("membreId" ASC);

-- AddForeignKey
ALTER TABLE "public"."AideDistribution" ADD CONSTRAINT "AideDistribution_beneficiaireMembreId_fkey" FOREIGN KEY ("beneficiaireMembreId") REFERENCES "public"."Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BaremeCotisation" ADD CONSTRAINT "BaremeCotisation_cotisationId_fkey" FOREIGN KEY ("cotisationId") REFERENCES "public"."Cotisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cotisation" ADD CONSTRAINT "Cotisation_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "public"."Departement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cotisation" ADD CONSTRAINT "Cotisation_exerciceId_fkey" FOREIGN KEY ("exerciceId") REFERENCES "public"."Exercice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cotisation" ADD CONSTRAINT "Cotisation_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "public"."Groupe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Departement" ADD CONSTRAINT "Departement_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartementMembre" ADD CONSTRAINT "DepartementMembre_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "public"."Departement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartementMembre" ADD CONSTRAINT "DepartementMembre_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "public"."Membre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Depense" ADD CONSTRAINT "Depense_beneficiaireMembreId_fkey" FOREIGN KEY ("beneficiaireMembreId") REFERENCES "public"."Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Depense" ADD CONSTRAINT "Depense_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "public"."Caisse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Depense" ADD CONSTRAINT "Depense_cotisationId_fkey" FOREIGN KEY ("cotisationId") REFERENCES "public"."Cotisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Depense" ADD CONSTRAINT "Depense_exerciceId_fkey" FOREIGN KEY ("exerciceId") REFERENCES "public"."Exercice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Groupe" ADD CONSTRAINT "Groupe_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "public"."Departement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Groupe" ADD CONSTRAINT "Groupe_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Groupe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Groupe" ADD CONSTRAINT "Groupe_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupeMembre" ADD CONSTRAINT "GroupeMembre_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "public"."Groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupeMembre" ADD CONSTRAINT "GroupeMembre_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "public"."Membre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MouvementCaisse" ADD CONSTRAINT "MouvementCaisse_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "public"."Caisse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MouvementCaisse" ADD CONSTRAINT "MouvementCaisse_cotisationId_fkey" FOREIGN KEY ("cotisationId") REFERENCES "public"."Cotisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MouvementCaisse" ADD CONSTRAINT "MouvementCaisse_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "public"."Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_exerciceId_fkey" FOREIGN KEY ("exerciceId") REFERENCES "public"."Exercice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "public"."Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_typeCotisationId_fkey" FOREIGN KEY ("typeCotisationId") REFERENCES "public"."categorieCotisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaliereBareme" ADD CONSTRAINT "PaliereBareme_exerciceId_fkey" FOREIGN KEY ("exerciceId") REFERENCES "public"."Exercice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaliereBareme" ADD CONSTRAINT "PaliereBareme_typeCotisationId_fkey" FOREIGN KEY ("typeCotisationId") REFERENCES "public"."categorieCotisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VersementCotisation" ADD CONSTRAINT "VersementCotisation_cotisationId_fkey" FOREIGN KEY ("cotisationId") REFERENCES "public"."Cotisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VersementCotisation" ADD CONSTRAINT "VersementCotisation_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "public"."Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

