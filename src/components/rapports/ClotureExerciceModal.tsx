"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, CircleAlert, Lock, LockOpen, X } from "lucide-react";

import { cloturerExercice } from "@/actions/rapport";
import { rouvrirExercice } from "@/actions/finance";
import { initialClotureFormState } from "@/types/rapport";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

type Props = {
  exerciceId: string;
  exerciceLibelle: string;
  exerciceAnnee: number;
};

/** Modale de clôture définitive : abandon des impayés + nouvel exercice. */
export default function ClotureExerciceModal({
  exerciceId,
  exerciceLibelle,
  exerciceAnnee,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(
    cloturerExercice,
    initialClotureFormState,
  );
  const [creerSuivant, setCreerSuivant] = useState(true);

  useEffect(() => {
    if (etat.success) {
      setOpen(false);
      router.refresh();
    }
  }, [etat, router]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open ]);

  const erreurDe = (champ: string): string | undefined =>
    etat.fieldErrors[champ]?.[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white outline-none transition-colors hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Lock className="h-4 w-4" aria-hidden />
        🔒 Clôturer l&apos;exercice
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cloture-modal-titre"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer la fenêtre"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-red-400">
                  Clôture définitive
                </p>
                <h2 id="cloture-modal-titre" className="text-lg font-semibold text-foreground">
                  🔒 Clôturer {exerciceLibelle} ?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <form action={formAction} className="flex min-h-0 flex-col">
              <input type="hidden" name="exerciceId" value={exerciceId} />
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Action irréversible : l&apos;exercice passe en lecture seule et les
                    impayés sont abandonnés (aucun report de dette). Les paiements
                    enregistrés sont conservés.
                  </span>
                </div>

                {!etat.success && etat.message && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{etat.message}</span>
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="creerSuivant"
                    defaultChecked
                    onChange={(e) => setCreerSuivant(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-card-border accent-primary"
                  />
                  <span>
                    <span className="font-medium text-foreground">Créer l&apos;exercice suivant</span>
                    <span className="block text-xs text-muted-foreground">
                      Recommandé : ouvre l&apos;année suivante pour continuer la saisie.
                    </span>
                  </span>
                </label>

                {creerSuivant && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="cloture-annee" className="text-sm font-medium text-foreground">
                          Année<span className="ml-1 text-red-400">*</span>
                        </label>
                        <input
                          id="cloture-annee"
                          name="anneeSuivante"
                          type="number"
                          min={2000}
                          max={2100}
                          defaultValue={exerciceAnnee + 1}
                          className={clsx(INPUT_BASE, "h-10")}
                        />
                        {erreurDe("anneeSuivante") && (
                          <p className="text-xs text-red-400">{erreurDe("anneeSuivante")}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="cloture-libelle" className="text-sm font-medium text-foreground">
                          Libellé
                        </label>
                        <input
                          id="cloture-libelle"
                          name="libelleSuivant"
                          type="text"
                          defaultValue={`Exercice ${exerciceAnnee + 1}`}
                          className={clsx(INPUT_BASE, "h-10")}
                        />
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        name="recopierBaremes"
                        defaultChecked
                        className="mt-1 h-4 w-4 rounded border-card-border accent-primary"
                      />
                      <span>
                        <span className="font-medium text-foreground">Recopier les barèmes</span>
                        <span className="block text-xs text-muted-foreground">
                          Les classes et montants sont dupliqués vers le nouvel exercice.
                        </span>
                      </span>
                    </label>
                  </>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cloture-confirm" className="text-sm font-medium text-foreground">
                    Tapez « CLOTURER » pour confirmer<span className="ml-1 text-red-400">*</span>
                  </label>
                  <input
                    id="cloture-confirm"
                    name="confirmation"
                    type="text"
                    placeholder="CLOTURER"
                    autoComplete="off"
                    className={clsx(INPUT_BASE, "h-10")}
                  />
                  {erreurDe("confirmation") && (
                    <p className="text-xs text-red-400">{erreurDe("confirmation")}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enCours}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {enCours ? "Clôture…" : "Clôturer définitivement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

type RouvrirProps = { exerciceId: string; exerciceLibelle: string };

/** Badge ambre + bouton violet de réouverture avec confirmation. */
export function RouvrirExerciceBloc({ exerciceId, exerciceLibelle }: RouvrirProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enTransition, demarrerTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open ]);

  const confirmer = () => {
    setMessage(null);
    demarrerTransition(async () => {
      const resultat = await rouvrirExercice(exerciceId);
      if (resultat.success) {
        setOpen(false);
        router.refresh();
      } else {
        setMessage(resultat.message || "Reouverture impossible.");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Exercice clôturé (Lecture seule)
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white outline-none transition-colors hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LockOpen className="h-4 w-4" aria-hidden />
        Rouvrir l&apos;exercice
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-violet-300">Reouverture</p>
                <h2 className="text-lg font-semibold text-foreground">Rouvrir {exerciceLibelle} ?</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-3 px-6 py-5 text-sm text-muted-foreground">
              <p>La saisie sera de nouveau possible sur cet exercice.</p>
              {message && <p role="alert" className="text-xs text-red-400">{message}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
              <button type="button" onClick={confirmer} disabled={enTransition} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
                {enTransition ? "Reouverture…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
