import type { ExerciceOption } from "./finance";

// ---------------------------------------------------------------------------
// Types du module Rapports & Clôture (Étape 6)
// ---------------------------------------------------------------------------

/**
 * Statut d'un membre sur une cotisation à barème, pour un exercice et une
 * classe donnés (Option C : l'attendu = montant du palier filtré).
 */
export type StatutDonateur =
  | "SOLDE"
  | "PARTIEL"
  | "RIEN_VERSE"
  | "CONTRIBUTEUR"
  | "SANS_VERSEMENT";

/** Une ligne du tableau « Qui a donné ». */
export type LigneQuiADonne = {
  membreId: string;
  nom: string;
  prenoms: string;
  telephone: string;
  totalVerse: number;
  /** Montant attendu (palier filtré) — null si aucune classe sélectionnée. */
  montantAttendu: number | null;
  /** Reste à payer (>= 0) — null si aucun attendu défini. */
  resteAPayer: number | null;
  statut: StatutDonateur;
  nombreVersements: number;
};

/** Détail d'un versement, utilisé pour l'édition du reçu PDF. */
export type VersementRecu = {
  datePaiement: string;
  montant: number;
  modePaiement: string;
  typeLibelle: string;
  commentaire: string | null;
};

/** Statistiques d'un exercice (éventuellement restreintes à une cotisation). */
export type StatistiquesExercice = {
  exercice: ExerciceOption;
  totalGeneral: number;
  nombrePaiements: number;
  nombreContributeurs: number;
  totalAnonyme: number;
  parType: {
    typeId: string;
    libelle: string;
    total: number;
    nombrePaiements: number;
  }[];
};

/** Retour de la Server Action de clôture définitive d'un exercice. */
export type ClotureFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
  exerciceSuivantId: string | null;
};

export const initialClotureFormState: ClotureFormState = {
  success: false,
  message: "",
  fieldErrors: {},
  exerciceSuivantId: null,
};

/** Libellé français des statuts du tableau « Qui a donné ». */
export const LIBELLES_STATUT_DONATEUR: Record<StatutDonateur, string> = {
  SOLDE: "Soldé",
  PARTIEL: "Partiel",
  RIEN_VERSE: "Rien versé",
  CONTRIBUTEUR: "A contribué",
  SANS_VERSEMENT: "Aucun versement",
};
