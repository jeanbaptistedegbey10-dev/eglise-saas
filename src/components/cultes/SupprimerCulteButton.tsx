"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { LoaderCircle, Trash2 } from "lucide-react";
import { supprimerCulte } from "@/actions/culte";
import { initialCulteFormState } from "@/types/culte";
export default function SupprimerCulteButton({ culteId }: { culteId: string }) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(supprimerCulte, initialCulteFormState);
  useResetAuChangement(etat, () => {});
  useEffect(() => {
    if (etat.success) router.refresh();
  }, [etat]);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("Supprimer cet événement et ses tâches ?")) e.preventDefault(); }}>
      <input type="hidden" name="culteId" defaultValue={culteId} />
      <button type="submit" disabled={enCours} title="Supprimer l'événement" className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60">
        {enCours ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}Supprimer
      </button>
    </form>
  );
}
