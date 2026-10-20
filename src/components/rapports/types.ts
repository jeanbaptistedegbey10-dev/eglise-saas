export type ExerciceSelectOption = { id: string; annee: number; libelle: string; cloture: boolean };
export type BaremeOption = { cible: string; montant: number };
export type CotisationRapportOption = {
  id: string; nom: string; description: string | null; type: string; frequence: string;
  dateDebut: string | null; dateFin: string | null; estCloture: boolean;
  montantPlancher: number | null; montantCible: number | null; autoriserSurplus: boolean;
  departementNom: string | null; groupeNom: string | null; baremes: BaremeOption[];
};
export type VersementRapportLigne = {
  id: string; cotisationId: string; cotisationNom: string; cotisationType: string;
  membreId: string | null; membreNom: string; membrePrenoms: string; membreTelephone: string | null;
  classificationSociale: string | null; sexe: string | null;
  montant: number; montantBase: number; surplus: number;
  dateEffective: string | null; dateVersement: string | null; modePaiement: string; estAnonyme: boolean;
};
export type KpiExercice = {
  totalEncaisse: number; totalDecaisse: number; soldeNet: number;
  nombreContributeurs: number; nombreVersements: number;
};
export const TOUTES = "toutes";
export const TYPES_FILTRE = [
  { value: TOUTES, label: "Toutes" },
  { value: "RECURRENTE_CLASSE", label: "Récurrente par classe" },
  { value: "PONCTUELLE_EVENEMENT", label: "Ponctuelle / Aide" },
  { value: "ANONYME_PROJET", label: "Travaux & Projets" },
  { value: "QUETE_CULTE", label: "Quêtes" },
];
export function formatDateCourte(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10).split("-").reverse().join("/");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
export function numeroRecu(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-6).padStart(6, "0");
}
