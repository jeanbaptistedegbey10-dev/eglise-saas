"use client";

// ---------------------------------------------------------------------------
// Bouton réutilisable « Exporter en CSV ».
//
// Reçoit des données déjà chargées côté serveur (props sérialisables),
// construit le fichier CSV côté client (utilitaires de `@/lib/csv`) et
// déclenche le téléchargement. Aucune requête supplémentaire.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { telechargerCSV, type CelluleCSV } from "@/lib/csv";

type Props = {
  /** Nom de base du fichier (sans extension ni horodatage). */
  base: string;
  /** Libellés de l'en-tête CSV. */
  colonnes: string[];
  /** Lignes de données — chaque ligne est un tableau de cellules. */
  lignes: CelluleCSV[][];
  /** Libellé du bouton (défaut : « Exporter en CSV »). */
  label?: string;
  /** Classes CSS additionnelles (ex : alignement dans un en-tête). */
  className?: string;
};

const CLASSES_BOUTON =
  "inline-flex items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function ExportCSVBouton({
  base,
  colonnes,
  lignes,
  label = "Exporter en CSV",
  className,
}: Props) {
  const [enCours, setEnCours] = useState(false);

  const handleExport = () => {
    setEnCours(true);
    try {
      telechargerCSV(base, colonnes, lignes);
    } finally {
      // Court délai pour laisser le navigateur démarrer le téléchargement.
      setTimeout(() => setEnCours(false), 500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={enCours || lignes.length === 0}
      title={
        lignes.length === 0
          ? "Aucune donnée à exporter."
          : `Télécharger ${lignes.length} ligne${lignes.length > 1 ? "s" : ""} au format CSV`
      }
      className={className ? `${CLASSES_BOUTON} ${className}` : CLASSES_BOUTON}
    >
      {enCours ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
      {label}
    </button>
  );
}
