"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Church,
  FileText,
  HeartHandshake,
  Lock,
  Menu,
  Package,
  PlayCircle,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import ThemeToggle from "@/components/layout/ThemeToggle";

// ---------------------------------------------------------------------------
// LandingClient — partie interactive (client) de la page d'accueil publique.
// Rendue par `src/app/page.tsx` (Server Component) qui transmet le statut
// de session pour adapter les appels a l'action.
// Jetons clair / sombre : bg-background, bg-card... — typage strict.
// ---------------------------------------------------------------------------

export type LandingClientProps = {
  /** `true` si une session active existe (CTA -> tableau de bord). */
  connecte: boolean;
};

type Fonctionnalite = {
  icon: LucideIcon;
  titre: string;
  description: string;
  points: string[];
  iconClasses: string;
};

type Temoin = {
  citation: string;
  nom: string;
  role: string;
  eglise: string;
  initiales: string;
  couleurAvatar: string;
};

const LIENS_NAV: { label: string; href: string }[] = [
  { label: "Accueil", href: "#accueil" },
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "Support", href: "#support" },
];
const FONCTIONNALITES: Fonctionnalite[] = [
  {
    icon: Users,
    titre: "Gestion complete des membres & Fiche 360",
    description: "Repertoire centralise, familles, baptemes, fonctions et suivi pastoral de chaque membre.",
    points: ["Fiche 360", "Familles", "Departements"],
    iconClasses: "bg-violet-500/15 text-violet-600 ring-violet-500/25 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/30",
  },
  {
    icon: Wallet,
    titre: "Finances, cotisations & caisses",
    description: "Cotisations recurrentes au bareme, campagnes volontaires, quetes anonymes et suivi des caisses.",
    points: ["Baremes", "Quetes", "Paiements"],
    iconClasses: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30",
  },
  {
    icon: ShieldCheck,
    titre: "Journal d'audit & acces par role",
    description: "Tracabilite complete des actions sensibles et controle fin des acces par role.",
    points: ["Tracabilite", "Roles", "Cloture"],
    iconClasses: "bg-blue-500/15 text-blue-600 ring-blue-500/25 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/30",
  },
  {
    icon: Package,
    titre: "Patrimoine & inventaire",
    description: "Suivez le materiel, les batiments et les equipements de l'eglise en un seul inventaire.",
    points: ["Inventaire", "Equipements", "Valorisation"],
    iconClasses: "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/30",
  },
  {
    icon: FileText,
    titre: "Releves annuels & recus PDF",
    description: "Releves individuels annuels et recus PDF prets a imprimer ou a partager.",
    points: ["Releves annuels", "Recus PDF", "Impression"],
    iconClasses: "bg-rose-500/15 text-rose-600 ring-rose-500/25 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-400/30",
  },
  {
    icon: BarChart3,
    titre: "Cultes, rapports & pilotage",
    description: "Planifiez les cultes et pilotez l'eglise avec des bilans par exercice.",
    points: ["Cultes", "Bilans", "Exercices"],
    iconClasses: "bg-indigo-500/15 text-indigo-600 ring-indigo-500/25 dark:bg-indigo-400/15 dark:text-indigo-300 dark:ring-indigo-400/30",
  },
];

const TEMOIGNAGES: Temoin[] = [
  {
    citation: "Nous avons enfin une vision claire de nos membres et de nos finances. La fiche 360 a transforme notre suivi pastoral.",
    nom: "Pasteur Emmanuel K.", role: "Pasteur principal", eglise: "Eglise Grace Divine", initiales: "EK", couleurAvatar: "bg-violet-600",
  },
  {
    citation: "Les cotisations au bareme et les recus PDF nous font gagner des heures chaque mois. La cloture est sereine.",
    nom: "Mme Aicha D.", role: "Tresoriere", eglise: "Eglise Bethesda", initiales: "AD", couleurAvatar: "bg-emerald-600",
  },
  {
    citation: "Le journal d'audit et les roles nous donnent confiance : chaque franc est trace, chaque acces est controle.",
    nom: "Diacre Jean-Marc S.", role: "Responsable administration", eglise: "Eglise Nouvelle Alliance", initiales: "JS", couleurAvatar: "bg-blue-600",
  },
];

