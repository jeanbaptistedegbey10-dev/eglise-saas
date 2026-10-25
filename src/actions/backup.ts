"use server";

// ---------------------------------------------------------------------------
// Sauvegarde & Restauration de la base de données (export / import JSON)
//
//  • `exporterSauvegardeJSON()`    — exporte l'intégralité des tables de
//    l'application dans un objet JSON sérialisable (téléchargé côté client).
//  • `restaurerSauvegardeJSON()`   — réhydrate la base à partir d'une
//    sauvegarde : purge dans l'ordre inverse des clés étrangères puis
//    réinsertion dans l'ordre de dépendance, le tout dans une transaction.
//
// Les deux actions sont réservées aux ADMINISTRATEURS. Le compte de
// l'administrateur connecté est toujours préservé lors d'une restauration
// (pas de verrouillage accidentel).
// ---------------------------------------------------------------------------

import { revalidatePath } from "next/cache";

import { consignerAudit } from "@/lib/audit";
import { obtenirSession } from "@/lib/auth";
import { lireConfiguration } from "@/lib/configuration-eglise";
import { prisma } from "@/lib/prisma";
import {
  TABLES_SAUVEGARDE,
  VERSION_SAUVEGARDE,
  type SauvegardeJSON,
  type TableSauvegarde,
} from "@/types/backup";

// ---------------------------------------------------------------------------
// Garde d'accès
// ---------------------------------------------------------------------------

async function verifierAdmin() {
  const session = await obtenirSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? null;
  if (!session || role !== "ADMINISTRATEUR") {
    throw new Error("Accès réservé aux administrateurs.");
  }
  return session;
}

const ROUTES_A_REVALIDER = [
  "/",
  "/dashboard",
  "/finances",
  "/finances/cotisations",
  "/membres",
  "/cultes",
  "/solidarite",
  "/patrimoine",
  "/rapports",
  "/administration/audit",
  "/parametres",
];

// ---------------------------------------------------------------------------
// Correspondances table Prisma ↔ clé de sauvegarde
// ---------------------------------------------------------------------------

/** Ordre de SUPPRESSION (enfants → parents, FK à respecter). */
const ORDRE_SUPPRESSION = [
  "journalAudit",
  "patrimoine",
  "aides",
  "cultes",
  "depenses",
  "mouvementsCaisse",
  "caisses",
  "versementsCotisation",
  "paiements",
  "baremesCotisation",
  "cotisations",
  "paliersBareme",
  "categoriesCotisation",
  "groupesMembres",
  "departementsMembres",
  "groupes",
  "departements",
  "membres",
  "exercices",
] as const satisfies readonly TableSauvegarde[];

