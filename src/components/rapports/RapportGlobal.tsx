"use client";
import { Wallet } from "lucide-react";
import clsx from "clsx";
import { formatMontant } from "@/lib/membre";
import type { KpiExercice } from "./types";
import { formatDateCourte } from "./types";
export type LigneLivre = {
  membreId: string; nom: string; prenoms: string; telephone: string | null;
  classe: string; total: number; surplus: number; nombre: number; dernier: string | null;
};
type P = { kpi: KpiExercice; exerciceLibelle: string; typeLabel: string; lignes: LigneLivre[] };
export default function RapportGlobal({ kpi, exerciceLibelle, typeLabel, lignes }: P) {
  return (
    <>
      <section aria-label="KPI" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Wallet className="h-3.5 w-3.5" aria-hidden />Total Encaisse</span>
          <span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(kpi.totalEncaisse)} FCFA</span>
          <span className="text-xs text-muted-foreground">{kpi.nombreVersements} versements - {exerciceLibelle}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Decaisse</span>
          <span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(kpi.totalDecaisse)} FCFA</span>
          <span className="text-xs text-muted-foreground">depenses exercice</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Solde Net</span>
          <span className={clsx("text-xl font-semibold tabular-nums", kpi.soldeNet >= 0 ? "text-foreground" : "text-red-500")}>{formatMontant(kpi.soldeNet)} FCFA</span>
          <span className="text-xs text-muted-foreground">encaisse - decaisse</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contributeurs</span>
          <span className="text-xl font-semibold tabular-nums text-foreground">{kpi.nombreContributeurs}</span>
          <span className="text-xs text-muted-foreground">fideles ayant verse</span>
        </div>
      </section>
      <section aria-label="Grand livre" className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-foreground">Grand livre - {lignes.length} membres</h2>
          <p className="text-xs text-muted-foreground">{typeLabel}</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Fidele</th><th className="px-5 py-3 font-medium">Classe</th><th className="px-5 py-3 text-right font-medium">Vers.</th><th className="px-5 py-3 text-right font-medium">Total</th><th className="px-5 py-3 text-right font-medium">Surplus</th><th className="px-5 py-3 text-right font-medium">Dernier</th>
            </tr></thead>
            <tbody className="divide-y divide-card-border">
              {lignes.map((l) => (
                <tr key={l.membreId} className="transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3"><span className="font-medium text-foreground">{l.prenoms} {l.nom}</span>{l.telephone && (<span className="block text-xs tabular-nums text-muted-foreground">{l.telephone}</span>)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{l.classe}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{l.nombre}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">{formatMontant(l.total)} FCFA</td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{l.surplus > 0 ? `+${formatMontant(l.surplus)}` : "-"}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{formatDateCourte(l.dernier)}</td>
                </tr>
              ))}
              {lignes.length === 0 && (<tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">Aucun participant avec ces filtres.</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
