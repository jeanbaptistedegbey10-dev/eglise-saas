/**
 * Types partagés — module Organisation (Sous-communauté).
 *
 * Départements et Groupes partagent les mêmes notions : responsable optionnel,
 * bureau optionnel (aUnBureau) et liaisons de membres avec rôle
 * (RESPONSABLE, MEMBRE_BUREAU, MEMBRE).
 */

export type RoleOrganisation = "RESPONSABLE" | "MEMBRE_BUREAU" | "MEMBRE";

export const ROLES_ORGANISATION: { value: RoleOrganisation; label: string }[] = [
  { value: "RESPONSABLE", label: "Responsable" },
  { value: "MEMBRE_BUREAU", label: "Membre du bureau" },
  { value: "MEMBRE", label: "Membre" },
];

export function libelleRole(role: RoleOrganisation): string {
  switch (role) {
    case "RESPONSABLE":
      return "Responsable";
    case "MEMBRE_BUREAU":
      return "Membre du bureau";
    default:
      return "Membre";
  }
}

export type OrganisationFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

export const initialOrganisationFormState: OrganisationFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

/** Option membre pour les selects (responsable, bureau, affectations). */
export type MembreOptionOrganisation = {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
};

export function nomCompletMembre(m: Pick<MembreOptionOrganisation, "nom" | "prenoms">): string {
  return `${m.prenoms} ${m.nom}`.trim();
}

/** Membre lié avec son rôle au sein d'un département / groupe. */
export type MembreLie = {
  membreId: string;
  nom: string;
  role: RoleOrganisation;
};

export type DepartementResume = {
  id: string;
  nom: string;
  description: string | null;
  aUnBureau: boolean;
  responsableId: string | null;
  responsableNom: string | null;
  nombreMembres: number;
  nombreGroupes: number;
  membres: MembreLie[];
};

export type DepartementEditable = {
  id: string;
  nom: string;
  description: string | null;
  aUnBureau: boolean;
  responsableId: string | null;
  bureauIds: string[];
};

export type GroupeResume = {
  id: string;
  nom: string;
  description: string | null;
  aUnBureau: boolean;
  estSousGroupe: boolean;
  parentId: string | null;
  parentNom: string | null;
  departementId: string | null;
  departementNom: string | null;
  responsableId: string | null;
  responsableNom: string | null;
  nombreMembres: number;
  nombreSousGroupes: number;
  membres: MembreLie[];
};

export type GroupeEditable = {
  id: string;
  nom: string;
  description: string | null;
  aUnBureau: boolean;
  estSousGroupe: boolean;
  parentId: string | null;
  departementId: string | null;
  responsableId: string | null;
  bureauIds: string[];
};

export type GroupeOption = { id: string; nom: string };
export type DepartementOption = { id: string; nom: string };
