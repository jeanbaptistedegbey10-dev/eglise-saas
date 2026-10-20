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

/** Ligne du registre pastoral : traçabilité complète d'un fidèle. */
export type RegistrePastoralLigne = {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  /** Classe pastorale déduite du profil (Adultes, Jeunes, Enfants…). */
  classe: string;
  /** Somme des versements identifiés (Paiement + VersementCotisation). */
  totalContributions: number;
  /** Dont surplus / dons d'amour au-delà du plancher. */
  totalSurplus: number;
  /** Somme des Depense où beneficiaireMembreId = membre.id (exercice). */
  totalAides: number;
  nombreAides: number;
  /** Badge Statut : Donateur / Assisté / Donateur & Assisté / Nouveau. */
  statut: "DONATEUR" | "ASSISTE" | "DONATEUR_ASSISTE" | "NOUVEAU";
};

/** Synthèse des soutiens accordés sur l'exercice en cours. */
export type SyntheseSoutiens = {
  totalAidesDistribuees: number;
  nombreFidelesAssistés: number;
  montantMoyenParSoutien: number;
  nombreDecaissements: number;
};

/** Ligne du tableau A : participation / cotisation d'un membre. */
export type ParticipationMembreLigne = {
  id: string;
  /** Date ISO courte (AAAA-MM-JJ). */
  dateISO: string;
  dateAffichee: string;
  evenement: string;
  partObligatoire: number;
  donAdditionnel: number;
  totalVerse: number;
  modePaiement: string;
  commentaire: string | null;
};

/** Ligne du tableau B : aide / décaissement perçu par un membre. */
export type AidePercueLigne = {
  id: string;
  dateISO: string;
  dateAffichee: string;
  motif: string;
  caisseOuSource: string;
  montant: number;
  numeroPiece: string | null;
};

/** Dossier individuel complet d'un fidèle (fiche pastorale). */
export type FichePastoraleMembre = {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  classe: string;
  totalDonne: number;
  totalSurplus: number;
  totalAidesRecues: number;
  participations: ParticipationMembreLigne[];
  aidesPercues: AidePercueLigne[];
};