/**
 * Accès au delegate Prisma par nom de table. `prisma.$transaction` expose les
 * mêmes delegates que le client racine : on indexe donc dynamiquement.
 * (Paramètre en `any` assumé : l'indexation dynamique des delegates Prisma
 * échappe au typage statique du client généré.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function delegate(cible: any, table: TableSauvegarde) {
  const mapping: Record<TableSauvegarde, string> = {
    utilisateurs: "utilisateur",
    membres: "membre",
    departements: "departement",
    departementsMembres: "departementMembre",
    groupes: "groupe",
    groupesMembres: "groupeMembre",
    exercices: "exercice",
    categoriesCotisation: "categorieCotisation",
    paliersBareme: "paliereBareme",
    cotisations: "cotisation",
    baremesCotisation: "baremeCotisation",
    versementsCotisation: "versementCotisation",
    paiements: "paiement",
    caisses: "caisse",
    mouvementsCaisse: "mouvementCaisse",
    depenses: "depense",
    cultes: "culte",
    aides: "aideDistribution",
    patrimoine: "bienPatrimoine",
    journalAudit: "journalAudit",
  };
  const modele = cible[mapping[table]];
  if (!modele) {
    throw new Error(`Modèle Prisma introuvable pour la table « ${table} ».`);
  }

  return modele as {
    findMany: () => Promise<Record<string, unknown>[]>;
    deleteMany: (args?: unknown) => Promise<{ count: number }>;
    createMany: (args: { data: Record<string, unknown>[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
  };
}

/** Champs DateTime par table — convertis depuis les chaînes ISO à la restauration. */
const CHAMPS_DATE: Record<TableSauvegarde, readonly string[]> = {
  utilisateurs: ["derniereConnexion", "expirationOtp", "createdAt", "updatedAt"],
  membres: ["createdAt", "updatedAt"],
  departements: ["createdAt", "updatedAt"],
  departementsMembres: ["createdAt"],
  groupes: ["createdAt", "updatedAt"],
  groupesMembres: ["createdAt"],
  exercices: ["createdAt"],
  categoriesCotisation: [],
  paliersBareme: [],
  cotisations: ["dateDebut", "dateFin", "createdAt", "updatedAt"],
  baremesCotisation: [],
  versementsCotisation: ["dateEffective", "dateVersement", "createdAt"],
  paiements: ["datePaiement"],
  caisses: ["createdAt", "updatedAt"],
  mouvementsCaisse: ["dateMouvement", "createdAt"],
  depenses: ["dateDepense", "createdAt", "updatedAt"],
  cultes: ["date"],
  aides: ["dateDistribution"],
  patrimoine: ["dateAcquisition", "createdAt", "updatedAt"],
  journalAudit: ["createdAt"],
};

// ---------------------------------------------------------------------------
// Validation du fichier de sauvegarde (jamais faire confiance au client)
// ---------------------------------------------------------------------------

type ResultatValidation =
  | { ok: true; sauvegarde: SauvegardeJSON }
  | { ok: false; message: string };

function validerSauvegarde(brut: unknown): ResultatValidation {
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) {
    return { ok: false, message: "Le fichier de sauvegarde est illisible (objet JSON attendu)." };
  }
  const objet = brut as { meta?: unknown; donnees?: unknown };

  if (typeof objet.meta !== "object" || objet.meta === null) {
    return { ok: false, message: "En-tête « meta » absent du fichier de sauvegarde." };
  }
  const meta = objet.meta as Record<string, unknown>;
  if (meta.application !== "eglise-saas") {
    return { ok: false, message: "Ce fichier ne provient pas de l'application Église SaaS." };
  }
  if (meta.version !== VERSION_SAUVEGARDE) {
    return {
      ok: false,
      message: `Version de sauvegarde non prise en charge (attendu ${VERSION_SAUVEGARDE}, reçu ${String(meta.version)}).`,
    };
  }
  if (typeof objet.donnees !== "object" || objet.donnees === null || Array.isArray(objet.donnees)) {
    return { ok: false, message: "Section « donnees » absente ou invalide." };
  }
  const donnees = objet.donnees as Record<string, unknown>;
  for (const table of TABLES_SAUVEGARDE) {
    const lignes = donnees[table];
    if (!Array.isArray(lignes)) {
      return { ok: false, message: `Table « ${table} » manquante ou invalide dans la sauvegarde.` };
    }
    for (const ligne of lignes) {
      if (typeof ligne !== "object" || ligne === null || Array.isArray(ligne)) {
        return { ok: false, message: `Ligne invalide dans la table « ${table} ».` };
      }
    }
  }

  // L'en-tête peut contenir des champs additionnels (informatifs) : on le
  // reconstruit proprement. Les tables sont normalisées en lignes plates.
  const metaPropre: SauvegardeJSON["meta"] = {
    application: "eglise-saas",
    version: VERSION_SAUVEGARDE,
    exporteLe: typeof meta.exporteLe === "string" ? meta.exporteLe : new Date().toISOString(),
    nomEglise: typeof meta.nomEglise === "string" ? meta.nomEglise : null,
  };
  const donneesPropres = Object.fromEntries(
    TABLES_SAUVEGARDE.map((table) => [
      table,
      (donnees[table] as Record<string, unknown>[]).map((ligne) => ({ ...ligne })),
    ]),
  ) as SauvegardeJSON["donnees"];

  return { ok: true, sauvegarde: { meta: metaPropre, donnees: donneesPropres } };
}

