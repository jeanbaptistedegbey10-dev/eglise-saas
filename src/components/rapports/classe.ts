import { determinerCible, libelleCible } from "@/lib/cotisation";
export function classeDe(m: { classificationSociale: string | null; sexe: string | null }): string {
  try { return libelleCible(determinerCible({ ...m })); } catch { return "—"; }
}
export type Synthese = {
  totalCollecte: number; totalSurplus: number; totalBase: number;
  nombreVersements: number; nombreParticipants: number;
  objectif: number | null; taux: number | null; reste: number | null;
};
