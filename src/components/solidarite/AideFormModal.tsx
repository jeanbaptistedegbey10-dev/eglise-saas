"use client";
import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, CircleAlert, HeartHandshake, LoaderCircle, X } from "lucide-react";
import { enregistrerAide } from "@/actions/solidarite";
import { initialSolidariteFormState, type AideResume, type MembreOption } from "@/types/solidarite";
const INPUT = "flex w-full rounded-lg border border-card-border bg-background px-3 h-10 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";
type Props = { triggerLabel?: string; membres: MembreOption[]; aide?: AideResume | null; membreIdFixe?: string | null; dateInitiale: string };
export default function AideFormModal({ triggerLabel, membres, aide, membreIdFixe, dateInitiale }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(enregistrerAide, initialSolidariteFormState);
  useEffect(() => { if (etat.success) { setOpen(false); router.refresh(); } }, [etat, router]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open ]);
  const err = (c: string) => etat.fieldErrors[c]?.[0];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={clsx("inline-flex items-center gap-2 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-ring", aide ? "border border-card-border bg-card px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground" : "bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90")}>
        <HeartHandshake className="h-4 w-4" aria-hidden />{triggerLabel ?? (aide ? "Modifier" : "Nouvelle aide")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div><p className="text-xs font-medium uppercase tracking-wide text-accent">Solidarité</p>
              <h2 className="text-lg font-semibold text-foreground">{aide ? "Modifier l'aide" : "Enregistrer une aide"}</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <form action={formAction} className="flex flex-col gap-4 px-6 py-5">
              {aide && <input type="hidden" name="id" defaultValue={aide.id} />}
              {membreIdFixe && <input type="hidden" name="beneficiaireMembreId" defaultValue={membreIdFixe} />}
              {!etat.success && etat.message && (<div role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{etat.message}</span></div>)}
              {!membreIdFixe && (
                <div className="flex flex-col gap-1.5"><label htmlFor="aide-membre" className="text-sm font-medium text-foreground">Bénéficiaire (optionnel)</label>
                  <select id="aide-membre" name="beneficiaireMembreId" defaultValue={aide?.beneficiaireMembreId ?? ""} className={INPUT}>
                    <option value="">Aide externe / anonyme</option>
                    {membres.map((m) => (<option key={m.id} value={m.id}>{m.prenoms} {m.nom}</option>))}
                  </select>
                  <p className="text-xs text-muted-foreground">Vide = non membre ou anonyme.</p></div>
              )}
              <div className="flex flex-col gap-1.5"><label htmlFor="aide-montant" className="text-sm font-medium text-foreground">Montant ou nature*</label>
                <input id="aide-montant" name="montantOuNature" type="text" maxLength={200} required defaultValue={aide?.montantOuNature ?? ""} placeholder="Ex. 25000 ou Panier de denrées" className={clsx(INPUT, err("montantOuNature") && "border-red-500/70")} />
                {err("montantOuNature") && <p className="text-xs text-red-400">{err("montantOuNature")}</p>}</div>
              <div className="flex flex-col gap-1.5"><label htmlFor="aide-motif" className="text-sm font-medium text-foreground">Motif*</label>
                <input id="aide-motif" name="motif" type="text" maxLength={200} required defaultValue={aide?.motif ?? ""} placeholder="Ex. Soutien loyer" className={clsx(INPUT, err("motif") && "border-red-500/70")} />
                {err("motif") && <p className="text-xs text-red-400">{err("motif")}</p>}</div>
              <div className="flex flex-col gap-1.5"><label htmlFor="aide-date" className="text-sm font-medium text-foreground">Date</label>
                <input id="aide-date" name="dateDistribution" type="date" defaultValue={aide?.dateISO ?? dateInitiale} className={INPUT} /></div>
              <div className="flex flex-col gap-1.5"><label htmlFor="aide-notes" className="text-sm font-medium text-foreground">Notes (confidentiel)</label>
                <textarea id="aide-notes" name="notesConflictuelles" rows={3} maxLength={500} defaultValue={aide?.notesConflictuelles ?? ""} placeholder="Suivi, réserves…" className="flex w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" /></div>
              <div className="flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4 -mx-6 -mb-5">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
                <button type="submit" disabled={enCours} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {enCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}{enCours ? "…" : aide ? "Mettre à jour" : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
