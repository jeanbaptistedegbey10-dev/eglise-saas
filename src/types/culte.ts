/**
 * États de formulaires et données sérialisées — module Cultes & Événements.
 *
 * Le planning de l'église repose sur le modèle `Culte` (date unique, intitulé,
 * total de la quête anonyme). Chaque culte fait office d'événement du
 * calendrier : la page /cultes les regroupe par mois pour un planning simple.
 */

export type CulteFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

export const initialCulteFormState: CulteFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

/** Culte sérialisé pour les composants clients (Decimal → number, Date → texte). */
export type CulteResume = {
  id: string;
  dateISO: string;
  dateAffichee: string;
  intitule: string;
  totalQueteAnonyme: number;
  /** Mois du culte au format « AAAA-MM », pour le regroupement planning. */
  moisCle: string;
  moisLibelle: string;
};
