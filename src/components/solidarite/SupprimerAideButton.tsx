"use client";
import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, LoaderCircle, Trash2 } from "lucide-react";
import { supprimerAide } from "@/actions/solidarite";
import { initialSolidariteFormState } from "@/types/solidarite";
export default function SupprimerAideButton({ aideId, compact }: { aideId: string; compact?: boolean }) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(supprimerAide, initialSolidariteFormState);
  useEffect(() => { if (etat.success) router.refresh(); }, [etat, router]);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("Supprimer cette aide du suivi ?")) e.preventDefault(); }}>
      <input type="hidden" name="aideId" defaultValue={aideId} />
      <button type="submit" disabled={enCours} title="Supprimer l'aide" className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60">
        {enCours ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}{compact ? null : "Supprimer"}
      </button>
    </form>
  );
}
export function ConfidentialNote() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
      <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-1"><p className="font-semibold">Espace confidentiel</p>
      <p className="text-amber-100/80">Suivi réservé aux responsables habilités — ne pas partager en dehors du suivi pastoral.</p></div>
    </div>
  );
}
