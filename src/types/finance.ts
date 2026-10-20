import type { CategorieCotisationEnum } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Ã‰tats de formulaires â€” Server Actions du module Finances
// ---------------------------------------------------------------------------

/**
 * Retour gÃ©nÃ©rique des Server Actions financiÃ¨res. `fieldErrors` est alimentÃ©
 * par Zod (clÃ© = nom du champ, "_form" pour une erreur globale).
 */
export type FinancesFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

/** Ã‰tat initial transmis Ã  `useActionState`. */
export const initialFinancesFormState: FinancesFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

/**
 * Retour de l'enregistrement groupÃ© (grille de saisie rapide) : les membres
 * dÃ©jÃ  soldÃ©s sont ignorÃ©s cÃ´tÃ© serveur, on en rapporte les compteurs.
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
// DonnÃ©es sÃ©rialisÃ©es Ã©changÃ©es avec les composants clients
// ---------------------------------------------------------------------------

/** Exercice proposÃ© dans les sÃ©lecteurs (finances, barÃ¨mes, saisie rapide). */
export type ExerciceOption = {
  id: string;
  annee: number;
  libelle: string;
  /** Mois de dÃ©part de l'exercice (1 = janvier â€¦ 12 = dÃ©cembre). */
  moisDebut: number;
  /** Mois de fin de l'exercice (1 â€¦ 12). */
  moisFin: number;
  cloture: boolean;
};

/** Type de cotisation proposÃ© dans les sÃ©lecteurs. */
export type TypeCotisationOption = {
  id: string;
  libelle: string;
  type: CategorieCotisationEnum;
};

/** Palier (classe) d'un barÃ¨me pour l'exercice courant. */
export type PalierResume = {
  id: string;
  libelleClasse: string;
  montant: number;
};

/** Ligne Ã©ditable d'un barÃ¨me dans la modale de configuration. */
export type PaliereBaremeEdition = {
  /** Ligne persistÃ©e (identifiant Prisma) ou nouvelle ligne (null). */
  id: string | null;
  libelleClasse: string;
  montant: number;
};

/** Type de cotisation Ã©ditable dans la modale dÃ©diÃ©e. */
export type TypeCotisationEdition = {
  id: string;
  libelle: string;
  description: string | null;
  type: CategorieCotisationEnum;
};

/** SynthÃ¨se d'un type de cotisation pour l'exercice affichÃ©. */
export type TypeCotisationResume = {
  id: string;
  libelle: string;
  description: string | null;
  type: CategorieCotisationEnum;
  nombrePaiements: number;
  totalVerse: number;
  /** Part des versements anonymes (sans membre identifiable). */
  totalAnonyme: number;
  paliers: PalierResume[];
};

/** Sous-total d'une grande catÃ©gorie (obligatoire / volontaire / quÃªte). */
export type CategorieFinancesResume = {
  nombreTypes: number;
  nombrePaiements: number;
  total: number;
};

/** RÃ©sumÃ© global transmis Ã  la page /finances et Ã  ses onglets. */
export type ResumeFinances = {
  exercice: ExerciceOption;
  totalGeneral: number;
  nombrePaiements: number;
  obligatoires: CategorieFinancesResume;
  volontaires: CategorieFinancesResume;
  quetes: CategorieFinancesResume;
  types: TypeCotisationResume[];
};

/** Ligne de la grille de saisie rapide : un membre et son total dÃ©jÃ  versÃ©. */
export type MembreSaisieRapide = {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  totalVerse: number;
};
