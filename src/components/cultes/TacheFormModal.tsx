"use client";
import { useActionState, useEffect, useState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, LoaderCircle, Plus, X } from "lucide-react";
import { creerTacheEvenement } from "@/actions/taches";
import { initialCulteFormState, type MembreOption } from "@/types/culte";
const SUGGESTIONS = ["Sonorisation","Accueil","Prédication","Louange","Intercession","Protocole","Médias"];
const INPUT = "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";
export default function TacheFormModal({ culteId, culteIntitule, membres }: { culteId: string; culteIntitule: string; membres: MembreOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(creerTacheEvenement, initialCulteFormState);
  useResetAuChangement(etat, () => {
    if (etat.success) setOpen(false);
  });
  useEffect(() => {
    if (etat.success) router.refresh();
  }, [etat]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <Plus className="h-3.5 w-3.5" aria-hidden />Ajouter une tâche
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div><p className="text-xs font-medium uppercase tracking-wide text-accent">Tâches</p>
              <h2 className="text-lg font-semibold text-foreground">Nouvelle tâche</h2>
              <p className="text-xs text-muted-foreground">{culteIntitule}</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <form action={formAction} className="flex flex-col gap-4 px-6 py-5">
              <input type="hidden" name="culteId" defaultValue={culteId} />
              {!etat.success && etat.message && (<div role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{etat.message}</span></div>)}
              <div className="flex flex-col gap-1.5"><label htmlFor={`tt-${culteId}`} className="text-sm font-medium text-foreground">Tâche*</label>
                <input id={`tt-${culteId}`} name="titre" required maxLength={120} list={`sg-${culteId}`} placeholder="Ex. Sonorisation" className={INPUT} />
                <datalist id={`sg-${culteId}`}>{SUGGESTIONS.map((s) => (<option key={s} value={s} />))}</datalist></div>
              <div className="flex flex-col gap-1.5"><label htmlFor={`tr-${culteId}`} className="text-sm font-medium text-foreground">Responsable</label>
                <select id={`tr-${culteId}`} name="responsableMembreId" defaultValue="" className={INPUT}>
                  <option value="">— Non assigné —</option>
                  {membres.map((m) => (<option key={m.id} value={m.id}>{m.nomComplet}</option>))}
                </select></div>
              <div className="flex flex-col gap-1.5"><label htmlFor={`td-${culteId}`} className="text-sm font-medium text-foreground">Détails</label>
                <textarea id={`td-${culteId}`} name="description" rows={2} maxLength={500} placeholder="Consignes, horaires…" className="flex w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" /></div>
              <div className="-mx-6 -mb-5 flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
                <button type="submit" disabled={enCours} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {enCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}{enCours ? "…" : "Créer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
