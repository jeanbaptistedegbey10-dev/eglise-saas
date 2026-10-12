"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, CircleAlert, LoaderCircle, Pencil, Plus, X } from "lucide-react";

import { enregistrerTypeCotisation } from "@/actions/finance";
import { CATEGORIES_FINANCES } from "@/lib/finance";
import {
  initialFinancesFormState,
  type TypeCotisationEdition,
} from "@/types/finance";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

type Props = {
  /** Type à modifier — absent pour une création. */
  typeCotisation?: TypeCotisationEdition | null;
  triggerLabel?: string;
  variant?: "primary" | "secondary";
};

/** Modale de création / modification d'un type de cotisation. */
export default function TypeCotisationFormModal({
  typeCotisation,
  triggerLabel,
  variant = "primary",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(
    enregistrerTypeCotisation,
    initialFinancesFormState,
  );

  useEffect(() => {
    if (etat.success) {
      setOpen(false);
      router.refresh();
    }
  }, [etat, router]);

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
  const DeclencheurIcon = variant === "primary" ? Plus : Pencil;

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
        <DeclencheurIcon
          className={variant === "primary" ? "h-4 w-4" : "h-3.5 w-3.5"}
          aria-hidden
        />
        {triggerLabel ?? (typeCotisation ? "Modifier" : "Nouveau type")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="type-cotisation-modal-titre"
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
                  {typeCotisation ? "Modification" : "Création"}
                </p>
                <h2
                  id="type-cotisation-modal-titre"
                  className="text-lg font-semibold text-foreground"
                >
                  {typeCotisation ? typeCotisation.libelle : "Nouveau type de cotisation"}
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
              {typeCotisation && (
                <input type="hidden" name="id" defaultValue={typeCotisation.id} />
              )}

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
                  <label
                    htmlFor="type-cotisation-libelle"
                    className="text-sm font-medium text-foreground"
                  >
                    Libellé<span className="ml-1 text-red-400">*</span>
                  </label>
                  <input
                    id="type-cotisation-libelle"
                    name="libelle"
                    type="text"
                    defaultValue={typeCotisation?.libelle ?? ""}
                    placeholder="Ex. Cotisation annuelle des adultes"
                    aria-invalid={erreurDe("libelle") ? true : undefined}
                    className={clsx(
                      INPUT_BASE,
                      "h-10",
                      erreurDe("libelle") &&
                        "border-red-500/70 focus:border-red-500 focus:ring-red-500/30",
                    )}
                  />
                  {erreurDe("libelle") && (
                    <p className="text-xs text-red-400">{erreurDe("libelle")}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="type-cotisation-description"
                    className="text-sm font-medium text-foreground"
                  >
                    Description
                  </label>
                  <textarea
                    id="type-cotisation-description"
                    name="description"
                    rows={3}
                    defaultValue={typeCotisation?.description ?? ""}
                    placeholder="Facultatif — précise l'objet de la cotisation."
                    className={clsx(INPUT_BASE, "min-h-20 py-2.5")}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="type-cotisation-type"
                    className="text-sm font-medium text-foreground"
                  >
                    Catégorie<span className="ml-1 text-red-400">*</span>
                  </label>
                  <select
                    id="type-cotisation-type"
                    name="type"
                    defaultValue={typeCotisation?.type ?? "OBLIGATOIRE_BAREME"}
                    className={clsx(INPUT_BASE, "h-10")}
                  >
                    {CATEGORIES_FINANCES.map((categorie) => (
                      <option key={categorie.id} value={categorie.id}>
                        {categorie.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    La catégorie détermine les écrans où la cotisation apparaît.
                  </p>
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
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {enCours ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  {enCours
                    ? "Enregistrement…"
                    : typeCotisation
                      ? "Mettre à jour"
                      : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