const CHIFFRES: { valeur: string; label: string }[] = [
  { valeur: "10+", label: "Eglises accompagnees" },
  { valeur: "5K+", label: "Membres geres" },
  { valeur: "100%", label: "Securise" },
];

function Etoiles(): React.ReactElement {
  return (
    <span className="flex items-center gap-0.5" aria-label="Note : 5 etoiles sur 5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} aria-hidden className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}
export default function LandingClient({ connecte }: LandingClientProps): React.ReactElement {
  const [menuOuvert, setMenuOuvert] = useState<boolean>(false);
  const hrefPrincipal: string = connecte ? "/finances" : "/register";
  const labelPrincipal: string = connecte ? "Acceder au tableau de bord" : "Creer un compte";
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-40 border-b border-card-border bg-background/85 backdrop-blur">
        <nav aria-label="Navigation principale" className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link href={connecte ? "/finances" : "#accueil"} className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Church aria-hidden className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">Eglise SaaS</span>
              <span className="text-[11px] text-muted-foreground">Gestion d&apos;eglise</span>
            </span>
          </Link>
          <ul className="hidden items-center gap-1 md:flex">
            {LIENS_NAV.map((lien) => (
              <li key={lien.label}>
                <Link href={lien.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  {lien.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {connecte ? (
              <Link href="/finances" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
                Tableau de bord<ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Se connecter</Link>
                <Link href="/register" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">Demarrer gratuitement<ArrowRight aria-hidden className="h-4 w-4" /></Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button type="button" onClick={() => setMenuOuvert((o) => !o)} aria-expanded={menuOuvert} aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-card-border bg-card text-muted-foreground">
              {menuOuvert ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        {menuOuvert && (
          <div className="border-t border-card-border bg-background px-4 py-3 md:hidden">
            <ul className="flex flex-col gap-1">
              {LIENS_NAV.map((lien) => (
                <li key={lien.label}>
                  <Link href={lien.href} onClick={() => setMenuOuvert(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{lien.label}</Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-2 border-t border-card-border pt-3">
              {connecte ? (
                <Link href="/finances" onClick={() => setMenuOuvert(false)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Tableau de bord<ArrowRight aria-hidden className="h-4 w-4" /></Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOuvert(false)} className="inline-flex items-center justify-center rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-semibold">Se connecter</Link>
                  <Link href="/register" onClick={() => setMenuOuvert(false)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Demarrer gratuitement<ArrowRight aria-hidden className="h-4 w-4" /></Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main id="accueil" className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-10 sm:px-8 sm:py-14">
        <section aria-labelledby="titre-hero" className="grid items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-card-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
              Plateforme tout-en-un pour eglises
            </p>
            <h1 id="titre-hero" className="text-4xl font-bold tracking-tight sm:text-5xl">
              Gerez votre eglise. <span className="text-accent">Developpez votre communaute.</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              La plateforme tout-en-un pour pasteurs, tresoriers et responsables d&apos;eglise.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={hrefPrincipal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
                {labelPrincipal}<ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link href="#demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-card-border bg-card px-6 py-3 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <PlayCircle aria-hidden className="h-4 w-4 text-accent" />Decouvrir la demo
              </Link>
            </div>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-3.5 w-3.5 text-emerald-500" />Sans carte bancaire</li>
              <li className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-3.5 w-3.5 text-emerald-500" />Prise en main en 10 minutes</li>
              <li className="inline-flex items-center gap-1.5"><Lock aria-hidden className="h-3.5 w-3.5 text-emerald-500" />Donnees securisees</li>
            </ul>
          </div>
          <div id="demo" aria-label="Apercu du tableau de bord" className="relative scroll-mt-24">
            <div aria-hidden className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-card-border bg-muted/60 px-4 py-3">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 hidden rounded-md bg-background px-2.5 py-1 text-[11px] text-muted-foreground sm:block">app.eglise-saas.com/finances</span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                <div className="rounded-xl border border-card-border bg-background p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Membres actifs</p>
                  <p className="mt-1 text-xl font-bold">1 248</p>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">+8,2 % ce mois</p>
                </div>
                <div className="rounded-xl border border-card-border bg-background p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Cotisations (mois)</p>
                  <p className="mt-1 text-xl font-bold">3,4 M FCFA</p>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">96 % recouvres</p>
                </div>
                <div className="rounded-xl border border-card-border bg-background p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Quete dimanche</p>
                  <p className="mt-1 text-xl font-bold">285 000 FCFA</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Culte du 12 octobre</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section aria-label="Chiffres cles" className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 text-center sm:grid-cols-3">
            {CHIFFRES.map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold tracking-tight sm:text-4xl">{c.valeur}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-accent">
                  {c.label.includes("Membres") ? <Users aria-hidden className="h-3 w-3" /> : c.label.includes("Securise") ? <Lock aria-hidden className="h-3 w-3" /> : <Church aria-hidden className="h-3 w-3" />}{c.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-card-border pt-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-muted/70 px-3 py-1.5 font-medium"><ShieldCheck aria-hidden className="h-3.5 w-3.5 text-emerald-500" />100 % Securise</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-muted/70 px-3 py-1.5 font-medium"><HeartHandshake aria-hidden className="h-3.5 w-3.5 text-rose-500" />Pense pour pasteurs et tresoriers</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-muted/70 px-3 py-1.5 font-medium"><FileText aria-hidden className="h-3.5 w-3.5 text-blue-500" />Releves et recus PDF inclus</span>
          </div>
        </section>
        <section id="fonctionnalites" aria-labelledby="titre-fonctionnalites" className="flex scroll-mt-24 flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-2">
            <p className="text-sm font-semibold text-accent">Fonctionnalites</p>
            <h2 id="titre-fonctionnalites" className="text-2xl font-bold tracking-tight sm:text-3xl">Tout ce dont votre eglise a besoin, au meme endroit</h2>
            <p className="text-sm text-muted-foreground sm:text-base">De la fiche membre au bilan annuel, chaque module est relie aux autres pour une gestion fluide et tracable.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FONCTIONNALITES.map(({ icon: Icon, titre, description, points, iconClasses }) => (
              <article key={titre} className="group flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105 ${iconClasses}`}>
                  <Icon aria-hidden className="h-6 w-6" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold">{titre}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
                <ul className="mt-auto flex flex-wrap gap-2 pt-1">
                  {points.map((pt) => (
                    <li key={pt} className="inline-flex items-center gap-1 rounded-full border border-card-border bg-muted/70 px-3 py-1 text-xs text-muted-foreground">
                      <Check aria-hidden className="h-3 w-3 text-emerald-500" />{pt}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
        <section id="tarifs" aria-labelledby="titre-tarifs" className="flex scroll-mt-24 flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 text-center">
            <p className="text-sm font-semibold text-accent">Tarifs</p>
            <h2 id="titre-tarifs" className="text-2xl font-bold tracking-tight sm:text-3xl">Un tarif simple, adapte a chaque eglise</h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">Commencez gratuitement, evoluez quand votre communaute grandit. Sans engagement.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-background p-6">
              <div className="flex flex-col gap-1"><h3 className="text-base font-bold">Decouverte</h3><p className="text-xl font-bold text-accent">0 FCFA</p><p className="text-xs text-muted-foreground">Pour decouvrir la plateforme</p></div>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />Jusqu a 50 membres</li>
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />Registre des cultes</li>
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />1 utilisateur</li>
              </ul>
              <Link href={hrefPrincipal} className="mt-auto inline-flex items-center justify-center rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-semibold">Demarrer</Link>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-primary bg-primary/5 p-6 shadow-md">
              <div className="flex flex-col gap-1"><h3 className="text-base font-bold">Communaute</h3><p className="text-xl font-bold text-accent">9 900 FCFA/mois</p><p className="text-xs text-muted-foreground">Pour les eglises en croissance</p></div>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />Membres illimites</li>
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />Finances et recus PDF</li>
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />Journal d audit</li>
              </ul>
              <Link href={hrefPrincipal} className="mt-auto inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{connecte ? "Aller au tableau de bord" : "Demarrer gratuitement"}</Link>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-background p-6">
              <div className="flex flex-col gap-1"><h3 className="text-base font-bold">Mission</h3><p className="text-xl font-bold text-accent">Sur devis</p><p className="text-xs text-muted-foreground">Reseaux d eglises et federations</p></div>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />Multi-eglises</li>
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />Roles avances</li>
                <li className="inline-flex items-center gap-2"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />Support dedie</li>
              </ul>
              <Link href="#support" className="mt-auto inline-flex items-center justify-center rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-semibold">Contacter le support</Link>
            </div>
          </div>
        </section>
        <section aria-labelledby="titre-temoignages" className="flex flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-2">
            <p className="text-sm font-semibold text-accent">Temoignages</p>
            <h2 id="titre-temoignages" className="text-2xl font-bold tracking-tight sm:text-3xl">Ils pilotent leur eglise avec confiance</h2>
            <p className="text-sm text-muted-foreground sm:text-base">Pasteurs, tresoriers et responsables temoignent de leur quotidien avec la plateforme.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TEMOIGNAGES.map((t) => (
              <figure key={t.nom} className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                <Etoiles />
                <blockquote className="text-sm leading-relaxed">{t.citation}</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 border-t border-card-border pt-4">
                  <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${t.couleurAvatar}`}>{t.initiales}</span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{t.nom}</span>
                    <span className="text-xs text-muted-foreground">{t.role} - {t.eglise}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-card px-3 py-1.5 font-medium shadow-sm"><ShieldCheck aria-hidden className="h-3.5 w-3.5 text-emerald-500" />Avis verifies</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-card px-3 py-1.5 font-medium shadow-sm"><Lock aria-hidden className="h-3.5 w-3.5 text-blue-500" />Donnees hebergees en securite</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-card px-3 py-1.5 font-medium shadow-sm"><Etoiles />4,9/5 de satisfaction</span>
          </div>
        </section>
        <section aria-labelledby="titre-cta" className="rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground shadow-lg sm:px-12">
          <h2 id="titre-cta" className="mx-auto max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">Pret a structurer la gestion de votre eglise ?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-primary-foreground/85 sm:text-base">Rejoignez les eglises qui gagnent du temps chaque semaine sur leurs membres, leurs finances et leurs rapports.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={hrefPrincipal} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#6d28d9] shadow-md transition-all hover:-translate-y-0.5 sm:w-auto">{labelPrincipal}<ArrowRight aria-hidden className="h-4 w-4" /></Link>
            {!connecte && (<Link href="/login" className="inline-flex w-full items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto">Se connecter</Link>)}
          </div>
        </section>
      </main>
      <footer id="support" className="scroll-mt-24 border-t border-card-border bg-card/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-8 md:grid-cols-4">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Church aria-hidden className="h-5 w-5" /></span>
              <span className="text-sm font-bold">Eglise SaaS</span>
            </span>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">La plateforme tout-en-un pour pasteurs, tresoriers et responsables d&apos;eglise : membres, finances, patrimoine et rapports.</p>
          </div>
          <nav aria-label="Navigation produit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Produit</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li><Link href="#accueil" className="text-muted-foreground hover:text-foreground">Accueil</Link></li>
              <li><Link href="#fonctionnalites" className="text-muted-foreground hover:text-foreground">Fonctionnalites</Link></li>
              <li><Link href="#tarifs" className="text-muted-foreground hover:text-foreground">Tarifs</Link></li>
              <li><Link href="#demo" className="text-muted-foreground hover:text-foreground">Demo</Link></li>
            </ul>
          </nav>
          <nav aria-label="Ressources">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ressources</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li><Link href="/login" className="text-muted-foreground hover:text-foreground">Se connecter</Link></li>
              <li><Link href="/register" className="text-muted-foreground hover:text-foreground">Creer un compte</Link></li>
              <li><Link href="/finances" className="text-muted-foreground hover:text-foreground">Tableau de bord</Link></li>
            </ul>
          </nav>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Support et legal</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li><Link href="#support" className="text-muted-foreground hover:text-foreground">Centre d aide / Support</Link></li>
              <li><Link href="mailto:support@eglise-saas.com" className="text-muted-foreground hover:text-foreground">support@eglise-saas.com</Link></li>
              <li><Link href="#support" className="text-muted-foreground hover:text-foreground">Mentions legales</Link></li>
              <li><Link href="#support" className="text-muted-foreground hover:text-foreground">Confidentialite</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-card-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-8">
            <p>© {new Date().getFullYear()} Eglise SaaS - Tous droits reserves.</p>
            <p className="inline-flex items-center gap-1.5"><Lock aria-hidden className="h-3.5 w-3.5" />Plateforme securisee pour communautes</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
