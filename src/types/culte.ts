/**
 * États de formulaires et données sérialisées — module Cultes & Événements.
 *
 * Le planning de l'église repose sur le modèle `Culte` (date unique, intitulé,
 * lieu, description, statut PLANIFIE / TERMINE / ANNULE). Chaque culte fait
 * office d'événement du calendrier et porte des `TacheEvenement` assignables
 * à un membre (Sonorisation, Accueil, Prédication…) avec un statut
 * A_FAIRE / EN_COURS / CLOTUREE.
 *
 * NOTE : aucune donnée financière (quête anonyme) n'est saisie ni affichée
 * sur la page /cultes — la finance reste dans /finances.
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

export type StatutEvenement = "PLANIFIE" | "TERMINE" | "ANNULE";
export type StatutTache = "A_FAIRE" | "EN_COURS" | "CLOTUREE";

export const LIBELLES_STATUT_EVENEMENT: Record<StatutEvenement, string> = {
  PLANIFIE: "Planifié",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export const LIBELLES_STATUT_TACHE: Record<StatutTache, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  CLOTUREE: "Clôturée",
};

/** Responsable sérialisé d'une tâche (membre assigné). */
export type ResponsableResume = {
  id: string;
  nomComplet: string;
};

/** Tâche d'événement sérialisée pour les composants clients. */
export type TacheResume = {
  id: string;
  culteId: string;
  titre: string;
  description: string | null;
  statut: StatutTache;
  responsable: ResponsableResume | null;
};

/** Événement sérialisé pour les composants clients (Date → texte). */
export type CulteResume = {
  id: string;
  dateISO: string;
  dateAffichee: string;
  intitule: string;
  lieu: string | null;
  description: string | null;
  statut: StatutEvenement;
  /** Mois de l'événement au format « AAAA-MM », pour le regroupement planning. */
  moisCle: string;
  moisLibelle: string;
  /** Tâches de préparation de l'événement (vide si non chargées). */
  taches: TacheResume[];
};

/** Membre sérialisé pour l'assignation d'une tâche. */
export type MembreOption = {
  id: string;
  nomComplet: string;
};
