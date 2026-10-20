"use client";

import { useEffect, useState, useActionState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, CircleAlert, LoaderCircle, Plus, X } from "lucide-react";

import { enregistrerExercice } from "@/actions/exercices";
import { MOIS_LIBELLES } from "@/lib/mois";
import { initialFinancesFormState } from "@/types/finance";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

type Props = {
  triggerLabel?: string;
  variant?: "primary" | "secondary";
};

/** Modale de création d'un exercice comptable. */
export default function ExerciceFormModal({ triggerLabel, variant = "primary" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(
    enregistrerExercice,
    initialFinancesFormState,
  );

  const anneeCourante = new Date().getFullYear();

  useResetAuChangement(etat, () => {
    if (etat.success) setOpen(false);
  });
  useEffect(() => {
    if (etat.success) router.refresh();
  }, [etat]);

  // Fermeture par la touche Échap + verrouillage du défilement de fond.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const erreurDe = (champ: string): string | undefined => etat.fieldErrors[champ]?.[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "inline-flex items-center gap-2 rounded-xl text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
          variant === "primary"
            ? "bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            : "border border-card-border bg-card px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Plus className={variant === "primary" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
        {triggerLabel ?? "Nouvel exercice"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exercice-modal-titre"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer la fenêtre"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Comptabilité
                </p>
                <h2 id="exercice-modal-titre" className="text-lg font-semibold text-foreground">
                  Nouvel exercice
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer la fenêtre"
                className="rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form action={formAction} className="flex flex-col">
              <div className="flex flex-col gap-4 px-6 py-6">
                {!etat.success && etat.message && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{etat.message}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="exercice-annee" className="text-sm font-medium text-foreground">
                    Année<span className="ml-1 text-red-400">*</span>
                  </label>
                  <input
                    id="exercice-annee"
                    name="annee"
                    type="number"
                    min={2000}
                    max={2100}
                    defaultValue={anneeCourante}
                    aria-invalid={erreurDe("annee") ? true : undefined}
                    className={clsx(
                      INPUT_BASE,
                      "h-10",
                      erreurDe("annee") && "border-red-500/70 focus:border-red-500 focus:ring-red-500/30",
                    )}
                  />
                  {erreurDe("annee") && (
                    <p className="text-xs text-red-400">{erreurDe("annee")}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="exercice-libelle" className="text-sm font-medium text-foreground">
                    Libellé<span className="ml-1 text-red-400">*</span>
                  </label>
                  <input
                    id="exercice-libelle"
                    name="libelle"
                    type="text"
                    placeholder={`Ex. Exercice ${anneeCourante}`}
                    aria-invalid={erreurDe("libelle") ? true : undefined}
                    className={clsx(
                      INPUT_BASE,
                      "h-10",
                      erreurDe("libelle") && "border-red-500/70 focus:border-red-500 focus:ring-red-500/30",
                    )}
                  />
                  {erreurDe("libelle") ? (
                    <p className="text-xs text-red-400">{erreurDe("libelle")}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      L&apos;année saisie sert de base au libellé (ex. « Exercice 2026 »).
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="exercice-mois-debut" className="text-sm font-medium text-foreground">
                      Mois de début<span className="ml-1 text-red-400">*</span>
                    </label>
                    <select
                      id="exercice-mois-debut"
                      name="moisDebut"
                      defaultValue={1}
                      aria-invalid={erreurDe("moisDebut") ? true : undefined}
                      className={clsx(INPUT_BASE, "h-10")}
                    >
                      {MOIS_LIBELLES.map((libelle, index) => (
                        <option key={libelle} value={index + 1}>
                          {libelle} ({index + 1})
                        </option>
                      ))}
                    </select>
                    {erreurDe("moisDebut") && (
                      <p className="text-xs text-red-400">{erreurDe("moisDebut")}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="exercice-mois-fin" className="text-sm font-medium text-foreground">
                      Mois de fin<span className="ml-1 text-red-400">*</span>
                    </label>
                    <select
                      id="exercice-mois-fin"
                      name="moisFin"
                      defaultValue={12}
                      aria-invalid={erreurDe("moisFin") ? true : undefined}
                      className={clsx(INPUT_BASE, "h-10")}
                    >
                      {MOIS_LIBELLES.map((libelle, index) => (
                        <option key={libelle} value={index + 1}>
                          {libelle} ({index + 1})
                        </option>
                      ))}
                    </select>
                    {erreurDe("moisFin") ? (
                      <p className="text-xs text-red-400">{erreurDe("moisFin")}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Période comptable (ex. octobre → septembre).
                      </p>
                    )}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="reprendreSoldes"
                    defaultChecked
                    value="on"
                    className="mt-1 h-4 w-4 rounded border-card-border accent-primary"
                  />
                  <span>
                    <span className="font-medium text-foreground">
                      Reprendre les soldes de clôture des caisses comme soldes initiaux
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      La continuité des soldes est conservée dans le modèle `Caisse`
                      (solde initial aligné sur le solde de clôture).
                    </span>
                  </span>
                </label>
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
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {enCours ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  {enCours ? "Création…" : "Créer l'exercice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
