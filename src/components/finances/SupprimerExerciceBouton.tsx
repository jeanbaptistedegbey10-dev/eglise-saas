"use client";

import { useEffect, useState, useActionState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react";

import { supprimerExercice } from "@/actions/exercices";
import { initialFinancesFormState } from "@/types/finance";

/**
 * Suppression d'un exercice avec confirmation : le bouton ouvre un panneau où
 * l'utilisateur doit taper « SUPPRIMER » (la même valeur est contrôlée par la
 * Server Action). Toutes les données rattachées partent en cascade.
 */
export default function SupprimerExerciceBouton({
  exerciceId,
  exerciceLibelle,
}: {
  exerciceId: string;
  exerciceLibelle: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [etat, formAction, enCours] = useActionState(
    supprimerExercice,
    initialFinancesFormState,
  );

  useResetAuChangement(etat, () => {
    if (etat.success) {
      setOuvert(false);
      setConfirmation("");
    }
  });
  useEffect(() => {
    if (etat.success) router.refresh();
  }, [etat]);

  return (
    <div className="flex flex-col items-end gap-2">
      {!ouvert ? (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-card px-3 py-2 text-xs font-medium text-red-400 outline-none transition-colors hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Supprimer l&apos;exercice
        </button>
      ) : (
        <form
          action={formAction}
          className="flex w-full min-w-72 flex-col gap-2 rounded-xl border border-red-500/40 bg-card p-3 shadow-sm"
          role="alert"
        >
          <input type="hidden" name="exerciceId" value={exerciceId} readOnly />

          <p className="text-xs font-medium text-red-400">
            Suppression définitive de « {exerciceLibelle} » (cotisations, barèmes et
            versements inclus).
          </p>

          {!etat.success && etat.message && (
            <p className="flex items-start gap-1.5 text-xs text-red-400">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {etat.message}
            </p>
          )}
          {etat.success && etat.message && (
            <p className="text-xs text-emerald-400">{etat.message}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="confirmation"
              value={confirmation}
              onChange={(evenement) => setConfirmation(evenement.target.value)}
              placeholder="Tapez SUPPRIMER"
              autoComplete="off"
              className="h-9 flex-1 rounded-lg border border-card-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            />
            <button
              type="submit"
              disabled={enCours || confirmation.trim().toUpperCase() !== "SUPPRIMER"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white outline-none transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-50"
            >
              {enCours && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {enCours ? "Suppression…" : "Confirmer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOuvert(false);
                setConfirmation("");
              }}
              className={clsx(
                "rounded-lg px-3 py-2 text-xs text-muted-foreground outline-none transition-colors",
                "hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
