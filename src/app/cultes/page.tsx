import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Church, CircleAlert, Coins } from "lucide-react";
import CulteFormModal from "@/components/cultes/CulteFormModal";
import QueteRapideForm from "@/components/cultes/QueteRapideForm";
import SupprimerCulteButton from "@/components/cultes/SupprimerCulteButton";
import { formatMontant } from "@/lib/membre";
import { prisma } from "@/lib/prisma";
import type { CulteResume } from "@/types/culte";
export const metadata: Metadata = { title: "Cultes & Événements", description: "Planning des cultes et quêtes anonymes associées." };
export const dynamic = "force-dynamic";
function versISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function moisLibelle(cle: string): string {
  const [a, m] = cle.split("-").map(Number);
  return new Date(a, (m ?? 1) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
export default async function CultesPage() {
  let cultes: CulteResume[] = [];
  let erreurBase: string | null = null;
  try {
    const lignes = await prisma.culte.findMany({ orderBy: { date: "asc" } });
    cultes = lignes.map((c) => {
      const moisCle = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, "0")}`;
      return { id: c.id, dateISO: versISO(c.date), dateAffichee: formatDate(c.date), intitule: c.intitule, totalQueteAnonyme: Number(c.totalQueteAnonyme), moisCle, moisLibelle: moisLibelle(moisCle) };
    });
  } catch (e) {
    console.error("Erreur chargement cultes :", e);
    erreurBase = "Impossible de joindre la base. Vérifiez DATABASE_URL puis réessayez.";
  }
  const totalQuetes = cultes.reduce((s, c) => s + c.totalQueteAnonyme, 0);
  const groupes = new Map<string, { libelle: string; cultes: CulteResume[] }>();
  for (const c of cultes) {
    const g = groupes.get(c.moisCle) ?? { libelle: c.moisLibelle, cultes: [] };
    g.cultes.push(c);
    groupes.set(c.moisCle, g);
  }
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Vie de l&apos;église</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Cultes &amp; Événements</h1>
          <p className="text-sm text-muted-foreground">Planning et saisie rapide de la quête anonyme.</p>
        </div>
        <div className="flex items-center gap-3">
          {!erreurBase && (<span className="rounded-full border border-card-border bg-muted px-3 py-1 text-xs text-muted-foreground">{cultes.length} culte(s)</span>)}
          <CulteFormModal />
        </div>
      </header>
      {erreurBase ? (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{erreurBase}</span></div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cultes planifiés</span>
              <span className="text-xl font-semibold tabular-nums text-foreground">{cultes.length}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total des quêtes</span>
              <span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(totalQuetes)}</span>
            </div>
          </section>
          {cultes.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Church className="h-7 w-7 text-muted-foreground" aria-hidden /></span>
              <p className="text-base font-medium text-foreground">Aucun culte planifié</p>
              <p className="max-w-md text-sm text-muted-foreground">Planifiez le premier culte avec le bouton ci-dessus.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {[...groupes.entries()].map(([cle, groupe]) => (
                <section key={cle} aria-label={groupe.libelle} className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent"><CalendarDays className="h-4 w-4" aria-hidden /><span className="capitalize">{groupe.libelle}</span><span className="text-muted-foreground">· {groupe.cultes.length}</span></h2>
                  <ul className="flex flex-col gap-3">
                    {groupe.cultes.map((culte) => (
                      <li key={culte.id} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-foreground">{culte.intitule}</p>
                            <p className="text-xs capitalize text-muted-foreground">{culte.dateAffichee}</p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium tabular-nums text-accent"><Coins className="h-3.5 w-3.5" aria-hidden />{formatMontant(culte.totalQueteAnonyme)}</span>
                        </div>
                        <div className="mt-4 border-t border-card-border pt-4">
                          <QueteRapideForm culteId={culte.id} montantActuel={culte.totalQueteAnonyme} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <CulteFormModal culte={culte} triggerLabel="Modifier" />
                          <SupprimerCulteButton culteId={culte.id} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          <footer className="rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-4 text-sm text-muted-foreground">
            Suivi confidentiel des aides : <Link href="/solidarite" className="font-medium text-accent hover:underline">ouvrir la Solidarité</Link>
          </footer>
        </>
      )}
    </div>
  );
}
