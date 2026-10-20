"use client";
import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Building2, Check, CircleAlert, LoaderCircle, Pencil, X } from "lucide-react";
import { enregistrerDepartement } from "@/actions/departements";
import { initialOrganisationFormState, nomCompletMembre } from "@/types/organisation";
import type { DepartementEditable, MembreOptionOrganisation } from "@/types/organisation";
import { INPUT_CLS, Err } from "./ui";
type Props = { membres: MembreOptionOrganisation[]; departement?: DepartementEditable | null; triggerLabel?: string };
export default function DepartementFormModal({ membres, departement, triggerLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(enregistrerDepartement, initialOrganisationFormState);
  const [bureau, setBureau] = useState(departement?.aUnBureau ?? false);
  useEffect(() => { if (etat.success) { setOpen(false); router.refresh(); } }, [etat, router]);
  useEffect(() => { if (open) setBureau(departement?.aUnBureau ?? false); }, [open, departement]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open ]);
  const err = (c: string) => etat.fieldErrors[c]?.[0];
  const btn = departement ? "secondary" : "primary";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={clsx("inline-flex items-center gap-2 rounded-xl text-sm", btn === "primary" ? "bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90" : "border border-card-border bg-card px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground")}>
        {departement ? <Pencil className="h-4 w-4" aria-hidden /> : <Building2 className="h-4 w-4" aria-hidden />}{triggerLabel ?? (departement ? "Modifier" : "Nouveau département")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div><p className="text-xs font-medium uppercase tracking-wide text-accent">Organisation</p>
              <h2 className="text-lg font-semibold text-foreground">{departement ? "Modifier le département" : "Nouveau département"}</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <form action={formAction} className="flex flex-col gap-4 px-6 py-5">
              {departement && <input type="hidden" name="id" defaultValue={departement.id} />}
              {!etat.success && etat.message && (<div role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{etat.message}</span></div>)}
              <div className="flex flex-col gap-1.5"><label htmlFor="dep-nom" className="text-sm font-medium text-foreground">Nom du département *</label>
                <input id="dep-nom" name="nom" required maxLength={120} defaultValue={departement?.nom ?? ""} placeholder="Ex. Jeunesse" className={clsx(INPUT_CLS, err("nom") && "border-red-500/70")} />
                <Err msg={err("nom")} /></div>
              <div className="flex flex-col gap-1.5"><label htmlFor="dep-desc" className="text-sm font-medium text-foreground">Description</label>
                <textarea id="dep-desc" name="description" rows={3} maxLength={500} defaultValue={departement?.description ?? ""} placeholder="Mission, périmètre…" className="flex w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" /></div>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-card-border bg-muted/40 px-4 py-3">
                <span className="text-sm"><span className="font-medium text-foreground">Ce département a-t-il un bureau ?</span><br /><span className="text-xs text-muted-foreground">Active la sélection des membres du bureau.</span></span>
                <input type="checkbox" name="aUnBureau" checked={bureau} onChange={(e) => setBureau(e.target.checked)} className="h-5 w-5 accent-violet-600" />
              </label>
              <div className="flex flex-col gap-1.5"><label htmlFor="dep-resp" className="text-sm font-medium text-foreground">Responsable</label>
                <select id="dep-resp" name="responsableId" defaultValue={departement?.responsableId ?? ""} className={INPUT_CLS}>
                  <option value="">Aucun responsable</option>
                  {membres.map((m) => (<option key={m.id} value={m.id}>{nomCompletMembre(m)}</option>))}
                </select>
                <Err msg={err("responsableId")} /></div>
              {bureau && (
                <div className="flex flex-col gap-1.5"><span className="text-sm font-medium text-foreground">Membres du bureau</span>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-card-border bg-background p-2">
                    {membres.map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60">
                        <input type="checkbox" name="bureauIds" value={m.id} defaultChecked={departement?.bureauIds.includes(m.id)} className="h-4 w-4 accent-violet-600" />
                        <span className="text-foreground">{nomCompletMembre(m)}</span>
                      </label>
                    ))}
                  </div>
                  <Err msg={err("bureauIds")} /></div>
              )}
              <div className="flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4 -mx-6 -mb-5">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
                <button type="submit" disabled={enCours} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {enCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}{enCours ? "…" : departement ? "Mettre à jour" : "Créer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
