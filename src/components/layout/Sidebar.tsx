"use client";

import { Suspense, useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  type LucideIcon,
  HeartHandshake,
  Network,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { useSession } from "next-auth/react";
import { aAccesAuChemin } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Couleur de l'icône dans la sidebar (conservée quel que soit le thème). */
  iconColor?: string;
  /** Sous-liens affichés en retrait sous l'entrée principale. */
  children?: { href: string; label: string }[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Vue d'ensemble & métriques",
    icon: LayoutDashboard,
    iconColor: "text-indigo-500",
  },
  {
    href: "/organisation",
    label: "Organisation",
    description: "Départements & groupes",
    icon: Network,
    iconColor: "text-fuchsia-500",
  },
  {
    href: "/membres",
    label: "Communauté",
    description: "Membres & familles",
    icon: Users,
    iconColor: "text-emerald-500",
  },
  {
    href: "/finances",
    label: "Finances",
    description: "Cotisations & quêtes",
    icon: Wallet,
    iconColor: "text-amber-500",
    children: [
      { href: "/finances", label: "Vue d'ensemble" },
      { href: "/finances/cotisations?tab=types", label: "Cotisations & Barèmes" },
      { href: "/finances/cotisations?tab=versements", label: "Versements" },
      { href: "/finances/depenses", label: "Dépenses & Décaissements" },
      { href: "/finances/caisses", label: "Gestion des Caisses" },
      { href: "/finances/dons-libres", label: "Dons Libres & Offrandes" },
      { href: "/finances/virements", label: "Virements & Compléments" },
      { href: "/finances/cotisations?tab=rapports", label: "Rapports & Bilans" },
    ],
  },
  {
    href: "/cultes",
    label: "Cultes & Événements",
    description: "Calendrier du culte",
    icon: CalendarDays,
    iconColor: "text-orange-500",
  },
  {
    href: "/solidarite",
    label: "Solidarité",
    description: "Aides & suivi pastoral",
    icon: HeartHandshake,
    iconColor: "text-rose-500",
  },
  {
    href: "/rapports",
    label: "Rapports & Clôture",
    description: "Bilans & clôtures",
    icon: ClipboardCheck,
    iconColor: "text-cyan-500",
  },
  {
    href: "/administration/utilisateurs",
    label: "Administration",
    description: "Comptes, accès & journal d'audit",
    icon: ShieldCheck,
    iconColor: "text-indigo-900",
    children: [
      { href: "/administration/utilisateurs", label: "Comptes & Accès" },
      { href: "/administration/audit", label: "Journal d'Audit" },
      { href: "/patrimoine", label: "Patrimoine & Logistique" },
    ],
  },
  {
    href: "/parametres",
    label: "Paramètres",
    description: "Configuration de l'église",
    icon: Settings,
    iconColor: "text-slate-500",
  },
];

function cheminBase(href: string): string {
  return href.split("?")[0] ?? href;
}

function estCheminCourant(pathname: string, href: string): boolean {
  const base = cheminBase(href);
  return base === "/" ? pathname === "/" : pathname.startsWith(base);
}

/** Navigation principale — lit `?tab=` (repli `?onglet=`) pour surligner le sous-lien.
 *  Sections avec `children` = accordéons pliables (seule la section visitée est ouverte).
 *  Filtre dynamiquement les liens selon `session.user.role` (RBAC : src/lib/permissions.ts). */
