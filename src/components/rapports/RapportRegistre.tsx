"use client";
import { formatMontant } from "@/lib/membre";
import type { VersementRapportLigne } from "./types";
import { formatDateCourte, numeroRecu } from "./types";
import { classeDe } from "./classe";
type P = { lignes: VersementRapportLigne[]; recherche: string };
export default function RapportRegistre({ lignes, recherche }: P) {
  return (
    <section aria-label="Registre" className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-foreground">Registre des contributeurs - {lignes.length} lignes</h3>
        <p className="text-xs text-muted-foreground">Defilement vertical, recherche instantanee.</p>
      </div>
      <div className="max-h-96 overflow-y-auto rounded-xl border border-card-border">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Fidele</th>
              <th className="px-4 py-2.5 font-medium">Classe</th>
              <th className="px-4 py-2.5 text-right font-medium">Part obl.</th>
              <th className="px-4 py-2.5 text-right font-medium">Surplus</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
              <th className="px-4 py-2.5 text-right font-medium">Recu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {lignes.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-muted/40">
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">{formatDateCourte(v.dateEffective ?? v.dateVersement)}</td>
                <td className="px-4 py-2.5"><span className="font-medium text-foreground">{v.estAnonyme || !v.membreId ? "Don anonyme" : `${v.membrePrenoms} ${v.membreNom}`}</span></td>
                <td className="px-4 py-2.5 text-muted-foreground">{v.estAnonyme || !v.membreId ? "-" : classeDe(v)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{formatMontant(v.montantBase)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{v.surplus > 0 ? `+${formatMontant(v.surplus)}` : "-"}</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground">{formatMontant(v.montant)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">{numeroRecu(v.id)}</td>
              </tr>
            ))}
            {lignes.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun versement{recherche.trim() ? " pour cette recherche" : ""}.</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
