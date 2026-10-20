// ---------------------------------------------------------------------------
// Mois de l'année — utilitaires synchrones
//
// Deux représentations cohabitent :
//  • la CLÉ normalisée (minuscules, sans accent : « fevrier »), utilisée pour
//    stocker `VersementCotisation.moisCoches` ;
//  • le LIBELLÉ accentué (« Février »), affiché dans les grilles de l'UI.
// ---------------------------------------------------------------------------

/** Clés normalisées des 12 mois, indexées 0 → 11. */
export const MOIS_CLEFS: readonly string[] = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

/** Libellés accentués des 12 mois (affichage), indexés 0 → 11. */
export const MOIS_LIBELLES: readonly string[] = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Un mois d'exercice, prêt à être rendu dans une grille de pastilles. */
export type MoisExercice = {
  /** Index 0 → 11. */
  index: number;
  /** Clé normalisée stockée en base (ex. « fevrier »). */
  cle: string;
  /** Libellé affiché (ex. « Février »). */
  libelle: string;
};

/** Passe une chaîne en minuscules sans accents (« Août » → « aout »). */
export function normaliserCleMois(valeur: string): string {
  return valeur
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Vrai si la clé désigne bien un mois de l'année. */
export function estMoisConnu(valeur: string): boolean {
  return MOIS_CLEFS.includes(normaliserCleMois(valeur));
}

/** Clé normalisée d'un mois à partir de son index 0 → 11. */
export function cleMois(index: number): string {
  return MOIS_CLEFS[((index % 12) + 12) % 12] ?? "";
}

/** Libellé accentué d'une clé de mois (« fevrier » → « Février »). */
export function libelleMoisClef(clef: string): string {
  const index = MOIS_CLEFS.indexOf(normaliserCleMois(clef));
  return index >= 0 ? (MOIS_LIBELLES[index] ?? String(clef)) : String(clef);
}

/** Normalise une liste de mois saisie par le formulaire (dédoublonne aussi). */
export function normaliserMoisCoches(valeurs: readonly string[]): string[] {
  const vus = new Set<string>();
  const resultat: string[] = [];
  for (const valeur of valeurs) {
    const cle = normaliserCleMois(valeur);
    if (cle === "" || !MOIS_CLEFS.includes(cle) || vus.has(cle)) continue;
    vus.add(cle);
    resultat.push(cle);
  }
  // Toujours dans l'ordre chronologique de l'année.
  return resultat.sort((a, b) => MOIS_CLEFS.indexOf(a) - MOIS_CLEFS.indexOf(b));
}

/**
 * Mois couverts par un exercice, dans l'ordre chronologique.
 *
 * Gère le passage à l'an : un exercice d'octobre (10) à septembre (9) renvoie
 * Octobre → Septembre. Les bornes sont bornées à [1 … 12].
 */
export function moisExercice(moisDebut: number, moisFin: number): MoisExercice[] {
  const borne = (valeur: number, defaut: number): number => {
    const arrondi = Math.round(Number(valeur));
    return Number.isFinite(arrondi) && arrondi >= 1 && arrondi <= 12 ? arrondi : defaut;
  };
  const debut = borne(moisDebut, 1);
  const fin = borne(moisFin, 12);

  const mois: MoisExercice[] = [];
  let index = debut - 1;
  for (let compteur = 0; compteur < 12; compteur += 1) {
    mois.push({ index, cle: cleMois(index), libelle: MOIS_LIBELLES[index] ?? "" });
    if (index === fin - 1) break;
    index = (index + 1) % 12;
  }
  return mois;
}

/**
 * Clé du mois en cours si elle appartient à l'exercice, sinon clé du dernier
 * mois de l'exercice. Sert à repérer les « retards du mois » dans les rapports.
 */
export function moisCourantExercice(moisDebut: number, moisFin: number): string {
  const mois = moisExercice(moisDebut, moisFin);
  const indexAujourdhui = new Date().getMonth();
  const couvert = mois.find((m) => m.index === indexAujourdhui);
  return couvert?.cle ?? mois[mois.length - 1]?.cle ?? "";
}
