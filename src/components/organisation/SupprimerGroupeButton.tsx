"use client";
import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { supprimerGroupe } from "@/actions/groupes-membres";
import { initialOrganisationFormState } from "@/types/organisation";
export default function SupprimerGroupeButton({ groupeId, nom }: { groupeId: string; nom: string }) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(supprimerGroupe, initialOrganisationFormState);
  useEffect(() => { if (etat.success) router.refresh(); }, [etat, router]);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm(`Supprimer le groupe « ${nom} » ?`)) e.preventDefault(); }}>
      <input type="hidden" name="groupeId" defaultValue={groupeId} />
      <button type="submit" disabled={enCours} title="Supprimer" aria-label={`Supprimer ${nom}`} className="inline-flex items-center rounded-lg border border-card-border bg-card p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60">
        {enCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4 text-red-500/80" aria-hidden />}
      </button>
    </form>
  );
}
