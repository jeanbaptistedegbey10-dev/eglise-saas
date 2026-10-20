"use client";
import { formatMontant } from "@/lib/membre";
import { libelleTypeCotisation } from "@/lib/cotisation";
import type { CotisationRapportOption } from "./types";
import { formatDateCourte } from "./types";
import type { Synthese } from "./classe";
type P = { cotisation: CotisationRapportOption; synthese: Synthese };
export default function RapportCotisationDetailShell({ cotisation, synthese }: P) {
  const prog = synthese.objectif ? Math.min(1, synthese.totalCollecte / synthese.objectif) : 0;
  return (
    <section aria-label="Synthese" className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">{cotisation.nom}</h2>
        <p className="text-xs text-muted-foreground">{libelleTypeCotisation(cotisation.type)} - {cotisation.estCloture ? "Cloturee" : "Ouverte"} - {formatDateCourte(cotisation.dateDebut)} - {formatDateCourte(cotisation.dateFin)}</p>
        {(cotisation.departementNom || cotisation.groupeNom) && (<p className="text-xs text-muted-foreground">{cotisation.departementNom ? `Dept: ${cotisation.departementNom} ` : ""}{cotisation.groupeNom ? `Groupe: ${cotisation.groupeNom}` : ""}</p>)}
      </div>
      <div className="grid grid-cols-1 gap-4 rounded-xl bg-muted/40 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Total collecte</span><span className="text-xl font-semibold tabular-nums">{formatMontant(synthese.totalCollecte)} FCFA</span></div>
        <div className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Objectif</span><span className="text-xl font-semibold tabular-nums">{synthese.objectif != null ? `${formatMontant(synthese.objectif)} FCFA` : "-"}</span></div>
        <div className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Reste</span><span className="text-xl font-semibold tabular-nums">{synthese.reste != null ? `${formatMontant(synthese.reste)} FCFA` : "-"}</span></div>
        <div className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Surplus</span><span className="text-xl font-semibold tabular-nums">{formatMontant(synthese.totalSurplus)} FCFA</span></div>
      </div>
      {synthese.objectif != null && synthese.objectif > 0 && (
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, prog * 100)}%` }} /></div>
      )}
    </section>
  );
}
