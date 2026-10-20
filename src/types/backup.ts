/**
 * Format de la sauvegarde complète de la base (export / restauration JSON).
 *
 * ⚠️ Fichier SANS directive "use server" : les types peuvent être importés
 * librement côté client (composant de restauration) et côté serveur
 * (src/actions/backup.ts).
 *
 * Le format est versionné (`version`) pour permettre des migrations futures.
 * Les dates sont sérialisées en ISO 8601 (strings) et les décimales en
 * nombres — Prisma accepte ces deux formats à la réhydratation.
 */

/** Tables incluses dans la sauvegarde, dans l'ordre de dépendance FK (création). */
export const TABLES_SAUVEGARDE = [
  "utilisateurs",
  "membres",
  "departements",
  "departementsMembres",
  "groupes",
  "groupesMembres",
  "exercices",
  "categoriesCotisation",
  "paliersBareme",
  "cotisations",
  "baremesCotisation",
  "versementsCotisation",
  "paiements",
  "caisses",
  "mouvementsCaisse",
  "depenses",
  "cultes",
  "aides",
  "patrimoine",
  "journalAudit",
] as const;

export type TableSauvegarde = (typeof TABLES_SAUVEGARDE)[number];

/** En-tête métadonnée de la sauvegarde. */
export type MetaSauvegarde = {
  /** Identifiant fixe du format produit par cette application. */
  application: "eglise-saas";
  /** Version du format (migration future). */
  version: number;
  /** Horodatage ISO de l'export. */
  exporteLe: string;
  /** Nom de l'église au moment de l'export (informatif). */
  nomEglise: string | null;
};

/** Contenu complet d'une sauvegarde JSON. */
export type SauvegardeJSON = {
  meta: MetaSauvegarde;
  /** Une entrée par table — tableau d'enregistrements plats (scalars Prisma). */
  donnees: Record<TableSauvegarde, Record<string, unknown>[]>;
};

/** Version du format de sauvegarde produit/consumé par l'application. */
export const VERSION_SAUVEGARDE = 1;
