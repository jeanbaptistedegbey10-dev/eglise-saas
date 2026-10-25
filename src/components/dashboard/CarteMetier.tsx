import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Carte métier du dashboard : vignette cliquable (ou simple si `href` absent)
// avec icône colorée, compteur mis en avant et légende descriptive.
// Rendue côté serveur (aucune interactivité client requise).
// ---------------------------------------------------------------------------

/** Teintes disponibles pour la pastille d'icône de la carte. */
export type TeinteCarte =
  | "violet"
  | "indigo"
  | "emerald"
  | "green"
  | "amber"
  | "rose"
  | "blue"
  | "teal"
  | "orange"
  | "slate";

const TEINTES: Record<TeinteCarte, { pastille: string; texte: string; survol: string }> = {
  violet: {
    pastille: "bg-violet-500/15",
    texte: "text-violet-600 dark:text-violet-300",
    survol: "hover:border-violet-500/40",
  },
  indigo: {
    pastille: "bg-indigo-500/15",
    texte: "text-indigo-600 dark:text-indigo-300",
    survol: "hover:border-indigo-500/40",
  },
  emerald: {
    pastille: "bg-emerald-500/15",
    texte: "text-emerald-600 dark:text-emerald-300",
    survol: "hover:border-emerald-500/40",
  },
  green: {
    pastille: "bg-green-500/15",
    texte: "text-green-600 dark:text-green-300",
    survol: "hover:border-green-500/40",
  },
  amber: {
    pastille: "bg-amber-500/15",
    texte: "text-amber-600 dark:text-amber-300",
    survol: "hover:border-amber-500/40",
  },
  rose: {
    pastille: "bg-rose-500/15",
    texte: "text-rose-600 dark:text-rose-300",
    survol: "hover:border-rose-500/40",
  },
  blue: {
    pastille: "bg-blue-500/15",
    texte: "text-blue-600 dark:text-blue-300",
    survol: "hover:border-blue-500/40",
  },
  teal: {
    pastille: "bg-teal-500/15",
    texte: "text-teal-600 dark:text-teal-300",
    survol: "hover:border-teal-500/40",
  },
  orange: {
    pastille: "bg-orange-500/15",
    texte: "text-orange-600 dark:text-orange-300",
    survol: "hover:border-orange-500/40",
  },
  slate: {
    pastille: "bg-slate-500/15",
    texte: "text-slate-600 dark:text-slate-300",
    survol: "hover:border-slate-500/40",
  },
};

export type CarteMetierProps = {
  /** Identifiant technique stable (clé React). */
  id: string;
  /** Intitulé de la carte (ex. « Finances »). */
  libelle: string;
  /** Icône lucide-react affichée dans la pastille colorée. */
  icone: LucideIcon;
  /** Teinte de la pastille d'icône. */
  teinte: TeinteCarte;
  /** Compteur mis en avant (nombre ou montant pré-formaté). */
  compteur: string;
  /** Légende descriptive sous le compteur. */
  legende: string;
  /** Lien cible — si absent, la carte est purement informative. */
  href?: string;
};

export function CarteMetier({
  libelle,
  icone: Icon,
  teinte,
  compteur,
  legende,
  href,
}: CarteMetierProps) {
  const palette = TEINTES[teinte] ?? TEINTES.slate;
  const className = [
    "flex flex-col gap-2 rounded-2xl border border-card-border bg-card px-5 py-4 shadow-sm",
    "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    href ? `group ${palette.survol}` : "",
  ].join(" ");

  const contenu = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${palette.pastille}`}
        >
          <Icon className={`h-5 w-5 ${palette.texte}`} aria-hidden />
        </span>
        {href && (
          <ArrowRight
            className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {libelle}
        </span>
        <span className="text-2xl font-semibold tabular-nums text-foreground">{compteur}</span>
        <span className="text-xs text-muted-foreground">{legende}</span>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={libelle}>
        {contenu}
      </Link>
    );
  }
  return (
    <div className={className} aria-label={libelle}>
      {contenu}
    </div>
  );
}
