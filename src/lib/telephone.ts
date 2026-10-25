/**
 * Indicatifs téléphoniques internationaux supportés par l'application.
 *
 * Le Togo (+228) est l'indicatif par défaut (paramétrage historique de l'app),
 * mais la liste est volontairement plus large : l'église peut accueillir des
 * membres résidant à l'étranger et l'indicatif doit toujours correspondre au
 * pays réellement sélectionné dans le formulaire membre.
 */
export type IndicatifPays = {
  /** Indicatif au format international, ex. « +228 ». */
  code: string;
  /** Drapeau (emoji) du pays. */
  drapeau: string;
  /** Nom du pays en français. */
  pays: string;
  /** Libellé affiché dans le sélecteur. */
  label: string;
};

export const INDICATIFS_PAYS: readonly IndicatifPays[] = [
  { code: "+228", drapeau: "🇹🇬", pays: "Togo", label: "🇹🇬 Togo (+228)" },
  { code: "+229", drapeau: "🇧🇯", pays: "Bénin", label: "🇧🇯 Bénin (+229)" },
  { code: "+233", drapeau: "🇬🇭", pays: "Ghana", label: "🇬🇭 Ghana (+233)" },
  { code: "+225", drapeau: "🇨🇮", pays: "Côte d'Ivoire", label: "🇨🇮 Côte d'Ivoire (+225)" },
  { code: "+237", drapeau: "🇨🇲", pays: "Cameroun", label: "🇨🇲 Cameroun (+237)" },
  { code: "+235", drapeau: "🇹🇭", pays: "Tchad", label: "🇹🇭 Tchad (+235)" },
  { code: "+223", drapeau: "🇲🇱", pays: "Mali", label: "🇲🇱 Mali (+223)" },
  { code: "+221", drapeau: "🇸🇳", pays: "Sénégal", label: "🇸🇳 Sénégal (+221)" },
  { code: "+226", drapeau: "🇧🇫", pays: "Burkina Faso", label: "🇧🇫 Burkina Faso (+226)" },
  { code: "+234", drapeau: "🇳🇬", pays: "Nigeria", label: "🇳🇬 Nigeria (+234)" },
  { code: "+254", drapeau: "🇰🇪", pays: "Kenya", label: "🇰🇪 Kenya (+254)" },
  { code: "+256", drapeau: "🇺🇬", pays: "Ouganda", label: "🇺🇬 Ouganda (+256)" },
  { code: "+27", drapeau: "🇿🇦", pays: "Afrique du Sud", label: "🇿🇦 Afrique du Sud (+27)" },
  { code: "+1", drapeau: "🇺🇸", pays: "États-Unis / Canada", label: "🇺🇸 États-Unis / Canada (+1)" },
  { code: "+86", drapeau: "🇨🇳", pays: "Chine", label: "🇨🇳 Chine (+86)" },
  { code: "+33", drapeau: "🇫🇷", pays: "France", label: "🇫🇷 France (+33)" },
  { code: "+32", drapeau: "🇧🇪", pays: "Belgique", label: "🇧🇪 Belgique (+32)" },
  { code: "+44", drapeau: "🇬🇧", pays: "Royaume-Uni", label: "🇬🇧 Royaume-Uni (+44)" },
  { code: "+39", drapeau: "🇮🇹", pays: "Italie", label: "🇮🇹 Italie (+39)" },
  { code: "+49", drapeau: "🇩🇪", pays: "Allemagne", label: "🇩🇪 Allemagne (+49)" },
  { code: "+55", drapeau: "🇧🇷", pays: "Brésil", label: "🇧🇷 Brésil (+55)" },
  { code: "+351", drapeau: "🇵🇹", pays: "Portugal", label: "🇵🇹 Portugal (+351)" },
  { code: "+971", drapeau: "🇦🇪", pays: "Émirats arabes unis", label: "🇦🇪 Émirats arabes unis (+971)" },
] as const;

/** Indicatif utilisé par défaut (Togo). */
export const DEFAUT_INDICATIF = "+228";

/**
 * Retrouve l'indicatif correspondant au début d'une valeur de téléphone.
 * Les codes les plus longs sont testés en premier (« +351 » avant « +3 » n'existe
 * pas ici, mais « +1 » ne doit pas matcher « +128 »… le tri par longueur
 * garantit qu'on ne confond jamais « +225 » et « +22 »).
 */
export function trouverIndicatif(valeur: string): IndicatifPays | null {
  const cible = (valeur ?? "").trim();
  if (cible === "") return null;
  return (
    [...INDICATIFS_PAYS]
      .sort((a, b) => b.code.length - a.code.length)
      .find((code) => cible.startsWith(code.code)) ?? null
  );
}

/**
 * Normalise un numéro : retire l'indicatif existant s'il correspond à
 * l'indicatif du pays sélectionné, puis préfixe le numéro national.
 *
 * @param numero Numéro national ou international saisi par l'utilisateur.
 * @param indicatif Indicatif du pays sélectionné (ex. « +228 »).
 * @returns Le numéro préfixé (ex. « +228 90 12 34 56 ») ou "" si vide.
 */
export function prefixerNumero(numero: string, indicatif: string): string {
  const nettoye = (numero ?? "").trim().replace(/^\s+/, "");
  if (nettoye === "") return "";
  // Retire un éventuel indicatif déjà présent (national ou international).
  const existant = trouverIndicatif(nettoye);
  const corps = existant ? nettoye.slice(existant.code.length).trim() : nettoye;
  if (corps === "") return "";
  return `${indicatif} ${corps}`;
}
