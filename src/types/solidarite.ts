/**
 * États de formulaires et données sérialisées — module Solidarité.
 *
 * Le suivi reste confidentiel : la page /solidarite affiche un bandeau
 * d'avertissement et chaque aide est aussi visible dans l'onglet « Solidarité
 * & Aides reçues » de la fiche 360° du membre concerné.
 */

export type SolidariteFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

export const initialSolidariteFormState: SolidariteFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

/** Option de bénéficiaire pour le sélecteur (membre existant). */
export type MembreOption = {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
};

/** Aide sérialisée pour l'affichage (dates pré-formatées côté serveur). */
export type AideResume = {
  id: string;
  dateISO: string;
  dateAffichee: string;
  motif: string;
  montantOuNature: string;
  notesConflictuelles: string | null;
  beneficiaireMembreId: string | null;
  beneficiaireNom: string | null;
};
