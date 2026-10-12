"use client";
import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CalendarPlus, Check, CircleAlert, LoaderCircle, X } from "lucide-react";
import { enregistrerCulte } from "@/actions/culte";
import { initialCulteFormState, type CulteResume } from "@/types/culte";
const INPUT = "flex w-full rounded-lg border border-card-border bg-background px-3 h-10 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";
export default function CulteFormModal({ triggerLabel, culte }: { triggerLabel?: string; culte?: CulteResume | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(enregistrerCulte, initialCulteFormState);
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
      <button type="button" onClick={() => setOpen(true)} className={clsx("inline-flex items-center gap-2 rounded-xl text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", culte ? "border border-card-border bg-card px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground" : "bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90")}>
        <CalendarPlus className="h-4 w-4" aria-hidden />{triggerLabel ?? (culte ? "Modifier" : "Planifier un culte")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div><p className="text-xs font-medium uppercase tracking-wide text-accent">Cultes</p>
              <h2 className="text-lg font-semibold text-foreground">{culte ? "Modifier le culte" : "Planifier un culte"}</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <form action={formAction} className="flex flex-col gap-4 px-6 py-5">
              {culte && <input type="hidden" name="id" defaultValue={culte.id} />}
              {!etat.success && etat.message && (<div role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{etat.message}</span></div>)}
              <div className="flex flex-col gap-1.5"><label htmlFor="culte-date" className="text-sm font-medium text-foreground">Date<span className="ml-1 text-red-400">*</span></label>
                <input id="culte-date" name="date" type="date" required defaultValue={culte?.dateISO ?? ""} className={clsx(INPUT, err("date") && "border-red-500/70")} />
                {err("date") && <p className="text-xs text-red-400">{err("date")}</p>}</div>
              <div className="flex flex-col gap-1.5"><label htmlFor="culte-intitule" className="text-sm font-medium text-foreground">Intitulé<span className="ml-1 text-red-400">*</span></label>
                <input id="culte-intitule" name="intitule" type="text" maxLength={120} required defaultValue={culte?.intitule ?? ""} placeholder="Ex. Culte du dimanche matin" className={clsx(INPUT, err("intitule") && "border-red-500/70")} />
                {err("intitule") && <p className="text-xs text-red-400">{err("intitule")}</p>}</div>
              <div className="flex flex-col gap-1.5"><label htmlFor="culte-quete" className="text-sm font-medium text-foreground">Quête initiale</label>
                <input id="culte-quete" name="totalQueteAnonyme" type="text" inputMode="decimal" defaultValue={culte ? String(culte.totalQueteAnonyme) : ""} placeholder="Ex. 50000" className={clsx(INPUT, "tabular-nums")} />
                {err("totalQueteAnonyme") && <p className="text-xs text-red-400">{err("totalQueteAnonyme")}</p>}</div>
              <div className="flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4 -mx-6 -mb-5">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
                <button type="submit" disabled={enCours} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {enCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}{enCours ? "…" : culte ? "Mettre à jour" : "Planifier"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
