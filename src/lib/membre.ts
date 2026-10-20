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

/** Forme lisible du champ JSON `donneesEcclesiastiques`.
 * Stocke aussi le profil étendu (personnel / contact / emploi) sans migration SQL. */
export type DonneesEcclesiastiques = {
  bapteme?: boolean;
  dateBapteme?: string;
  fonctions?: string[];
  nomPere?: string;
  nomMere?: string;
  dateNaissance?: string;
  sexe?: string;
  etatCivil?: string;
  telephoneFixe?: string;
  lieuTravail?: string;
  adresseProfessionnelle?: string;
  telephoneProfessionnel?: string;
  classificationSociale?: string;
  statutMembre?: string;
  typePersonne?: string;
  membreDepuis?: string;
  dateConversion?: string;
  egliseConversion?: string;
  eglisePrecedente?: string;
  adresseLatitude?: number;
  adresseLongitude?: number;
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
  const texte = (cle: string): string | undefined =>
    typeof objet[cle] === "string" && (objet[cle] as string).trim() !== ""
      ? (objet[cle] as string)
      : undefined;
  const nombre = (cle: string): number | undefined =>
    typeof objet[cle] === "number" && Number.isFinite(objet[cle]) ? (objet[cle] as number) : undefined;
  return {
    bapteme: typeof objet.bapteme === "boolean" ? objet.bapteme : undefined,
    dateBapteme: texte("dateBapteme"),
    fonctions: Array.isArray(objet.fonctions)
      ? objet.fonctions.filter((fonction): fonction is string => typeof fonction === "string")
      : undefined,
    nomPere: texte("nomPere"),
    nomMere: texte("nomMere"),
    dateNaissance: texte("dateNaissance"),
    sexe: texte("sexe"),
    etatCivil: texte("etatCivil"),
    telephoneFixe: texte("telephoneFixe"),
    lieuTravail: texte("lieuTravail"),
    adresseProfessionnelle: texte("adresseProfessionnelle"),
    telephoneProfessionnel: texte("telephoneProfessionnel"),
    classificationSociale: texte("classificationSociale"),
    statutMembre: texte("statutMembre"),
    typePersonne: texte("typePersonne"),
    membreDepuis: texte("membreDepuis"),
    dateConversion: texte("dateConversion"),
    egliseConversion: texte("egliseConversion"),
    eglisePrecedente: texte("eglisePrecedente"),
    adresseLatitude: nombre("adresseLatitude"),
    adresseLongitude: nombre("adresseLongitude"),
  };
}

/** Convertit une date ISO (AAAA-MM-JJ) en format français (JJ/MM/AAAA). */
export function formatDateISO(iso: string): string {
  const [annee, mois, jour] = iso.split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : iso;
}
