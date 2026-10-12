"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Check,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { enregistrerBaremes } from "@/actions/finance";
import { formatMontant } from "@/lib/finance";
import {
  initialFinancesFormState,
  type PaliereBaremeEdition,
  type TypeCotisationEdition,
} from "@/types/finance";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

type Props = {
  exerciceId: string;
  exerciceLibelle: string;
  typeCotisation: TypeCotisationEdition;
  /** Paliers existants pour l'exercice courant. */
  paliers: { id: string; libelleClasse: string; montant: number }[];
  triggerLabel?: string;
};

/**
 * Modale de configuration des barèmes : classes (ex. « Jeunes », « Adultes »)
 * et montants pour l'exercice en cours. Les paliers sont propres à l'exercice :
 * une évolution en cours d'année n'altère jamais l'historique des paiements.
 */
export default function BaremeConfigModal({
  exerciceId,
  exerciceLibelle,
  typeCotisation,
  paliers,
  triggerLabel,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [etat, formAction, enCours] = useActionState(
    enregistrerBaremes,
    initialFinancesFormState,
  );

  const [lignes, setLignes] = useState<PaliereBaremeEdition[]>(() =>
    paliers.length > 0
      ? paliers.map((palier) => ({
          id: palier.id,
          libelleClasse: palier.libelleClasse,
          montant: palier.montant,
        }))
      : [{ id: null, libelleClasse: "", montant: 0 }],
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

  const majLigne = (index: number, champ: "libelleClasse" | "montant", valeur: string) => {
    setLignes((precedent) =>
      precedent.map((ligne, position) =>
        position === index
          ? {
              ...ligne,
              [champ]: champ === "montant" ? Number(valeur.replace(",", ".")) || 0 : valeur,
            }
          : ligne,
      ),
    );
  };

  const ajouterLigne = () => {
    setLignes((precedent) => [
      ...precedent,
      { id: null, libelleClasse: "", montant: 0 },
    ]);
  };

  const retirerLigne = (index: number) => {
    setLignes((precedent) =>
      precedent.length > 1 ? precedent.filter((_, position) => position !== index) : precedent,
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {triggerLabel ?? "Configurer"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bareme-modal-titre"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer la fenêtre"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Barème — {exerciceLibelle}
                </p>
                <h2 id="bareme-modal-titre" className="text-lg font-semibold text-foreground">
                  {typeCotisation.libelle}
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

            <form action={formAction} className="flex min-h-0 flex-1 flex-col">
              <input type="hidden" name="exerciceId" defaultValue={exerciceId} />
              <input
                type="hidden"
                name="typeCotisationId"
                defaultValue={typeCotisation.id}
              />

              <div className="min-h-[300px] flex-1 overflow-y-auto px-6 py-6">
                {!etat.success && etat.message && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{etat.message}</span>
                  </div>
                )}

                <p className="mb-5 flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                  <span aria-hidden>💡</span>
                  <span>
                    Les classes et montants sont propres à l&apos;exercice{" "}
                    <span className="font-medium text-foreground">{exerciceLibelle}</span>. Un
                    paiement enregistré conserve son montant : une évolution de classe ou de
                    barème en cours d&apos;année n&apos;altère jamais l&apos;historique.
                  </span>
                </p>

                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-[1fr_10rem_2.5rem] items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Classe (ex. Jeunes, Adultes)</span>
                    <span>Montant</span>
                    <span className="sr-only">Actions</span>
                  </div>

                  {lignes.map((ligne, index) => (
                    <div
                      key={ligne.id ?? `nouvelle-${index}`}
                      className="grid grid-cols-[1fr_10rem_2.5rem] items-center gap-3"
                    >
                      <input type="hidden" name="palierId" value={ligne.id ?? ""} />

                      <input
                        type="text"
                        name="libelleClasse"
                        value={ligne.libelleClasse}
                        onChange={(evenement) =>
                          majLigne(index, "libelleClasse", evenement.target.value)
                        }
                        placeholder="Ex. Jeunes"
                        aria-label={`Nom de la classe ${index + 1}`}
                        className={clsx(INPUT_BASE, "h-10")}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        name="montant"
                        value={ligne.montant === 0 ? "" : String(ligne.montant).replace(".", ",")}
                        onChange={(evenement) => majLigne(index, "montant", evenement.target.value)}
                        placeholder="Ex. 12000"
                        aria-label={`Montant de la classe ${index + 1}`}
                        className={clsx(INPUT_BASE, "h-10 text-right tabular-nums")}
                      />
                      <button
                        type="button"
                        onClick={() => retirerLigne(index)}
                        disabled={lignes.length === 1}
                        aria-label={`Retirer la classe ${index + 1}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={ajouterLigne}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-card-border px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:border-primary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter une classe
                </button>
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
                  {enCours ? "Enregistrement…" : "Enregistrer le barème"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

