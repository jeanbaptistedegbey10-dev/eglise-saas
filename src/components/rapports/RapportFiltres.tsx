"use client";
import { Printer, RotateCcw, Search } from "lucide-react";
import { TOUTES, TYPES_FILTRE } from "./types";
import type { CotisationRapportOption, ExerciceSelectOption } from "./types";
type P = {
  exercices: ExerciceSelectOption[]; exerciceId: string;
  typeFiltre: string; cotisationId: string; recherche: string;
  cotisationsDuType: CotisationRapportOption[];
  onExercice: (id: string) => void; onType: (t: string) => void;
  onCotisation: (id: string) => void; onRecherche: (v: string) => void; onReset: () => void;
};
const sel = "h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary";
const lab = "text-xs font-medium text-muted-foreground";
export default function RapportFiltres(p: P) {
  return (
    <section aria-label="Filtres du rapport" className="no-print flex flex-wrap items-center gap-3 w-full rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm xl:flex-row xl:items-end xl:gap-3">
      <div className="flex min-w-44 flex-col gap-1.5 xl:w-52">
        <label htmlFor="rapport-exercice" className={lab}>Exercice</label>
        <select id="rapport-exercice" value={p.exerciceId} onChange={(e) => p.onExercice(e.target.value)} className={sel}>
          <option value="">Tous les exercices (global — récurrentes)</option>
          {p.exercices.map((e) => (<option key={e.id} value={e.id}>{e.libelle}{e.cloture ? " (cloture)" : ""}</option>))}
        </select>
      </div>
      <div className="flex min-w-44 flex-col gap-1.5 xl:w-56">
        <label htmlFor="rapport-type" className={lab}>Type</label>
        <select id="rapport-type" value={p.typeFiltre} onChange={(e) => p.onType(e.target.value)} className={sel}>
          {TYPES_FILTRE.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
        </select>
      </div>
      <div className="flex min-w-52 flex-col gap-1.5 xl:flex-1">
        <label htmlFor="rapport-cotisation" className={lab}>Cotisation <span className="font-normal opacity-70">({p.cotisationsDuType.length})</span></label>
        <select id="rapport-cotisation" value={p.cotisationId} onChange={(e) => p.onCotisation(e.target.value)} className={sel}>
          <option value={TOUTES}>Toutes les cotisations</option>
          {p.cotisationsDuType.map((c) => (<option key={c.id} value={c.id}>{c.nom}{c.estCloture ? " — cloturee" : ""}</option>))}
        </select>
      </div>
      <div className="flex min-w-44 flex-col gap-1.5 xl:w-64">
        <label htmlFor="rapport-recherche" className={lab}>Recherche membre</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input id="rapport-recherche" type="search" value={p.recherche} onChange={(e) => p.onRecherche(e.target.value)} placeholder="Nom, prenom… (instantane)" className="h-10 w-full rounded-lg border border-card-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" />
        </div>
      </div>
      <div className="flex items-end gap-2 xl:shrink-0">
        <button type="button" onClick={p.onReset} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-card-border bg-background px-4 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground">
          <RotateCcw className="h-4 w-4" aria-hidden />Reinitialiser les filtres
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex shrink-0 min-w-fit items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:opacity-90">
          <Printer className="h-4 w-4" aria-hidden />Imprimer le rapport
        </button>
      </div>
    </section>
  );
}
