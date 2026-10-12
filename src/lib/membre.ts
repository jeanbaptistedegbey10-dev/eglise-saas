import type { Membre } from "@/generated/prisma/client";

/** Formate un montant numérique selon la locale française (ex. 1 250 000). */
export function formatMontant(montant: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(montant);
}

/** Libellés français des valeurs de l'enum `ModePaiement`. */
const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  VIREMENT: "Virement",
  CHEQUE: "Chèque",
  CARTE_BANCAIRE: "Carte bancaire",
};

/** Traduit un mode de paiement (enum Prisma) en libellé lisible. */
export function libelleModePaiement(mode: string): string {
  return MODE_PAIEMENT_LABELS[mode] ?? mode;
}

/** Forme lisible du champ JSON `donneesEcclesiastiques`. */
export type DonneesEcclesiastiques = {
  bapteme?: boolean;
  dateBapteme?: string;
  fonctions?: string[];
};

/**
 * Lecture tolérante (défensive) du champ JSON `donneesEcclesiastiques`,
 * dont le contenu peut varier d'une installation à l'autre.
 */
export function parseDonneesEcclesiastiques(
  valeur: Membre["donneesEcclesiastiques"],
): DonneesEcclesiastiques {
  if (valeur === null || typeof valeur !== "object" || Array.isArray(valeur)) {
    return {};
  }

  const objet = valeur as Record<string, unknown>;
  return {
    bapteme: typeof objet.bapteme === "boolean" ? objet.bapteme : undefined,
    dateBapteme: typeof objet.dateBapteme === "string" ? objet.dateBapteme : undefined,
    fonctions: Array.isArray(objet.fonctions)
      ? objet.fonctions.filter((fonction): fonction is string => typeof fonction === "string")
      : undefined,
  };
}

/** Convertit une date ISO (AAAA-MM-JJ) en format français (JJ/MM/AAAA). */
export function formatDateISO(iso: string): string {
  const [annee, mois, jour] = iso.split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : iso;
}
