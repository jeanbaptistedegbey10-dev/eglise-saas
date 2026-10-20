"use client";
import clsx from "clsx";
import { CalendarDays, HeartHandshake, Target, TrendingUp } from "lucide-react";
import { formatMontant } from "@/lib/membre";
import { libelleTypeCotisation } from "@/lib/cotisation";
import type { CotisationRapportOption, VersementRapportLigne } from "./types";
import { formatDateCourte, numeroRecu } from "./types";
import { classeDe } from "./classe";
import type { Synthese } from "./classe";
type P = { cotisation: CotisationRapportOption; synthese: Synthese; lignes: VersementRapportLigne[]; recherche: string };
export default function RapportCotisationDetail({ cotisation, synthese, lignes, recherche }: P) {
  const prog = synthese.objectif ? Math.min(1, synthese.totalCollecte / synthese.objectif) : 0;
  return (
    <>
      <section aria-label="Synthese" className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{cotisation.nom}</h2>
              <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", cotisation.estCloture ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>{cotisation.estCloture ? "Cloturee" : "Ouverte"}</span>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{libelleTypeCotisation(cotisation.type)}</span>
            </div>
            {(cotisation.departementNom || cotisation.groupeNom) && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {cotisation.departementNom && (<span className="inline-flex items-center rounded-full border border-card-border bg-muted/60 px-2.5 py-1 font-medium text-muted-foreground">Dept : {cotisation.departementNom}</span>)}
                {cotisation.groupeNom && (<span className="inline-flex items-center rounded-full border border-card-border bg-muted/60 px-2.5 py-1 font-medium text-muted-foreground">Groupe : {cotisation.groupeNom}</span>)}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 text-xs text-muted-foreground sm:items-end">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden />{formatDateCourte(cotisation.dateDebut)}{" -> "}{formatDateCourte(cotisation.dateFin)}</span>
            <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" aria-hidden />{cotisation.montantCible != null ? `Cible : ${formatMontant(cotisation.montantCible)} FCFA` : "Sans cible"}{cotisation.montantPlancher != null ? ` - Plancher : ${formatMontant(cotisation.montantPlancher)} FCFA` : ""}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 rounded-xl bg-muted/40 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1"><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total collecte</span><span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(synthese.totalCollecte)} FCFA</span><span className="text-xs text-muted-foreground">{synthese.nombreVersements} vers. - {synthese.nombreParticipants} part.</span></div>
          <div className="flex flex-col gap-1"><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Objectif</span><span className="text-xl font-semibold tabular-nums text-foreground">{synthese.objectif != null ? `${formatMontant(synthese.objectif)} FCFA` : "—"}</span><span className="text-xs text-muted-foreground">{synthese.taux != null ? `${Math.round(synthese.taux * 10) / 10} %` : "libre"}</span></div>
          <div className="flex flex-col gap-1"><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reste</span><span className="text-xl font-semibold tabular-nums text-foreground">{synthese.reste != null ? `${formatMontant(synthese.reste)} FCFA` : "—"}</span><span className="text-xs text-muted-foreground">solde objectif</span></div>
          <div className="flex flex-col gap-1"><span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"><HeartHandshake className="h-3.5 w-3.5" aria-hidden />Surplus</span><span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(synthese.totalSurplus)} FCFA</span><span className="text-xs text-muted-foreground">base : {formatMontant(synthese.totalBase)}</span></div>
        </div>
        {synthese.objectif != null && synthese.objectif > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" aria-hidden />{Math.round(prog * 1000) / 10} %</span><span className="tabular-nums">{formatMontant(synthese.totalCollecte)} / {formatMontant(synthese.objectif)}</span></div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, prog * 100)}%` }} /></div>
          </div>
        )}
      </section>
      <div data-registre="1" />
    </>
  );
}
