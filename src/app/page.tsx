import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  HeartHandshake,
  type LucideIcon,
  Users,
  Wallet,
} from "lucide-react";

type ModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
  /** Classes Tailwind du conteneur d'icône (fond léger + icône vive). */
  iconClasses: string;
  /** Accent de survol (bordure + ombre). */
  accentClasses: string;
};

const MODULES: ModuleCard[] = [
  {
    href: "/organisation",
    title: "Organisation",
    description:
      "Gestion des départements (hommes, femmes, enfants) et des groupes d'activités (chorale, accueil, musique).",
    icon: Users,
    highlights: ["Départements", "Groupes", "Bureaux"],
    // Bleu / indigo — organisation.
    iconClasses:
      "bg-blue-500/15 text-blue-600 ring-blue-500/25 group-hover:bg-blue-500/25 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/30 dark:group-hover:bg-blue-400/25",
    accentClasses:
      "hover:border-blue-500/60 hover:shadow-blue-500/15 dark:hover:border-blue-400/60 dark:hover:shadow-blue-400/10",
  },
  {
    href: "/membres",
    title: "Communauté",
    description:
      "Répertoire des membres, suivi des familles et des données ecclésiastiques (baptêmes, fonctions).",
    icon: Users,
    highlights: ["Membres", "Familles", "Baptêmes & fonctions"],
    // Violet — communauté.
    iconClasses:
      "bg-violet-500/15 text-violet-600 ring-violet-500/25 group-hover:bg-violet-500/25 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/30 dark:group-hover:bg-violet-400/25",
    accentClasses:
      "hover:border-violet-500/60 hover:shadow-violet-500/15 dark:hover:border-violet-400/60 dark:hover:shadow-violet-400/10",
  },
  {
    href: "/finances",
    title: "Finances",
    description:
      "Cotisations obligatoires au barème, campagnes volontaires et quêtes anonymes, par mode de paiement.",
    icon: Wallet,
    highlights: ["Cotisations", "Quêtes", "Modes de paiement"],
    // Émeraude / vert — finances.
    iconClasses:
      "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 group-hover:bg-emerald-500/25 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30 dark:group-hover:bg-emerald-400/25",
    accentClasses:
      "hover:border-emerald-500/60 hover:shadow-emerald-500/15 dark:hover:border-emerald-400/60 dark:hover:shadow-emerald-400/10",
  },
  {
    href: "/cultes",
    title: "Cultes & Événements",
    description:
      "Planification des cultes, intitulés et quêtes associées à chaque célébration.",
    icon: CalendarDays,
    highlights: ["Calendrier", "Intitulés", "Quêtes par culte"],
    // Ambre / orange — cultes.
    iconClasses:
      "bg-amber-500/15 text-amber-600 ring-amber-500/30 group-hover:bg-amber-500/25 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/30 dark:group-hover:bg-amber-400/25",
    accentClasses:
      "hover:border-amber-500/60 hover:shadow-amber-500/15 dark:hover:border-amber-400/60 dark:hover:shadow-amber-400/10",
  },
  {
    href: "/solidarite",
    title: "Solidarité",
    description:
      "Aides distribuées aux membres et suivi pastoral des situations sensibles.",
    icon: HeartHandshake,
    highlights: ["Aides", "Bénéficiaires", "Suivi pastoral"],
    // Rose — solidarité.
    iconClasses:
      "bg-rose-500/15 text-rose-600 ring-rose-500/25 group-hover:bg-rose-500/25 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-400/30 dark:group-hover:bg-rose-400/25",
    accentClasses:
      "hover:border-rose-500/60 hover:shadow-rose-500/15 dark:hover:border-rose-400/60 dark:hover:shadow-rose-400/10",
  },
  {
    href: "/rapports",
    title: "Rapports & Clôture",
    description:
      "Bilans financiers par exercice, aides distribuées et procédures de clôture comptable.",
    icon: ClipboardCheck,
    highlights: ["Bilans", "Exercices", "Clôture comptable"],
    // Bleu / indigo — rapports & clôture.
    iconClasses:
      "bg-blue-500/15 text-blue-600 ring-blue-500/25 group-hover:bg-blue-500/25 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/30 dark:group-hover:bg-blue-400/25",
    accentClasses:
      "hover:border-blue-500/60 hover:shadow-blue-500/15 dark:hover:border-blue-400/60 dark:hover:shadow-blue-400/10",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-accent">Tableau de bord</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Vue d&apos;ensemble de l&apos;église
        </h1>
        <p className="text-sm text-muted-foreground">
          Accédez aux grands modules de gestion : communauté, finances, cultes
          et clôture comptable.
        </p>
      </header>

      <section
        aria-label="Modules de gestion"
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        {MODULES.map(
          ({ href, title, description, icon: Icon, highlights, iconClasses, accentClasses }) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm transition-all duration-200 outline-none hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring ${accentClasses}`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-all duration-200 group-hover:scale-105 ${iconClasses}`}
                >
                  <Icon aria-hidden className="h-6 w-6" />
                </span>
                <ChevronRight
                  aria-hidden
                  className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-foreground"
                />
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>

              <ul className="mt-auto flex flex-wrap gap-2">
                {highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="rounded-full border border-card-border bg-muted/70 px-3 py-1 text-xs text-muted-foreground transition-colors group-hover:bg-muted"
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            </Link>
          ),
        )}
      </section>

      <footer className="rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-4 text-sm text-muted-foreground">
        Modules prêts à être branchés aux données Prisma (membres, exercices,
        paiements, cultes).
      </footer>
    </div>
  );
}
