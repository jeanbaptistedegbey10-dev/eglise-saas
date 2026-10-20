// ---------------------------------------------------------------------------
// Utilitaires CSV — exportation vers Microsoft Excel / LibreOffice
//
// ⚠️ Fichier SANS directive "use server" : il combine des fonctions pures
// (utilisables côté serveur ET client) et une fonction de téléchargement qui
// accède au `DOM` (à n'appeler QUE depuis un composant "use client").
//
// Conventions du fichier exporté :
//  • Séparateur « ; » (standard des locales françaises — Excel FR l'attend) ;
//  • Encodage UTF-8 avec BOM (« ﻿ ») pour préserver les accents ;
//  • Sauts de ligne CRLF (compatibilité Windows/Excel) ;
//  • Échappement des guillemets doubles et des cellules contenant des
//    séparateurs / retours à la ligne.
// ---------------------------------------------------------------------------

/** Valeur d'une cellule CSV — vide (« ») si null/undefined. */
export type CelluleCSV = string | number | boolean | null | undefined;

const SEPARATEUR = ";";
const SAUT_LIGNE = "\r\n";
/** Byte Order Mark UTF-8 — Excel détecte alors correctement l'encodage. */
const BOM = "\uFEFF";

/** Échappe une cellule selon les règles RFC 4180 (adaptées au « ; »). */
function echapperCellule(valeur: CelluleCSV): string {
  const texte =
    valeur === null || valeur === undefined
      ? ""
      : typeof valeur === "string"
        ? valeur
        : String(valeur);
  if (
    texte.includes(SEPARATEUR) ||
    texte.includes('"') ||
    texte.includes("\n") ||
    texte.includes("\r")
  ) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

/**
 * Construit un contenu CSV complet (avec BOM et entête).
 *
 * @param colonnes Libellés de la ligne d'en-tête.
 * @param lignes   Tableau de lignes — chaque ligne est un tableau de cellules.
 */
export function construireCSV(
  colonnes: string[],
  lignes: CelluleCSV[][],
): string {
  const entete = colonnes.map(echapperCellule).join(SEPARATEUR);
  const corps = lignes
    .map((ligne) => ligne.map(echapperCellule).join(SEPARATEUR))
    .join(SAUT_LIGNE);
  return `${BOM}${entete}${corps ? `${SAUT_LIGNE}${corps}` : ""}`;
}

/** Formate un montant pour un CSV français : « 1250000.5 » → « 1250000,5 ». */
export function montantCSV(montant: number | null | undefined): string {
  if (montant === null || montant === undefined || !Number.isFinite(montant)) {
    return "0";
  }
  return String(Math.round(montant * 100) / 100).replace(".", ",");
}

/** Nom de fichier horodaté : « membres-2026-10-19-1430.csv ». */
export function nomFichierCSV(base: string, date: Date = new Date()): string {
  const jour = date.toISOString().slice(0, 10);
  const heure = date.toTimeString().slice(0, 5).replace(":", "");
  const propre = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${propre || "export"}-${jour}-${heure}.csv`;
}

/**
 * Déclenche le téléchargement d'un fichier texte dans le navigateur.
 * ⚠️ Fonction cliente uniquement (utilise `document` et `URL.createObjectURL`).
 */
export function telechargerFichier(
  nomFichier: string,
  contenu: string,
  typeMIME: string,
): void {
  const blob = new Blob([contenu], { type: `${typeMIME};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  // Révocation différée pour laisser le temps au navigateur de démarrer le
  // téléchargement (revoke immédiat annulerait parfois l'effet sur Safari).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Raccourci : construit un CSV et déclenche son téléchargement. */
export function telechargerCSV(
  base: string,
  colonnes: string[],
  lignes: CelluleCSV[][],
): void {
  telechargerFichier(nomFichierCSV(base), construireCSV(colonnes, lignes), "text/csv");
}
