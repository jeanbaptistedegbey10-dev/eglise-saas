"use client";
import { useEffect, useMemo, useState } from "react";
import { FileText, Printer, Search, X } from "lucide-react";
import { formatMontant } from "@/lib/membre";
export type RecurrenteLigne = { membreId: string; nom: string; prenoms: string; telephone: string | null; cotisationId: string; cotisationNom: string; attendu: number; paye: number; du: number; etat: string; versements: { id: string; date: string | null; montant: number }[]; };
export type RecurrenteProps = { lignes: RecurrenteLigne[]; exerciceLibelle: string; };
const sel = "h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary";
const lab = "text-xs font-medium text-muted-foreground";
function badge(e: string) { if (e === "A_JOUR") return "bg-emerald-500/15 text-emerald-300"; if (e === "PARTIEL") return "bg-amber-500/15 text-amber-300"; return "bg-red-500/15 text-red-300"; }
function lib(e: string) { if (e === "A_JOUR") return "À jour"; if (e === "PARTIEL") return "Partiel"; return "En retard"; }
export default function SuiviRecurrentes({ lignes, exerciceLibelle }: RecurrenteProps) {
  const [q, setQ] = useState(""); const [etat, setEtat] = useState("tous"); const [selId, setSelId] = useState<string | null>(null);
  const filtrees = useMemo(() => { const t = q.trim().toLowerCase(); return lignes.filter((l) => { if (t !== "" && !`${l.prenoms} ${l.nom}`.toLowerCase().includes(t)) return false; if (etat === "A_JOUR" && l.etat !== "A_JOUR") return false; if (etat === "EN_RETARD" && l.etat !== "EN_RETARD") return false; if (etat === "PARTIEL" && l.etat !== "PARTIEL") return false; return true; }); }, [lignes, q, etat]);
  const selM = useMemo(() => lignes.find((l) => l.membreId === selId) ?? null, [lignes, selId]);
  useEffect(() => { if (!selM) return; const f = (e: KeyboardEvent) => { if (e.key === "Escape") setSelId(null); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [selM]);
  return (
    <section aria-label="Suivi mensuel des récurrentes" className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">Suivi mensuel des récurrentes — {filtrees.length} membre(s)</h2>
        <p className="text-xs text-muted-foreground">{exerciceLibelle}</p>
      </div>
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="flex min-w-52 flex-1 flex-col gap-1.5">
          <label htmlFor="rec-recherche" className={lab}>Recherche membre</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id="rec-recherche" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom / prénom…" className="h-10 w-full rounded-lg border border-card-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
        </div>
        <div className="flex min-w-44 flex-col gap-1.5">
          <label htmlFor="rec-etat" className={lab}>État de paiement</label>
          <select id="rec-etat" value={etat} onChange={(e) => setEtat(e.target.value)} className={sel}>
            <option value="tous">Tous</option><option value="A_JOUR">À jour</option><option value="EN_RETARD">En retard</option><option value="PARTIEL">Partiel</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Membre</th><th className="px-4 py-3 font-medium">Cotisation</th><th className="px-4 py-3 text-right font-medium">Attendu</th><th className="px-4 py-3 text-right font-medium">Payé</th><th className="px-4 py-3 text-right font-medium">Dû</th><th className="px-4 py-3 font-medium">État</th><th className="px-4 py-3 text-right font-medium no-print">Rapport</th>
          </tr></thead>
          <tbody className="divide-y divide-card-border">
            {filtrees.map((l) => (
              <tr key={l.membreId + l.cotisationId} className="hover:bg-muted/40">
                <td className="px-4 py-3"><span className="font-medium text-foreground">{l.prenoms} {l.nom}</span>{l.telephone ? (<span className="block text-xs tabular-nums text-muted-foreground">{l.telephone}</span>) : null}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.cotisationNom}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatMontant(l.attendu)} FCFA</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">{formatMontant(l.paye)} FCFA</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-400">{formatMontant(l.du)} FCFA</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badge(l.etat)}`}>{lib(l.etat)}</span></td>
                <td className="px-4 py-3 text-right no-print"><button type="button" onClick={() => setSelId(l.membreId)} className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><FileText className="h-3.5 w-3.5" aria-hidden />Rapport par personne</button></td>
              </tr>
            ))}
            {filtrees.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun membre avec ces filtres.</td></tr>)}
          </tbody>
        </table>
      </div>
      {selM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Rapport par personne">
          <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => setSelId(null)} className="absolute inset-0 bg-black/60 print:hidden" />
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Rapport individuel — récurrentes</p>
                <h3 className="text-lg font-semibold text-foreground">{selM.prenoms} {selM.nom}</h3>
                <p className="text-xs text-muted-foreground">Exercice : {exerciceLibelle} — {selM.cotisationNom}</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><Printer className="h-3.5 w-3.5" aria-hidden />Imprimer / Exporter PDF</button>
                <button type="button" onClick={() => setSelId(null)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" aria-hidden /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-3">
              <div className="rounded-xl border border-card-border px-4 py-3"><p className="text-xs text-muted-foreground">Attendu</p><p className="text-lg font-semibold tabular-nums">{formatMontant(selM.attendu)} FCFA</p></div>
              <div className="rounded-xl border border-card-border px-4 py-3"><p className="text-xs text-muted-foreground">Payé</p><p className="text-lg font-semibold tabular-nums text-emerald-500">{formatMontant(selM.paye)} FCFA</p></div>
              <div className="rounded-xl border border-card-border px-4 py-3"><p className="text-xs text-muted-foreground">Dû</p><p className="text-lg font-semibold tabular-nums text-red-400">{formatMontant(selM.du)} FCFA</p></div>
            </div>
            <div className="overflow-y-auto px-6 pb-6">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-card-border text-left text-xs uppercase text-muted-foreground"><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 text-right font-medium">Montant</th></tr></thead>
                <tbody className="divide-y divide-card-border">
                  {selM.versements.map((v) => (<tr key={v.id}><td className="px-3 py-2 text-xs text-muted-foreground">{(v.date ?? "—")}</td><td className="px-3 py-2 text-right tabular-nums">{formatMontant(v.montant)} FCFA</td></tr>))}
                  {selM.versements.length === 0 && (<tr><td colSpan={2} className="px-3 py-6 text-center text-xs text-muted-foreground">Aucune cotisation payée sur l exercice.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
