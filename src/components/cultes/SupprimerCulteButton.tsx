"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { supprimerCulte } from "@/actions/culte";
import { initialCulteFormState } from "@/types/culte";
export default function SupprimerCulteButton({ culteId }: { culteId: string }) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(supprimerCulte, initialCulteFormState);
  useEffect(() => { if (etat.success) router.refresh(); }, [etat, router]);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("Supprimer ce culte ?")) e.preventDefault(); }}>
      <input type="hidden" name="culteId" defaultValue={culteId} />
      <button type="submit" disabled={enCours} title="Supprimer le culte" className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60">
        {enCours ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}Supprimer
      </button>
    </form>
  );
}
