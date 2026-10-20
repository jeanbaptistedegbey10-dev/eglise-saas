"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, LoaderCircle, Play, RotateCcw, Trash2, UserCheck } from "lucide-react";
import { assignerTacheEvenement, changerStatutTache, supprimerTacheEvenement } from "@/actions/taches";
import { LIBELLES_STATUT_TACHE, initialCulteFormState, type MembreOption, type TacheResume } from "@/types/culte";

function badge(statut: TacheResume["statut"]): string {
  if (statut === "CLOTUREE") return "bg-emerald-600/15 text-emerald-500";
  if (statut === "EN_COURS") return "bg-amber-500/15 text-amber-500";
  return "bg-muted text-muted-foreground";
}

export default function TacheLigne({ tache, membres }: { tache: TacheResume; membres: MembreOption[] }) {
  const router = useRouter();
  const [eS, aS, cS] = useActionState(changerStatutTache, initialCulteFormState);
  const [eA, aA, cA] = useActionState(assignerTacheEvenement, initialCulteFormState);
  const [eD, aD, cD] = useActionState(supprimerTacheEvenement, initialCulteFormState);
  useEffect(() => { if (eS.success || eA.success || eD.success) router.refresh(); }, [eS, eA, eD, router]);
  const close = tache.statut === "CLOTUREE";
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-card-border bg-background/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{tache.titre}</span>
          <span className="text-xs text-muted-foreground">{tache.responsable ? tache.responsable.nomComplet : "Sans responsable"}{tache.description ? ` · ${tache.description}` : ""}</span>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge(tache.statut)}`}>{LIBELLES_STATUT_TACHE[tache.statut]}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tache.statut === "A_FAIRE" && (
          <form action={aS}><input type="hidden" name="tacheId" defaultValue={tache.id} /><input type="hidden" name="statut" defaultValue="EN_COURS" />
            <button disabled={cS} className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-medium text-accent hover:bg-primary/25 disabled:opacity-60"><Play className="h-3 w-3" aria-hidden />Démarrer</button></form>
        )}
        {!close && (
          <form action={aS}><input type="hidden" name="tacheId" defaultValue={tache.id} /><input type="hidden" name="statut" defaultValue="CLOTUREE" />
            <button disabled={cS} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/15 px-2.5 py-1 text-xs font-medium text-emerald-500 hover:bg-emerald-600/25 disabled:opacity-60"><CheckCheck className="h-3 w-3" aria-hidden />Clôturer</button></form>
        )}
        {close && (
          <form action={aS}><input type="hidden" name="tacheId" defaultValue={tache.id} /><input type="hidden" name="statut" defaultValue="A_FAIRE" />
            <button disabled={cS} className="inline-flex items-center gap-1 rounded-lg border border-card-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-60"><RotateCcw className="h-3 w-3" aria-hidden />Rouvrir</button></form>
        )}
        <form action={aA} className="inline-flex items-center gap-1">
          <input type="hidden" name="tacheId" defaultValue={tache.id} />
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <select name="responsableMembreId" defaultValue={tache.responsable?.id ?? ""} onChange={(e) => e.target.form?.requestSubmit()} aria-label="Assigner un membre" className="h-7 rounded-lg border border-card-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary">
            <option value="">Non assigné</option>
            {membres.map((m) => (<option key={m.id} value={m.id}>{m.nomComplet}</option>))}
          </select>
        </form>
        <form action={aD} onSubmit={(e) => { if (!window.confirm("Supprimer cette tâche ?")) e.preventDefault(); }}>
          <input type="hidden" name="tacheId" defaultValue={tache.id} />
          <button disabled={cD || cA} title="Supprimer" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden /></button>
        </form>
      </div>
      {(eS.message || eA.message || eD.message) && !(eS.success || eA.success || eD.success) && (
        <p className="text-xs text-red-400">{eS.message || eA.message || eD.message}{cS || cA ? <LoaderCircle className="ml-1 inline h-3 w-3 animate-spin" aria-hidden /> : null}</p>
      )}
    </li>
  );
}
