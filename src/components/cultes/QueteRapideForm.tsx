"use client";
import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Coins, LoaderCircle } from "lucide-react";
import { enregistrerQueteCulte } from "@/actions/culte";
import { initialCulteFormState } from "@/types/culte";
/** Saisie rapide du montant de la quête anonyme d'un culte. */
export default function QueteRapideForm({ culteId, montantActuel }: { culteId: string; montantActuel: number }) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(enregistrerQueteCulte, initialCulteFormState);
  useEffect(() => { if (etat.success) router.refresh(); }, [etat, router]);
  const err = etat.fieldErrors["montant"]?.[0] ?? etat.fieldErrors["_form"]?.[0];
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="culteId" defaultValue={culteId} />
      <div className="flex min-w-36 flex-1 flex-col gap-1">
        <label htmlFor={`quete-${culteId}`} className="text-xs font-medium text-muted-foreground">Quête anonyme</label>
        <input id={`quete-${culteId}`} name="montant" type="text" inputMode="decimal" defaultValue={montantActuel > 0 ? String(montantActuel) : ""} placeholder="Ex. 50000" className="h-9 rounded-lg border border-card-border bg-background px-3 text-sm tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" />
      </div>
      <button type="submit" disabled={enCours} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {enCours ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Coins className="h-3.5 w-3.5" aria-hidden />}{enCours ? "…" : "Enregistrer"}
      </button>
      {err && !etat.success && (<p role="alert" className="flex w-full items-center gap-1 text-xs text-red-400"><CircleAlert className="h-3 w-3" aria-hidden />{err}</p>)}
      {etat.success && (<p className="w-full text-xs text-emerald-400">{etat.message}</p>)}
    </form>
  );
}
