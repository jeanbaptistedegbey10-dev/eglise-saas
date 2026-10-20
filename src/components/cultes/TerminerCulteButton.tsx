/**
 * Bouton « Marquer comme terminé » — bascule un événement planifié en TERMINE.
 */
"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, LoaderCircle } from "lucide-react";
import { marquerCulteTermine } from "@/actions/culte";
import { initialCulteFormState } from "@/types/culte";

export default function TerminerCulteButton({ culteId }: { culteId: string }) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(marquerCulteTermine, initialCulteFormState);
  useEffect(() => {
    if (etat.success) router.refresh();
  }, [etat, router]);
  return (
    <form action={formAction}>
      <input type="hidden" name="culteId" defaultValue={culteId} />
      <button
        type="submit"
        disabled={enCours}
        title="Marquer comme terminé"
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/15 px-3 py-1.5 text-xs font-medium text-emerald-500 hover:bg-emerald-600/25 disabled:opacity-60"
      >
        {enCours ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <CheckCheck className="h-3.5 w-3.5" aria-hidden />
        )}
        Marquer comme terminé
      </button>
    </form>
  );
}
