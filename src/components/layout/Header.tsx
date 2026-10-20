"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, LogIn, LogOut } from "lucide-react";

import { LIBELLES_ROLE } from "@/lib/utilisateur";

// ---------------------------------------------------------------------------
// En-tête applicatif : logo (mobile), menu utilisateur connecté
// (nom, rôle, avatar + « Se déconnecter ») ou bouton « Se connecter ».
// ---------------------------------------------------------------------------

/** Initiales affichées dans l'avatar (2 lettres max). */
function initiales(nom?: string | null): string {
  if (!nom) return "?";
  const parties = nom.trim().split(/\s+/);
  const lettres = parties.map((p) => p[0]).filter(Boolean).slice(0, 2);
  return (lettres.join("") || "?").toUpperCase();
}

/** Menu déroulant de session : avatar + nom/rôle, action `signOut`. */
export function MenuUtilisateur() {
  const { data: session, status } = useSession();
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function fermer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    function fermerClavier(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", fermerClavier);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", fermerClavier);
    };
  }, [ouvert]);

  if (status === "loading") {
    return (
      <span className="h-9 w-9 animate-pulse rounded-full bg-muted" aria-hidden />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        Se connecter
      </Link>
    );
  }

  const nom = session.user.name ?? session.user.email ?? "Utilisateur";
  const role = session.user.role
    ? (LIBELLES_ROLE[session.user.role] ?? session.user.role)
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        className="flex items-center gap-2 rounded-xl border border-card-border bg-card px-2 py-1.5 text-left shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
          aria-hidden
        >
          {initiales(session.user.name)}
        </span>
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="max-w-36 truncate text-sm font-medium text-foreground">
            {nom}
          </span>
          {role && (
            <span className="max-w-36 truncate text-xs text-muted-foreground">
              {role}
            </span>
          )}
        </span>
        <ChevronDown
          className="h-4 w-4 text-muted-foreground"
          aria-hidden
        />
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-card-border bg-card p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
              aria-hidden
            >
              {initiales(session.user.name)}
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-foreground">
                {nom}
              </span>
              {session.user.email && (
                <span className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </span>
              )}
              {role && (
                <span className="truncate text-xs text-muted-foreground">
                  {role}
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 outline-none transition-colors hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-ring dark:text-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar/90 px-4 py-2.5 backdrop-blur sm:px-8">
      <Link href="/finances" className="flex items-center gap-2 text-sm font-semibold md:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          É
        </span>
        Église SaaS
      </Link>
      <span className="hidden text-sm font-semibold md:block">Église SaaS</span>
      <MenuUtilisateur />
    </header>
  );
}
