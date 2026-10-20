"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { CalendarDays, Church, ListChecks, MapPin } from "lucide-react";
import CulteFormModal from "@/components/cultes/CulteFormModal";
import SupprimerCulteButton from "@/components/cultes/SupprimerCulteButton";
import TerminerCulteButton from "@/components/cultes/TerminerCulteButton";
import TacheFormModal from "@/components/cultes/TacheFormModal";
import TacheLigne from "@/components/cultes/TacheLigne";
import { LIBELLES_STATUT_EVENEMENT, type CulteResume, type MembreOption, type TacheResume } from "@/types/culte";
type Filtre = "AVENIR" | "PASSES" | "TOUS";
type Onglet = "CALENDRIER" | "TACHES";
type TacheEtendue = TacheResume & { culteIntitule: string; culteDate: string };
function estPasse(dateISO: string): boolean {
  const j = new Date(); j.setHours(0, 0, 0, 0);
  return new Date(`${dateISO}T00:00:00`) < j;
}
export default function CultesClient({ cultes, membres }: { cultes: CulteResume[]; membres: MembreOption[] }) {
  const [onglet, setOnglet] = useState<Onglet>("CALENDRIER");
  const [filtre, setFiltre] = useState<Filtre>("AVENIR");
  const visibles = useMemo(() => {
    if (filtre === "TOUS") return cultes;
    if (filtre === "PASSES") return cultes.filter((c) => c.statut === "TERMINE" || estPasse(c.dateISO));
    return cultes.filter((c) => c.statut !== "TERMINE" && !estPasse(c.dateISO));
  }, [cultes, filtre]);
  const groupes = useMemo(() => {
    const m = new Map<string, { libelle: string; cultes: CulteResume[] }>();
    for (const c of visibles) {
      const g = m.get(c.moisCle) ?? { libelle: c.moisLibelle, cultes: [] };
      g.cultes.push(c); m.set(c.moisCle, g);
    }
    return [...m.entries()];
  }, [visibles]);
  const tachesTotales = cultes.flatMap((c) => c.taches.map((t) => ({ ...t, culteIntitule: c.intitule, culteDate: c.dateAffichee })));
  const aFaire = tachesTotales.filter((t) => t.statut === "A_FAIRE").length;
  const enCours = tachesTotales.filter((t) => t.statut === "EN_COURS").length;
  const clot = tachesTotales.filter((t) => t.statut === "CLOTUREE").length;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Vues Cultes et Événements">
        <button type="button" role="tab" aria-selected={onglet === "CALENDRIER"} onClick={() => setOnglet("CALENDRIER")} className={clsx("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium", onglet === "CALENDRIER" ? "bg-primary text-primary-foreground" : "border border-card-border bg-card text-muted-foreground hover:text-foreground")}>
          <CalendarDays className="h-4 w-4" aria-hidden />Calendrier & Événements</button>
        <button type="button" role="tab" aria-selected={onglet === "TACHES"} onClick={() => setOnglet("TACHES")} className={clsx("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium", onglet === "TACHES" ? "bg-primary text-primary-foreground" : "border border-card-border bg-card text-muted-foreground hover:text-foreground")}>
          <ListChecks className="h-4 w-4" aria-hidden />Tâches & Responsabilités
          {tachesTotales.length > 0 && (<span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">{aFaire + enCours}/{tachesTotales.length}</span>)}</button>
      </div>
      {onglet === "CALENDRIER" ? <CalendrierVue visibles={visibles} groupes={groupes} filtre={filtre} setFiltre={setFiltre} membres={membres} /> : <TachesVue tachesTotales={tachesTotales} aFaire={aFaire} enCours={enCours} clot={clot} membres={membres} />}
    </div>
  );
}

function CalendrierVue({ visibles, groupes, filtre, setFiltre, membres }: { visibles: CulteResume[]; groupes: [string, { libelle: string; cultes: CulteResume[] }][]; filtre: Filtre; setFiltre: (f: Filtre) => void; membres: MembreOption[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["AVENIR", "PASSES", "TOUS"] as Filtre[]).map((f) => (
          <button key={f} type="button" onClick={() => setFiltre(f)} aria-pressed={filtre === f} className={clsx("rounded-full px-3.5 py-1.5 text-xs font-medium", filtre === f ? "bg-primary text-primary-foreground" : "border border-card-border bg-card text-muted-foreground hover:text-foreground")}>
            {f === "AVENIR" ? "À venir" : f === "PASSES" ? "Passés" : "Tous"}</button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{visibles.length} événement(s)</span>
      </div>
      {visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Church className="h-7 w-7 text-muted-foreground" aria-hidden /></span>
          <p className="text-base font-medium text-foreground">Aucun événement</p>
          <p className="max-w-md text-sm text-muted-foreground">Programmez le premier événement avec le bouton ci-dessus.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groupes.map(([cle, groupe]) => (
            <section key={cle} aria-label={groupe.libelle} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent"><CalendarDays className="h-4 w-4" aria-hidden /><span className="capitalize">{groupe.libelle}</span><span className="text-muted-foreground">· {groupe.cultes.length}</span></h2>
              <ul className="flex flex-col gap-3">
                {groupe.cultes.map((culte) => (
                  <li key={culte.id} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-foreground">{culte.intitule}</p>
                        <p className="text-xs capitalize text-muted-foreground">{culte.dateAffichee}{culte.lieu ? ` · ${culte.lieu}` : ""}</p>
                        {culte.description && (<p className="max-w-2xl text-xs text-muted-foreground">{culte.description}</p>)}
                      </div>
                      <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", culte.statut === "TERMINE" ? "bg-emerald-600/15 text-emerald-500" : "bg-primary/15 text-accent")}>{LIBELLES_STATUT_EVENEMENT[culte.statut]}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      <span>{culte.taches.length} tâche(s) · {culte.taches.filter((t) => t.statut === "CLOTUREE").length} clôturée(s){culte.taches.some((t) => !t.responsable) ? " · responsable manquant" : ""}</span>
                    </div>
                    <div className="mt-3 border-t border-card-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Préparation</p>
                      {culte.taches.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucune tâche — ajoutez Sonorisation, Accueil, Prédication…</p>
                      ) : (
                        <ul className="flex flex-col gap-2">{culte.taches.map((t) => (<TacheLigne key={t.id} tache={t} membres={membres} />))}</ul>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <CulteFormModal culte={culte} triggerLabel="Modifier" />
                      {culte.statut !== "TERMINE" && (<TerminerCulteButton culteId={culte.id} />)}
                      <TacheFormModal culteId={culte.id} culteIntitule={culte.intitule} membres={membres} />
                      <SupprimerCulteButton culteId={culte.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
// PART3
function TachesVue({ tachesTotales, aFaire, enCours, clot, membres }: { tachesTotales: TacheEtendue[]; aFaire: number; enCours: number; clot: number; membres: MembreOption[] }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Total", tachesTotales.length], ["À faire", aFaire], ["En cours", enCours], ["Clôturées", clot]].map(([lib, n]) => (
          <div key={String(lib)} className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{lib}</span>
            <span className="text-xl font-semibold tabular-nums text-foreground">{n}</span>
          </div>
        ))}
      </section>
      {tachesTotales.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><ListChecks className="h-6 w-6 text-muted-foreground" aria-hidden /></span>
          <p className="text-sm font-medium text-foreground">Aucune tâche</p>
          <p className="max-w-md text-xs text-muted-foreground">Ouvrez l&apos;onglet Calendrier puis « Ajouter une tâche » sur un événement.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tachesTotales.map((t) => (
            <li key={t.id}>
              <p className="mb-1 text-xs text-muted-foreground">{t.culteIntitule} · <span className="capitalize">{t.culteDate}</span></p>
              <ul><TacheLigne tache={t} membres={membres} /></ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
