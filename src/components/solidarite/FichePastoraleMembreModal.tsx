"use client";
import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { formatMontant, libelleModePaiement } from "@/lib/membre";
import type { FichePastoraleMembre } from "@/types/solidarite";
type Props = { fiche: FichePastoraleMembre | null; onFermer: () => void; };
export default function FichePastoraleMembreModal({ fiche, onFermer }: Props) {
useEffect(() => {
if (!fiche) return;
const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
window.addEventListener("keydown", onKey);
document.body.style.overflow = "hidden";
return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
}, [fiche, onFermer]);
if (!fiche) return null;
return (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Fiche pastorale">
<button type="button" tabIndex={-1} aria-label="Fermer" onClick={onFermer} className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden" />
<div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
<div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
<div className="flex flex-col gap-1">
<p className="text-xs font-medium uppercase tracking-wide text-accent">Fiche pastorale individuelle</p>
<h2 className="text-lg font-semibold text-foreground">{fiche.prenoms} {fiche.nom}</h2>
<p className="text-xs text-muted-foreground">Classe : {fiche.classe} | Tel : {fiche.telephone}</p>
</div>
<div className="flex items-center gap-2 print:hidden">
<button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
<Printer className="h-3.5 w-3.5" aria-hidden />Imprimer la fiche pastorale
</button>
<button type="button" onClick={onFermer} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" aria-hidden /></button>
</div>
</div>
<div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-2">
<div className="flex flex-col gap-1 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-accent">Total donne a l eglise</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(fiche.totalDonne)} FCFA</span>
<span className="text-xs text-muted-foreground">dont surplus / dons d amour : {formatMontant(fiche.totalSurplus)} FCFA</span>
</div>
<div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total des aides recues</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(fiche.totalAidesRecues)} FCFA</span>
<span className="text-xs text-muted-foreground">{fiche.aidesPercues.length} aide(s) percue(s)</span>
</div>
</div>
<div className="flex flex-col gap-6 overflow-y-auto px-6 pb-6">
<section aria-label="Participations" className="flex flex-col gap-3">
<h3 className="text-sm font-semibold text-foreground">Tableau A — Participations et Cotisations du membre</h3>
{fiche.participations.length === 0 ? (
<p className="rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-xs text-muted-foreground">Aucune participation enregistree.</p>
) : (
<div className="overflow-x-auto rounded-2xl border border-card-border shadow-sm">
<table className="min-w-full text-sm">
<thead>
<tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
<th className="px-4 py-2.5 font-medium">Date</th>
<th className="px-4 py-2.5 font-medium">Evenement / Cotisation</th>
<th className="px-4 py-2.5 text-right font-medium">Part obligatoire</th>
<th className="px-4 py-2.5 text-right font-medium">Don additionnel / Surplus</th>
<th className="px-4 py-2.5 text-right font-medium">Total verse</th>
<th className="px-4 py-2.5 font-medium">Mode de paiement</th>
</tr>
</thead>
<tbody className="divide-y divide-card-border">
{fiche.participations.map((ligne) => (
<tr key={ligne.id} className="hover:bg-muted/40">
<td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{ligne.dateAffichee}</td>
<td className="px-4 py-2.5 font-medium text-foreground">{ligne.evenement}</td>
<td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatMontant(ligne.partObligatoire)}</td>
<td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-emerald-500">{formatMontant(ligne.donAdditionnel)}</td>
<td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">{formatMontant(ligne.totalVerse)}</td>
<td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{libelleModePaiement(ligne.modePaiement)}</td>
</tr>
))}
</tbody>
</table>
</div>
)}
<h3 className="text-sm font-semibold text-foreground">Tableau B — Aides et Decaissements percus</h3>
{fiche.aidesPercues.length === 0 ? (
<p className="rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-xs text-muted-foreground">Aucune aide percue.</p>
) : (
<div className="overflow-x-auto rounded-2xl border border-card-border shadow-sm">
<table className="min-w-full text-sm">
<thead>
<tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
<th className="px-4 py-2.5 font-medium">Date</th>
<th className="px-4 py-2.5 font-medium">Motif / Objet</th>
<th className="px-4 py-2.5 font-medium">Caisse ou Cotisation source</th>
<th className="px-4 py-2.5 text-right font-medium">Montant recu</th>
<th className="px-4 py-2.5 font-medium">Piece justificative</th>
</tr>
</thead>
<tbody className="divide-y divide-card-border">
{fiche.aidesPercues.map((ligne) => (
<tr key={ligne.id} className="hover:bg-muted/40">
<td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{ligne.dateAffichee}</td>
<td className="px-4 py-2.5 font-medium text-foreground">{ligne.motif}</td>
<td className="px-4 py-2.5 text-xs text-muted-foreground">{ligne.caisseOuSource}</td>
<td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">{formatMontant(ligne.montant)}</td>
<td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{ligne.numeroPiece ?? "—"}</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</section>
</div>
</div>
</div>
);
}
