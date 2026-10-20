"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CalendarClock, HandCoins } from "lucide-react";

export type AlerteItem = { id: string; titre: string; detail: string; href: string };
export type AlertesResume = { cotisationsEnRetard: AlerteItem[]; evenementsNonPrepares: AlerteItem[] };

export default function HeaderNotifications({ alertes }: { alertes: AlertesResume }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Nombre total d'alertes (retards de versement + événements à préparer).
  const total = alertes.cotisationsEnRetard.length + alertes.evenementsNonPrepares.length;

  // Fermeture au clic extérieur + Échap. Aucun polling, aucun refresh,
  // aucun appel fetch('/api/auth/session') : l'état local ne peut pas
  // déclencher d'effets de bord côté client. La session côté serveur est
  // vérifiée au niveau des routes (NextAuth) et non par polling.
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", clavier);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", clavier);
    };
  }, [ouvert]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-haspopup="menu" aria-expanded={ouvert} aria-label={`Alertes (${total})`} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-card-border bg-card text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <Bell className="h-4 w-4" aria-hidden />
        {total > 0 && (<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{total > 9 ? "9+" : total}</span>)}
      </button>
      {ouvert && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] rounded-2xl border border-card-border bg-card p-3 shadow-xl">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centre d&apos;alertes</p>
          {total === 0 ? (<p className="rounded-xl bg-muted/50 px-3 py-3 text-xs text-muted-foreground">Aucune alerte : cotisations à jour et événements préparés.</p>) : (
            <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
              {alertes.cotisationsEnRetard.length > 0 && (
                <section className="flex flex-col gap-1.5">
                  <h3 className="flex items-center gap-1.5 px-1 text-xs font-semibold text-foreground"><HandCoins className="h-3.5 w-3.5 text-amber-500" aria-hidden />Versements en retard ({alertes.cotisationsEnRetard.length})</h3>
                  <ul className="flex flex-col gap-1">{alertes.cotisationsEnRetard.slice(0, 5).map((a) => (
                    <li key={a.id}><Link href={a.href} onClick={() => setOuvert(false)} className="block rounded-xl border border-card-border bg-background/60 px-3 py-2 hover:bg-muted"><span className="block truncate text-xs font-medium text-foreground">{a.titre}</span><span className="block truncate text-[11px] text-muted-foreground">{a.detail}</span></Link></li>
                  ))}</ul>
                </section>
              )}
              {alertes.evenementsNonPrepares.length > 0 && (
                <section className="flex flex-col gap-1.5">
                  <h3 className="flex items-center gap-1.5 px-1 text-xs font-semibold text-foreground"><CalendarClock className="h-3.5 w-3.5 text-accent" aria-hidden />Événements à préparer — 7 jours ({alertes.evenementsNonPrepares.length})</h3>
                  <ul className="flex flex-col gap-1">{alertes.evenementsNonPrepares.slice(0, 5).map((a) => (
                    <li key={a.id}><Link href={a.href} onClick={() => setOuvert(false)} className="block rounded-xl border border-card-border bg-background/60 px-3 py-2 hover:bg-muted"><span className="block truncate text-xs font-medium text-foreground">{a.titre}</span><span className="block truncate text-[11px] text-muted-foreground">{a.detail}</span></Link></li>
                  ))}</ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