function NavigationPrincipale({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const parametres = useSearchParams();
  const ongletCourant = parametres.get("tab") ?? parametres.get("onglet");
  const { data: session } = useSession();
  const role = session?.user?.role ?? null;

  // Sans rôle connu (session en cours de chargement) : afficher tout,
  // le middleware bloque de toute façon les routes non autorisées.
  const itemsVisibles = !role
    ? NAV_ITEMS
    : NAV_ITEMS.map((item) => ({
        ...item,
        children: item.children?.filter((child) => aAccesAuChemin(role, child.href)),
      })).filter(
        (item) =>
          aAccesAuChemin(role, item.href) || (item.children?.length ?? 0) > 0,
      );

  // Accordéons : seule la section du chemin courant est ouverte par défaut.
  const [sectionsOuvertes, setSectionsOuvertes] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (item.children?.length && estCheminCourant(pathname, item.href)) {
        initial[item.href] = true;
      }
    }
    return initial;
  });

  // À chaque navigation : déplie la section visitée, replie les autres.
  useEffect(() => {
    const suivantes: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (item.children?.length && estCheminCourant(pathname, item.href)) {
        suivantes[item.href] = true;
      }
    }
    setSectionsOuvertes(suivantes);
  }, [pathname]);

  // Sur mobile, l'<aside> défile déjà (menu plein écran) : la zone de
  // navigation ne crée pas de second scroll. Sur desktop, l'<aside> est figé
  // (`md:overflow-hidden`) et seule la navigation défile.
  return (
    <nav className="min-h-0 flex-1 space-y-1 py-4 md:overflow-y-auto md:overscroll-contain md:pr-1" aria-label="Navigation principale">
      {itemsVisibles.map(
        ({ href, label, description, icon: Icon, iconColor, children }, index) => {
        const estCourant = estCheminCourant(pathname, href);
        const aDesEnfants = !!children && children.length > 0;
        const estOuvert = aDesEnfants ? !!sectionsOuvertes[href] : false;
        const ChevronIcon = estOuvert ? ChevronDown : ChevronRight;

        if (!aDesEnfants) {
          return (
            <div key={`${href}-${index}`} className="flex flex-col gap-0.5">
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={estCourant ? "page" : undefined}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                estCourant
                  ? "bg-sidebar-active-bg font-medium text-sidebar-active-fg"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                aria-hidden
                className={clsx(
                  "h-5 w-5 shrink-0 transition-colors",
                  estCourant
                    ? "text-accent"
                    : `${iconColor ?? "text-muted-foreground"} group-hover:text-foreground`,
                )}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{label}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {description}
                </span>
              </span>
              </Link>
            </div>
          );
        }

        const regionId = `sous-menu-${index}`;
        return (
          <div key={`${href}-${index}`} className="flex flex-col gap-0.5">
            <div
              className={clsx(
                "group flex items-center gap-1 rounded-lg pr-1 transition-colors outline-none focus-within:ring-2 focus-within:ring-ring",
                estCourant
                  ? "bg-sidebar-active-bg font-medium text-sidebar-active-fg"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={estCourant ? "page" : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none"
              >
                <Icon
                  aria-hidden
                  className={clsx(
                    "h-5 w-5 shrink-0 transition-colors",
                    estCourant
                      ? "text-accent"
                      : `${iconColor ?? "text-muted-foreground"} group-hover:text-foreground`,
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{label}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {description}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() =>
                  setSectionsOuvertes((prev) => ({ ...prev, [href]: !prev[href] }))
                }
                aria-expanded={estOuvert}
                aria-controls={regionId}
                aria-label={estOuvert ? `Replier ${label}` : `Déplier ${label}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {estOuvert && (
              <ul
                id={regionId}
                className="ml-6 flex flex-col gap-0.5 border-l border-card-border pl-2"
              >
                {children?.map((child, childIndex) => {
                  const enfantBase = cheminBase(child.href);
                  const ongletEnfant = new URLSearchParams(
                    child.href.includes("?") ? (child.href.split("?")[1] ?? "") : "",
                  ).get("tab");
                  const memePage = pathname.startsWith(enfantBase);
                  const estEnfantCourant = ongletEnfant
                    ? memePage && ongletCourant === ongletEnfant
                    : estCheminCourant(pathname, child.href);
                  return (
                    <li key={`${child.href}-${childIndex}`}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        aria-current={estEnfantCourant ? "page" : undefined}
                        className={clsx(
                          "block truncate rounded-md px-3 py-1.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          estEnfantCourant
                            ? "bg-sidebar-active-bg font-medium text-sidebar-active-fg"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function Sidebar({
  className,
  nomEglise = "",
  onNavigate,
}: {
  className?: string;
  nomEglise?: string;
  onNavigate?: () => void;
}) {
  const nomAffiche = nomEglise.trim() || "Église SaaS";
  const initiale = (nomAffiche.trim()[0] ?? "É").toUpperCase();

  return (
    <aside
      className={clsx(
        "flex h-full flex-col overflow-y-auto p-4 bg-card w-full md:h-screen md:w-64 md:flex-shrink-0 md:overflow-hidden md:border-r md:border-neutral-800 md:p-0",
        className ?? "hidden md:flex",
      )}
    >
      {/* 1. Logo & Bouton Fermer */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border pb-4 md:border-sidebar-border md:px-6 md:py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground relative">
          {initiale}
          <span className="absolute -right-2 -bottom-2 h-3 w-3 rounded-full bg-amber-400 border-2 border-card shadow-sm ring-1 ring-primary/30">
            <span className="text-[6px] text-primary-foreground leading-none flex items-center justify-center">•</span>
          </span>
        </div>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">{nomAffiche}</span>
          <span className="text-xs text-muted-foreground">Gestion communautaire</span>
        </span>
      </div>

      <Suspense fallback={null}>
        <NavigationPrincipale onNavigate={onNavigate} />
      </Suspense>


    </aside>
  );
}
