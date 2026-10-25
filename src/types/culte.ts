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
export type TypeEvenement = "OPTIONNEL" | "RESPONSABILISE";

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

export const LIBELLES_TYPE_EVENEMENT: Record<TypeEvenement, string> = {
  OPTIONNEL: "Optionnel",
  RESPONSABILISE: "Responsabilisé",
};

/** Responsable sérialisé (membre assigné à un événement ou une tâche). */
export type ResponsableResume = {
  id: string;
  nomComplet: string;
};

/** Type de tâche sérialisé pour les composants clients. */
export type TypeTacheResume = {
  id: string;
  libelle: string;
  couleur: string | null;
  estParDefaut: boolean;
};

/** Tâche d'événement sérialisée pour les composants clients. */
export type TacheResume = {
  id: string;
  culteId: string;
  /** Date spécifique de la tâche (YYYY-MM-DD) pour les événements plurijournaliers. */
  dateTache: string | null;
  titre: string;
  heureDebut: string | null;
  heureFin: string | null;
  description: string | null;
  statut: StatutTache;
  responsable: ResponsableResume | null;
  typeTache: TypeTacheResume | null;
  equipe: ResponsableResume[];
};

/** Événement sérialisé pour les composants clients (Date → texte). */
export type CulteResume = {
  id: string;
  dateISO: string;
  dateAffichee: string;
  dateFin: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  intitule: string;
  lieu: string | null;
  description: string | null;
  theme: string | null;
  descriptionTheme: string | null;
  statut: StatutEvenement;
  type: TypeEvenement;
  responsable: ResponsableResume | null;
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
