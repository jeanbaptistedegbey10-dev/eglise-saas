import type { CategorieCaisse, ModePaiement, TypeDepense } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// États de formulaires — Server Actions du module Dépenses
// ---------------------------------------------------------------------------

/**
 * Retour générique des Server Actions dépenses. `fieldErrors` est alimenté
 * par Zod (clé = nom du champ, "_form" pour une erreur globale).
 */
export type DepenseFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

/** État initial transmis à `useActionState`. */
export const initialDepenseFormState: DepenseFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

// ---------------------------------------------------------------------------
// Données sérialisées échangées avec les composants clients
// ---------------------------------------------------------------------------

/** Cotisation éligible à un décaissement, avec ses repères de trésorerie. */
export type CotisationPourDepense = {
  id: string;
  nom: string;
  exerciceId: string;
  estCloture: boolean;
  /** Total réellement encaissé (somme des versements). */
  totalCollecte: number;
  /** Total déjà décaissé sur cette cotisation (autres dépenses). */
  totalDecaisse: number;
  /** Total déjà transféré vers les caisses (projets annulés / surplus). */
  totalTransfertVersCaisse: number;
  /** Total des compléments reçus depuis les caisses (appoints). */
  totalComplementRecu: number;
  /** Solde réellement disponible : (collecte + compléments) − (dépenses + transferts). */
  soldeDisponible: number;
};

/** Caisse interne proposée comme source d'une sortie directe. */
export type CaissePourDepense = {
  id: string;
  nom: string;
  code: string | null;
  description: string | null;
  soldeActuel: number;
  soldeInitial: number;
  estParDefaut: boolean;
};

/** Membre proposé dans le sélecteur de bénéficiaire. */
export type MembrePourDepense = {
  id: string;
  label: string;
};

/** Ligne du tableau récapitulatif des dépenses. */
export type DepenseLigne = {
  id: string;
  libelle: string;
  description: string | null;
  montant: number;
  /** Date ISO courte (AAAA-MM-JJ). */
  dateDepense: string;
  modePaiement: ModePaiement;
  numeroPiece: string | null;
  type: TypeDepense;
  caisseSource: CategorieCaisse;
  caisseId: string | null;
  caisseNom: string | null;
  cotisationId: string | null;
  cotisationNom: string | null;
  beneficiaireMembreId: string | null;
  beneficiaireNom: string | null;
  beneficiaireTiers: string | null;
};

/** Dépense pré-remplie dans le formulaire lors d'une rectification. */
export type DepenseEdition = DepenseLigne;

/** Cartes de synthèse affichées au-dessus du tableau. */
export type ResumeDepenses = {
  /** Total décaissé sur l'exercice. */
  total: number;
  /** Dépenses affectées aux cotisations / projets. */
  affectees: number;
  /** Sorties directes des caisses internes. */
  caissesDirectes: number;
  nombre: number;
  nombreAffectees: number;
  nombreCaissesDirectes: number;
};
