import type {
  CibleCotisation,
  FrequenceCotisation,
  ModePaiement,
  TypeCotisation,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// États de formulaires — Server Actions du module Cotisations / Barèmes
// ---------------------------------------------------------------------------

/** Retour générique des Server Actions cotisations. */
export type CotisationFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

/** État initial transmis à `useActionState`. */
export const initialCotisationFormState: CotisationFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

// ---------------------------------------------------------------------------
// Données sérialisées échangées avec les composants clients
// ---------------------------------------------------------------------------

/** Une ligne de la grille des barèmes (cible + montant périodique). */
export type BaremeLigne = {
  cible: CibleCotisation;
  montant: number;
};

/** Versement sérialisé pour affichage (Plain Object JSON — Decimal → number, Date → ISO). */
export type VersementResume = {
  id: string;
  cotisationId: string;
  membreId: string | null;
  montant: number;
  montantBase: number;
  surplusVolontaire: number;
  moisCoches: string[];
  estAnonyme: boolean;
  dateEffective: string | null;
  dateVersement: string | null;
  modePaiement: ModePaiement;
  commentaire: string | null;
  createdAt: string | null;
};

/** Dépense sérialisée pour affichage (Plain Object JSON — Decimal → number, Date → ISO). */
export type DepenseResume = {
  id: string;
  libelle: string;
  description: string | null;
  montant: number;
  dateDepense: string | null;
  modePaiement: ModePaiement;
  numeroPiece: string | null;
  cotisationId: string | null;
  exerciceId: string;
  createdAt: string | null;
  updatedAt: string | null;
};
/** Une cotisation et ses indicateurs de recouvrement, pour l'affichage. */
export type CotisationResume = {
  id: string;
  nom: string;
  description: string | null;
  /** Nature : récurrente par classe, ponctuelle avec plancher, anonyme. */
  type: TypeCotisation;
  frequence: FrequenceCotisation;
  /** Période de campagne (ISO AAAA-MM-JJ) — null si libre. */
  dateDebut: string | null;
  dateFin: string | null;
  estCloture: boolean;
  /** PONCTUELLE_EVENEMENT : part obligatoire. */
  montantPlancher: number | null;
  autoriserSurplus: boolean;
  /** ANONYME_PROJET : cible globale de la campagne. */
  montantCible: number | null;
  departementId: string | null;
  groupeId: string | null;
  departementNom: string | null;
  groupeNom: string | null;
  baremes: BaremeLigne[];
  /** Total des montants remis (base + surplus). */
  totalVerse: number;
  /** Part obligatoire acquittée. */
  montantBaseTotal: number;
  /** Dons supplémentaires au-delà du plancher. */
  surplusTotal: number;
  nombreVersements: number;
  /** Membres distincts ayant participé. */
  nombreParticipants: number;
  /** Versements rattachés (renseignés selon le contexte d'affichage). */
  versements?: VersementResume[] | null;
  /** Dépenses imputées sur cette cotisation (renseignées selon le contexte d'affichage). */
  depenses?: DepenseResume[] | null;
};

/** Cotisation éditée dans le formulaire de l'onglet « Types de cotisations ». */
export type CotisationEdition = {
  id: string;
  nom: string;
  description: string | null;
  type: TypeCotisation;
  frequence: FrequenceCotisation;
  dateDebut: string | null;
  dateFin: string | null;
  estCloture: boolean;
  montantPlancher: number | null;
  autoriserSurplus: boolean;
  montantCible: number | null;
  departementId: string | null;
  groupeId: string | null;
  baremes: BaremeLigne[];
};

/** Un mois déjà acquitté par un membre (pastille verte de la grille). */
export type MoisPaye = {
  /** Clé normalisée (« fevrier »). */
  cle: string;
  /** Libellé affiché (« Février »). */
  libelle: string;
  /** Date effective du paiement (ISO AAAA-MM-JJ). */
  date: string;
};

/** Membre sélectionnable dans l'onglet des versements. */
export type MembrePourVersement = {
  id: string;
  label: string;
  /** Téléphone — permet la recherche rapide dans le combobox des versements. */
  telephone: string;
  /** Classe détectée à partir du profil (Adulte / Jeune / Enfant…). */
  cible: CibleCotisation;
  /** Sexe détecté (HOMME / FEMME) — null si inconnu. */
  sexe: "HOMME" | "FEMME" | null;
  /** Type de personne configuré à l'étape 5 (Adulte / Jeune / Enfant / Visiteur). */
  typePersonne?: string | null;
  /** Classe d'âge détectée (ADULTE / JEUNE / ENFANT) — null si inconnue. */
  classeAge: "ADULTE" | "JEUNE" | "ENFANT" | null;
};

/** Cotisation disponible dans l'onglet « Enregistrement des versements ». */
export type CotisationPourVersement = {
  id: string;
  nom: string;
  type: TypeCotisation;
  frequence: FrequenceCotisation;
  dateDebut: string | null;
  dateFin: string | null;
  estCloture: boolean;
  montantPlancher: number | null;
  autoriserSurplus: boolean;
  montantCible: number | null;
  baremes: BaremeLigne[];
  /** Mois déjà acquittés, indexés par membre. */
  moisPayes: Record<string, MoisPaye[]>;
  /**
   * Membres ayant DÉJÀ réglé leur part obligatoire sur une cotisation
   * ponctuelle (`PONCTUELLE_EVENEMENT`). Sert à désactiver le menu déroulant
   * des membres (badge « ✓ Déjà réglé ») et à éviter tout double paiement.
   */
  membresRegles: string[];
  totalVerse: number;
};

/** Mode de paiement proposé pour un versement de cotisation. */
export type ModePaiementOption = { value: ModePaiement; label: string };

// ---------------------------------------------------------------------------
// Rapports & bilans (onglet 3)
// ---------------------------------------------------------------------------

/** Ventilation d'une classe (Adultes / Jeunes / Enfants) pour un mois. */
export type ClasseRapport = {
  cible: CibleCotisation;
  nombreMembres: number;
  /** Montant attendu sur le mois. */
  attendu: number;
  /** Montant encaissé sur le mois. */
  encaisse: number;
  /** Membres n'ayant pas encore acquitté le mois. */
  retards: number;
  taux: number | null;
};

/** Ligne mensuelle du bilan : ventilation par classe + retards du mois. */
export type LigneMensuelleRapport = {
  /** Clé du mois (« fevrier »). */
  moisCle: string;
  libelle: string;
  estCourant: boolean;
  attendu: number;
  encaisse: number;
  taux: number | null;
  retards: number;
  classes: ClasseRapport[];
};

/** Bilan d'une cotisation ponctuelle ou anonyme. */
export type RapportCampagne = {
  cotisationId: string;
  nom: string;
  type: TypeCotisation;
  estCloture: boolean;
  dateDebut: string | null;
  dateFin: string | null;
  montantPlancher: number | null;
  montantCible: number | null;
  /** Total récolté (part obligatoire + surplus). */
  totalRecolte: number;
  /** Dons d'amour / surplus volontaires récoltés. */
  surplusTotal: number;
  nombreVersements: number;
  nombreParticipants: number;
  /** Progression vers la cible (0 → 1), null si montant libre. */
  progression: number | null;
};

/** Bilan annuel de l'exercice en cours (onglet Rapports). */
export type BilanExercice = {
  /** Attendu total des cotisations récurrentes sur l'exercice. */
  attenduRecurrence: number;
  /** Encaissé sur les cotisations récurrentes. */
  encaisseRecurrence: number;
  tauxRecouvrement: number;
  /** Totaux des cotisations ponctuelles (aides / actions). */
  totalPonctuelles: number;
  /** Surplus / dons d'amour de toutes les cotisations. */
  totalSurplus: number;
  /** Cotisations anonymes (travaux, projets). */
  totalAnonymes: number;
  /** Total général encaissé sur l'exercice. */
  totalGeneral: number;
  nombreVersements: number;
  nombreContributeurs: number;
};

/** Une ligne nominative du registre détaillé d'une campagne ponctuelle / anonyme. */
export type DetailVersementCampagne = {
  id: string;
  /** Date effective ISO (AAAA-MM-JJ) — null si inconnue. */
  dateEffective: string | null;
  /** Nom affiché du contributeur (« Don anonyme » si aucun membre). */
  contributeur: string;
  /** Classe / statut du membre (Adultes, Jeunes…), « — » si anonyme. */
  classe: string;
  /** Part obligatoire réglée. */
  montantBase: number;
  /** Surplus / don volontaire. */
  surplus: number;
  /** Total versé (base + surplus). */
  montantTotal: number;
  /** Mode de paiement lisible (Espèces, Mobile Money…). */
  modePaiement: string;
};

/** Registre nominatif complet d'une campagne (carte + lignes détaillées). */
export type CampagneDetaillee = {
  campagne: RapportCampagne;
  versements: DetailVersementCampagne[];
  totalBase: number;
  totalSurplus: number;
  totalGeneral: number;
};

/** État d'un membre pour un mois récurrent donné. */
export type EtatMembreMensuel = {
  membreId: string;
  /** Nom affiché (« Nom Prénoms »). */
  label: string;
  /** Classe (Adultes, Jeunes…). */
  classe: string;
  /** Vrai si le mois est réglé. */
  aJour: boolean;
  /** Montant versé pour ce mois (part obligatoire proratisée). */
  montantVerse: number;
  /** Date effective du règlement (ISO), null si en retard. */
  dateReglement: string | null;
};

/** Ligne mensuelle enrichie : ventilation + état nominatif par membre. */
export type LigneMensuelleDetaillee = {
  ligne: LigneMensuelleRapport;
  membres: EtatMembreMensuel[];
  nombreAJour: number;
  nombreEnRetard: number;
};
