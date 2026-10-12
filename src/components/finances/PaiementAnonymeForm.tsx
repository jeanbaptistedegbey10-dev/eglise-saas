"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CircleAlert, Coins, LoaderCircle, Lock } from "lucide-react";

import { enregistrerPaiementAnonyme } from "@/actions/finance";
import { MODES_PAIEMENT } from "@/lib/finance";
import {
  initialFinancesFormState,
  type TypeCotisationOption,
} from "@/types/finance";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

type Props = {
  exerciceId: string;
  /** Types de quêtes (ou campagnes volontaires) éligibles au versement anonyme. */
  types: TypeCotisationOption[];
  /** Aujourd'hui, calculé côté serveur (cohérence d'hydratation). */
  dateInitiale: string;
  contexte: "quete" | "don";
};

/**
 * Formulaire de versement anonyme : quête de culte ou don sans identification.
 * Le Server Action n'enregistre jamais de `membreId` — l'anonymat est garanti
 * par construction.
 */
export default function PaiementAnonymeForm({
  exerciceId,
  types,
  dateInitiale,
  contexte,
}: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    enregistrerPaiementAnonyme,
    initialFinancesFormState,
  );

  useEffect(() => {
    if (etat.success) router.refresh();
  }, [etat, router]);

  const erreurDe = (champ: string): string | undefined => etat.fieldErrors[champ]?.[0];
  const titre =
    contexte === "quete" ? "Enregistrer une quête" : "Enregistrer un don anonyme";

  return (
    <section aria-label={titre} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {contexte === "quete" ? (
          <Coins className="h-5 w-5 text-accent" aria-hidden />
        ) : (
          <Lock className="h-5 w-5 text-accent" aria-hidden />
        )}
        <h3 className="text-base font-semibold text-foreground">{titre}</h3>
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Le donneur reste anonyme : aucun nom n&apos;est rattaché au versement, seul le montant
          global est comptabilisé.
        </span>
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="exerciceId" defaultValue={exerciceId} />

        {!etat.success && etat.message && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{etat.message}</span>
          </div>
        )}
        {etat.success && etat.message && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{etat.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${contexte}-type`} className="text-sm font-medium text-foreground">
              Quête / campagne<span className="ml-1 text-red-400">*</span>
            </label>
            <select
              id={`${contexte}-type`}
              name="typeCotisationId"
              className={clsx(INPUT_BASE, "h-10")}
              disabled={types.length === 0}
            >
              {types.length === 0 ? (
                <option>Aucune quête ou campagne créée</option>
              ) : (
                types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.libelle}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${contexte}-montant`} className="text-sm font-medium text-foreground">
              Montant<span className="ml-1 text-red-400">*</span>
            </label>
            <input
              id={`${contexte}-montant`}
              name="montant"
              type="text"
              inputMode="decimal"
              placeholder="Ex. 50000"
              aria-invalid={erreurDe("montant") ? true : undefined}
              className={clsx(
                INPUT_BASE,
                "h-10 tabular-nums",
                erreurDe("montant") && "border-red-500/70 focus:border-red-500 focus:ring-red-500/30",
              )}
            />
            {erreurDe("montant") && <p className="text-xs text-red-400">{erreurDe("montant")}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${contexte}-mode`} className="text-sm font-medium text-foreground">
              Mode de paiement<span className="ml-1 text-red-400">*</span>
            </label>
            <select
              id={`${contexte}-mode`}
              name="modePaiement"
              className={clsx(INPUT_BASE, "h-10")}
            >
              {MODES_PAIEMENT.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${contexte}-date`} className="text-sm font-medium text-foreground">
              Date du versement
            </label>
            <input
              id={`${contexte}-date`}
              name="datePaiement"
              type="date"
              defaultValue={dateInitiale}
              className={clsx(INPUT_BASE, "h-10")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${contexte}-commentaire`}
            className="text-sm font-medium text-foreground"
          >
            Commentaire
          </label>
          <input
            id={`${contexte}-commentaire`}
            name="commentaire"
            type="text"
            maxLength={300}
            placeholder="Ex. Quête du culte du dimanche matin"
            className={clsx(INPUT_BASE, "h-10")}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={enCours || types.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {enCours ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Coins className="h-4 w-4" aria-hidden />
            )}
            {enCours ? "Enregistrement…" : "Enregistrer le versement"}
          </button>
        </div>
      </form>
    </section>
  );
}