// ---------------------------------------------------------------------------
// Restauration : conversion des lignes JSON vers les entrées Prisma
// ---------------------------------------------------------------------------

/**
 * Convertit une ligne sérialisée en entrée Prisma : les champs DateTime connus
 * sont reconstruits depuis leurs chaînes ISO. Les autres scalaires (Decimal,
 * Json, enum, String[]) sont transmis tels quels — Prisma accepte les
 * représentations JSON (chaînes pour les décimales, objets pour les Json).
 */
function ligneRestauree(
  table: TableSauvegarde,
  ligne: Record<string, unknown>,
): Record<string, unknown> {
  const sortie: Record<string, unknown> = { ...ligne };
  for (const champ of CHAMPS_DATE[table]) {
    const valeur = sortie[champ];
    if (typeof valeur === "string" && valeur.trim() !== "") {
      const date = new Date(valeur);
      if (!Number.isNaN(date.getTime())) {
        sortie[champ] = date;
      } else {
        delete sortie[champ];
      }
    } else if (valeur === null || valeur === undefined) {
      // Champ nullable absent/vide : laisser Prisma appliquer la valeur par
      // défaut (ou null) — pas de transmission d'undefined à createMany.
      delete sortie[champ];
    }
  }
  return sortie;
}

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

export type ResultatExportSauvegarde = {
  ok: boolean;
  message: string;
  /** Contenu JSON complet (téléchargé côté client via Blob). */
  contenu: string | null;
  /** Nom de fichier suggéré. */
  nomFichier: string | null;
  /** Nombre d'enregistrements par table (informatif). */
  comptes: Record<string, number> | null;
};

/**
 * Génère une sauvegarde JSON complète de la base (membres, caisses,
 * cotisations, cultes, patrimoine, audit…) prête à être téléchargée.
 * Réservé aux administrateurs.
 */
export async function exporterSauvegardeJSON(): Promise<ResultatExportSauvegarde> {
  const session = await verifierAdmin();
  try {
    const comptes: Record<string, number> = {};
    const donnees = {} as SauvegardeJSON["donnees"];

    for (const table of TABLES_SAUVEGARDE) {
      // `findMany()` sans `include` ne retourne que les scalaires : exactement
      // ce qu'il faut pour un export plat. JSON.stringify convertit les Dates
      // en ISO 8601 et les Decimals en chaînes (via toJSON).
      const lignes = await delegate(prisma, table).findMany();
      donnees[table] = lignes;
      comptes[table] = lignes.length;
    }

    const configuration = await lireConfiguration().catch(() => null);
    const sauvegarde: SauvegardeJSON = {
      meta: {
        application: "eglise-saas",
        version: VERSION_SAUVEGARDE,
        exporteLe: new Date().toISOString(),
        nomEglise: configuration?.nomOfficiel || null,
      },
      donnees,
    };

    const contenu = JSON.stringify(sauvegarde, null, 2);
    const jour = sauvegarde.meta.exporteLe.slice(0, 10);
    const nomOfficiel = (configuration?.nomOfficiel ?? "eglise")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const nomFichier = `sauvegarde-${nomOfficiel || "eglise"}-${jour}.json`;

    const total = Object.values(comptes).reduce((somme, n) => somme + n, 0);
    await consignerAudit({
      action: "EXPORT_SAUVEGARDE",
      entite: "BaseDeDonnees",
      auteurNom:
        (session?.user as { nomComplet?: string } | undefined)?.nomComplet ?? "Administrateur",
      details: `Export JSON complet de la base (${total} enregistrements, ${TABLES_SAUVEGARDE.length} tables).`,
    });

    return {
      ok: true,
      message: `Sauvegarde générée : ${total} enregistrements exportés.`,
      contenu,
      nomFichier,
      comptes,
    };
  } catch (erreur) {
    console.error("Erreur export sauvegarde :", erreur);
    const message = erreur instanceof Error ? erreur.message : String(erreur ?? "Erreur inconnue");
    return {
      ok: false,
      message,
      contenu: null,
      nomFichier: null,
      comptes: null,
    };
  }
}

