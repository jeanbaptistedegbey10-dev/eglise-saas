"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";

import { LIBELLES_ROLE } from "@/lib/utilisateur";

// ---------------------------------------------------------------------------
// Bloc session en bas de la Sidebar : avatar + nom + rôle + bouton
// « Se déconnecter » (`signOut` NextAuth), ou « Se connecter » si anonyme.
// ---------------------------------------------------------------------------

function initiales(nom?: string | null): string {
  if (!nom) return "?";
  const parties = nom.trim().split(/\s+/);
  const lettres = parties.map((p) => p[0]).filter(Boolean).slice(0, 2);
  return (lettres.join("") || "?").toUpperCase();
}

export default function BlocSessionSidebar() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        className="mb-3 flex animate-pulse items-center gap-2.5 rounded-xl border border-card-border bg-card px-3 py-2.5"
        aria-hidden
      >
        <span className="h-9 w-9 rounded-full bg-muted" />
        <span className="flex flex-1 flex-col gap-1.5">
          <span className="h-3 w-2/3 rounded bg-muted" />
          <span className="h-2.5 w-1/2 rounded bg-muted" />
        </span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="mb-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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
    <div className="mb-3 rounded-xl border border-card-border bg-card p-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
          aria-hidden
        >
          {initiales(session.user.name)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
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
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-300"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Se déconnecter
      </button>
    </div>
  );
}
