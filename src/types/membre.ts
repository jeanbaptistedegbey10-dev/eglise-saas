import type { Membre, Prisma } from "@/generated/prisma/client";

/**
 * Retour du Server Action d'enregistrement d'un membre.
 * `fieldErrors` est alimenté par Zod (clé = nom du champ, "_form" pour une
 * erreur globale).
 */
export type MembreFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
  membreId: string | null;
};

/** État initial transmis à `useActionState`. */
export const initialMembreFormState: MembreFormState = {
  success: false,
  message: "",
  fieldErrors: {},
  membreId: null,
};

/** Sous-ensemble de `Membre` nécessaire pour pré-remplir le formulaire. */
export type MembreEditable = Pick<
  Membre,
  | "id"
  | "nom"
  | "prenoms"
  | "telephone"
  | "email"
  | "adresse"
  | "profession"
  | "donneesEcclesiastiques"
>;

/** Fiche complète d'un membre avec son historique (paiements + aides). */
export type FicheMembre = Prisma.MembreGetPayload<{
  include: {
    paiements: { include: { typeCotisation: true; exercice: true } };
    aidesRecues: true;
  };
}>;

/** Ligne de paiement sérialisée — onglet « Contributions & Participations ». */
export type PaiementFiche = {
  id: string;
  dateAffichee: string;
  montant: number;
  modePaiement: string;
  typeCotisation: string;
  exercice: number;
  commentaire: string | null;
};

/** Ligne d'aide sérialisée — onglet « Solidarité & Aides reçues ». */
export type AideFiche = {
  id: string;
  dateAffichee: string;
  motif: string;
  montantOuNature: string;
  notesConflictuelles: string | null;
};
