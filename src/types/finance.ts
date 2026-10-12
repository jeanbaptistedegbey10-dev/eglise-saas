import type { TypeCotisationEnum } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// États de formulaires — Server Actions du module Finances
// ---------------------------------------------------------------------------

/**
 * Retour générique des Server Actions financières. `fieldErrors` est alimenté
 * par Zod (clé = nom du champ, "_form" pour une erreur globale).
 */
export type FinancesFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

/** État initial transmis à `useActionState`. */
export const initialFinancesFormState: FinancesFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

/**
 * Retour de l'enregistrement groupé (grille de saisie rapide) : les membres
 * déjà soldés sont ignorés côté serveur, on en rapporte les compteurs.
 */
export type PaiementsRapidesFormState = FinancesFormState & {
  nombreEnregistres: number;
  nombreDejaVerses: number;
};

export const initialPaiementsRapidesFormState: PaiementsRapidesFormState = {
  ...initialFinancesFormState,
  nombreEnregistres: 0,
  nombreDejaVerses: 0,
};

// ---------------------------------------------------------------------------
// Données sérialisées échangées avec les composants clients
// ---------------------------------------------------------------------------

/** Exercice proposé dans les sélecteurs (finances, barèmes, saisie rapide). */
export type ExerciceOption = {
  id: string;
  annee: number;
  libelle: string;
  cloture: boolean;
};

/** Type de cotisation proposé dans les sélecteurs. */
export type TypeCotisationOption = {
  id: string;
  libelle: string;
  type: TypeCotisationEnum;
};

/** Palier (classe) d'un barème pour l'exercice courant. */
export type PalierResume = {
  id: string;
  libelleClasse: string;
  montant: number;
};

/** Ligne éditable d'un barème dans la modale de configuration. */
export type PaliereBaremeEdition = {
  /** Ligne persistée (identifiant Prisma) ou nouvelle ligne (null). */
  id: string | null;
  libelleClasse: string;
  montant: number;
};

/** Type de cotisation éditable dans la modale dédiée. */
export type TypeCotisationEdition = {
  id: string;
  libelle: string;
  description: string | null;
  type: TypeCotisationEnum;
};

/** Synthèse d'un type de cotisation pour l'exercice affiché. */
export type TypeCotisationResume = {
  id: string;
  libelle: string;
  description: string | null;
  type: TypeCotisationEnum;
  nombrePaiements: number;
  totalVerse: number;
  /** Part des versements anonymes (sans membre identifiable). */
  totalAnonyme: number;
  paliers: PalierResume[];
};

/** Sous-total d'une grande catégorie (obligatoire / volontaire / quête). */
export type CategorieFinancesResume = {
  nombreTypes: number;
  nombrePaiements: number;
  total: number;
};

/** Résumé global transmis à la page /finances et à ses onglets. */
export type ResumeFinances = {
  exercice: ExerciceOption;
  totalGeneral: number;
  nombrePaiements: number;
  obligatoires: CategorieFinancesResume;
  volontaires: CategorieFinancesResume;
  quetes: CategorieFinancesResume;
  types: TypeCotisationResume[];
};

/** Ligne de la grille de saisie rapide : un membre et son total déjà versé. */
export type MembreSaisieRapide = {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  totalVerse: number;
};
