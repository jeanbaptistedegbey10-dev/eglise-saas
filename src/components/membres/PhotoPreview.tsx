/* Les photos sont des data URLs base64 : next/image ne peut pas les
 * optimiser — un <img> classique est donc attendu. */
/* eslint-disable @next/next/no-img-element */

import clsx from "clsx";

type Props = {
  /** Photo du membre (data URL) — `null` si le membre n'a pas de photo. */
  photoDataUrl?: string | null;
  /** Initiales affichées en repli quand aucune photo n'est disponible. */
  initiales?: string;
  /** Nom complet, utilisé pour le texte alternatif de la photo. */
  nomComplet?: string;
  /** Taille de l'aperçu (côté du carré). */
  taille?: "sm" | "md" | "lg";
  /** Classes CSS additionnelles appliquées au conteneur. */
  className?: string;
};

const TAILLES = {
  sm: "h-10 w-10 rounded-lg text-sm",
  md: "h-12 w-12 rounded-xl text-base",
  lg: "h-16 w-16 rounded-2xl text-xl",
} as const;

/**
 * Aperçu de la photo d'un membre.
 *
 * Affiche la photo (data URL) si elle existe, sinon un avatar contenant les
 * initiales du membre — afin de garder une présentation homogène dans le
 * répertoire et sur la fiche.
 */
export default function PhotoPreview({
  photoDataUrl,
  initiales = "",
  nomComplet,
  taille = "md",
  className,
}: Props) {
  const classes = clsx(
    "flex shrink-0 items-center justify-center overflow-hidden border border-card-border bg-primary/20 font-semibold text-accent",
    TAILLES[taille],
    className,
  );

  if (photoDataUrl) {
    return (
      <img
        src={photoDataUrl}
        alt={nomComplet ? `Photo de ${nomComplet}` : "Photo du membre"}
        className={clsx(classes, "object-cover")}
      />
    );
  }

  return (
    <span className={classes} aria-hidden>
      {initiales}
    </span>
  );
}