// ---------------------------------------------------------------------------
// RESTAURATION
// ---------------------------------------------------------------------------

export type ResultatRestauration = {
  ok: boolean;
  message: string;
  comptes: Record<string, number> | null;
};

/**
 * Restaure la base complète à partir d'une sauvegarde JSON.
 *
 * ⚠️ Action DÉSTRUCTIVE : toutes les données existantes sont remplacées
 * (transaction atomique — en cas d'échec, rien n'est perdu). Le compte de
 * l'administrateur connecté est préservé et reste administrateur.
 */
export async function restaurerSauvegardeJSON(brut: unknown): Promise<ResultatRestauration> {
  const session = await verifierAdmin();

  const validation = validerSauvegarde(brut);
  if (!validation.ok) {
    return { ok: false, message: validation.message, comptes: null };
  }
  const { donnees } = validation.sauvegarde;

  const idAdminConnecte = (session?.user as { id?: string } | undefined)?.id ?? null;

  try {
    const comptes = await prisma.$transaction(
      async (tx) => {
        // 1. Purge — ordre inverse des dépendances FK.
        for (const table of ORDRE_SUPPRESSION) {
          await delegate(tx, table).deleteMany();
        }
        // Utilisateurs : on conserve le compte connecté (anti-verrouillage).
        await tx.utilisateur.deleteMany(
          idAdminConnecte ? { where: { id: { not: idAdminConnecte } } } : undefined,
        );

        // 2. Réinsertion — TABLES_SAUVEGARDE est ordonné parents → enfants.
        const comptesRestaures: Record<string, number> = {};
        for (const table of TABLES_SAUVEGARDE) {
          const lignes = donnees[table];
          const entrees = lignes.map((ligne) => ligneRestauree(table, ligne));
          if (table === "utilisateurs" && idAdminConnecte) {
            // skipDuplicates : garde la version live de l'admin connecté si
            // elle figure aussi dans la sauvegarde (id OU email déjà présent).
            const resultat = await delegate(tx, table).createMany({
              data: entrees,
              skipDuplicates: true,
            });
            comptesRestaures[table] = resultat.count;
            continue;
          }
          const resultat = await delegate(tx, table).createMany({ data: entrees });
          comptesRestaures[table] = resultat.count;
        }

        // 3. Le compte connecté garde le plein droit administrateur.
        if (idAdminConnecte) {
          await tx.utilisateur.update({
            where: { id: idAdminConnecte },
            data: { role: "ADMINISTRATEUR", actif: true },
          });
        }

        return comptesRestaures;
      },
      // Les bases peuvent être volumineuses : timeout généreux.
      { timeout: 120_000, maxWait: 10_000 },
    );

    const total = Object.values(comptes).reduce((somme, n) => somme + n, 0);
    await consignerAudit({
      action: "RESTAURATION_SAUVEGARDE",
      entite: "BaseDeDonnees",
      auteurNom:
        (session?.user as { nomComplet?: string } | undefined)?.nomComplet ?? "Administrateur",
      details: `Restauration complète depuis un fichier JSON (${total} enregistrements réimportés).`,
    });

    for (const route of ROUTES_A_REVALIDER) {
      revalidatePath(route);
    }

    return {
      ok: true,
      message: `Restauration terminée : ${total} enregistrements réimportés.`,
      comptes,
    };
  } catch (erreur) {
    console.error("Erreur restauration sauvegarde :", erreur);
    const message = erreur instanceof Error ? erreur.message : String(erreur ?? "Erreur inconnue");
    return {
      ok: false,
      message,
      comptes: null,
    };
  }
}

