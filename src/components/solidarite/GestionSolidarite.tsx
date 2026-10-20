"use client";
import { useMemo, useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import { formatMontant } from "@/lib/membre";
import type { MembreOption } from "@/types/solidarite";
export type SolidariteMembreItem = { membreId: string; nom: string; prenoms: string; telephone: string; exerciceTotal: number; exerciceNombre: number; totalHistorique: number; nombreHistorique: number; aidesExercice: number; aidesHistorique: number; lignesExercice: { id: string; date: string; evenement: string; montant: number }[]; lignesHistorique: { id: string; date: string; evenement: string; montant: number }[]; };
type P = { membres: MembreOption[]; items: SolidariteMembreItem[]; exerciceLibelle: string; };
const sel = "h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary";
export default function GestionSolidarite({ membres, items, exerciceLibelle }: P) {
  const [id, setId] = useState(""); const [open, setOpen] = useState(false);
  const selM = useMemo(() => items.find((i) => i.membreId === id) ?? null, [items, id]);
  const nomSel = useMemo(() => membres.find((m) => m.id === id) ?? null, [membres, id]);
  return (
    <section aria-label="Rapport individuel" className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">Rapport individuel de participation — solidarite</h2>
        <p className="text-xs text-muted-foreground">Exercice en cours + cumul total depuis l adhesion.</p>
      </div>
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
          <label htmlFor="sol-membre" className="text-xs font-medium text-muted-foreground">Membre</label>
          <select id="sol-membre" value={id} onChange={(e) => setId(e.target.value)} className={sel}>
            <option value="">Sélectionner un membre…</option>
            {membres.map((m) => (<option key={m.id} value={m.id}>{m.prenoms} {m.nom} — {m.telephone}</option>))}
          </select>
        </div>
        <button type="button" disabled={!selM} onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
          <FileText className="h-4 w-4" aria-hidden />Générer le rapport
        </button>
      </div>
      {open && selM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Rapport individuel">
          <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 print:hidden" />
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Rapport individuel de participation</p>
                <h3 className="text-lg font-semibold text-foreground">{selM.prenoms} {selM.nom}</h3>
                <p className="text-xs text-muted-foreground">Tel : {((nomSel?.telephone ?? selM.telephone) ?? "—")} — Exercice : {exerciceLibelle}</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><Printer className="h-3.5 w-3.5" aria-hidden />Imprimer / Exporter PDF</button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" aria-hidden /></button>
              </div>
            </div>
            <div className="flex flex-col gap-5 overflow-y-auto px-6 py-4">
              <section aria-label="Exercice en cours" className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-foreground">1 — Exercice en cours ({exerciceLibelle})</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border px-4 py-3"><p className="text-xs text-muted-foreground">Total verse</p><p className="text-lg font-semibold tabular-nums">{formatMontant(selM.exerciceTotal)} FCFA</p></div>
                  <div className="rounded-xl border px-4 py-3"><p className="text-xs text-muted-foreground">Aides recues</p><p className="text-lg font-semibold tabular-nums">{formatMontant(selM.aidesExercice)} FCFA</p></div>
                  <div className="rounded-xl border px-4 py-3"><p className="text-xs text-muted-foreground">Versements</p><p className="text-lg font-semibold tabular-nums">{selM.exerciceNombre}</p></div>
                </div>
              </section>
              <section aria-label="Historique total" className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-foreground">2 — Cumul total depuis l adhesion</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3"><p className="text-xs text-muted-foreground">Cumul verse</p><p className="text-lg font-semibold tabular-nums">{formatMontant(selM.totalHistorique)} FCFA</p></div>
                  <div className="rounded-xl border px-4 py-3"><p className="text-xs text-muted-foreground">Cumul aides</p><p className="text-lg font-semibold tabular-nums">{formatMontant(selM.aidesHistorique)} FCFA</p></div>
                  <div className="rounded-xl border px-4 py-3"><p className="text-xs text-muted-foreground">Nb total</p><p className="text-lg font-semibold tabular-nums">{selM.nombreHistorique}</p></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}