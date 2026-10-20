"use client";

import { Menu } from "lucide-react";

// ---------------------------------------------------------------------------
// En-tête mobile unique : logo + nom dynamique de l'église à gauche,
// bouton Hamburger à droite pour ouvrir le tiroir latéral.
// Rendu uniquement sur mobile (`md:hidden`).
// ---------------------------------------------------------------------------

export default function HeaderMobile({
  nomEglise,
  onOuvrir,
}: {
  nomEglise: string;
  onOuvrir: () => void;
}) {
  const nomAffiche = nomEglise.trim() || "Église SaaS";
  const initiale = (nomAffiche.trim()[0] ?? "É").toUpperCase();

  return (
    <div className="flex items-center justify-between border-b bg-card p-4 md:hidden">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
          aria-hidden
        >
          {initiale}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">
            {nomAffiche}
          </span>
          <span className="text-xs text-muted-foreground">
            Gestion communautaire
          </span>
        </span>
      </span>
      <button
        type="button"
        onClick={onOuvrir}
        aria-label="Ouvrir le menu de navigation"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
