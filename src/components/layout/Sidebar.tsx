"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  type LucideIcon,
  HeartHandshake,
  LayoutDashboard,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Tableau de bord",
    description: "Vue d'ensemble",
    icon: LayoutDashboard,
  },
  {
    href: "/membres",
    label: "Communauté",
    description: "Membres & familles",
    icon: Users,
  },
  {
    href: "/finances",
    label: "Finances",
    description: "Cotisations & quêtes",
    icon: Wallet,
  },
  {
    href: "/cultes",
    label: "Cultes & Événements",
    description: "Calendrier du culte",
    icon: CalendarDays,
  },
  {
    href: "/solidarite",
    label: "Solidarité",
    description: "Aides & suivi pastoral",
    icon: HeartHandshake,
  },
  {
    href: "/rapports",
    label: "Rapports & Clôture",
    description: "Bilans & clôtures",
    icon: ClipboardCheck,
  },
];

function isCurrentPath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          É
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            Église SaaS
          </span>
          <span className="text-xs text-muted-foreground">
            Gestion communautaire
          </span>
        </span>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 p-3"
        aria-label="Navigation principale"
      >
        {NAV_ITEMS.map(({ href, label, description, icon: Icon }) => {
          const isCurrent = isCurrentPath(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent ? "page" : undefined}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCurrent
                  ? "bg-sidebar-active-bg font-medium text-sidebar-active-fg"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                aria-hidden
                className={clsx(
                  "h-5 w-5 shrink-0 transition-colors",
                  isCurrent
                    ? "text-accent"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{label}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Apparence</span>
          <ThemeToggle />
        </div>
        <Link
          href="/finances/baremes"
          className="group flex items-center gap-2 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings2 className="h-3.5 w-3.5 text-accent" aria-hidden />
          Exercice & barèmes : configurer
        </Link>
      </div>
    </aside>
  );
}
