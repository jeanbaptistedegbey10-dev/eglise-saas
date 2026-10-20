"use client";

import { useEffect, useState, useActionState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Check, CircleAlert, Eye, EyeOff, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { basculerClotureCotisation, supprimerCotisation } from "@/actions/cotisation";
import { formatMontant, libelleFrequence, libelleTypeCotisation } from "@/lib/cotisation";
import { initialCotisationFormState, type CotisationResume } from "@/types/cotisation";

type Props = {
  cotisations: CotisationResume[];
  exerciceId: string;
  exerciceCloture: boolean;
  /** Cotisation actuellement mise en évidence. */
  selectionneeId?: string | null;
};

/** Pastille de statut colorée selon la nature de la cotisation. */
function BadgeType({ cotisation }: { cotisation: CotisationResume }) {
  const styles: Record<string, string> = {
    RECURRENTE_CLASSE: "bg-sky-500/15 text-sky-300",
    PONCTUELLE_EVENEMENT: "bg-amber-500/15 text-amber-300",
    ANONYME_PROJET: "bg-violet-500/15 text-violet-300",
    QUETE_CULTE: "bg-teal-500/15 text-teal-300",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[cotisation.type] ?? "bg-muted text-muted-foreground",
      )}
    >
      {libelleTypeCotisation(cotisation.type)}
    </span>
  );
}

/**
 * Liste des cotisations de l'exercice : cartes avec badges de statut et
 * actions « Modifier », « Supprimer » (double confirmation) et
 * « Clôturer / Rouvrir ».
 */
export default function CotisationsListe({
  cotisations,
  exerciceId,
  exerciceCloture,
  selectionneeId,
}: Props) {
  const router = useRouter();
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const [etatSuppression, actionSuppression, suppressionEnCours] = useActionState(
    supprimerCotisation,
    initialCotisationFormState,
  );
  const [etatCloture, actionCloture, clotureEnCours] = useActionState(
    basculerClotureCotisation,
    initialCotisationFormState,
  );

  const etatSucces = etatSuppression.success || etatCloture.success;
  useResetAuChangement(etatSucces, () => {
    if (etatSucces) setASupprimer(null);
  });
  useEffect(() => {
    if (etatSucces) router.refresh();
  }, [etatSucces]);

  const messageErreur = !etatSuppression.success
    ? etatSuppression.message || null
    : !etatCloture.success
      ? etatCloture.message || null
      : null;
  const messageSucces = etatSuppression.success
    ? etatSuppression.message || null
    : etatCloture.success
      ? etatCloture.message || null
      : null;

  if (cotisations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
        Aucune cotisation pour cet exercice. Créez-en une avec le formulaire ci-contre.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messageErreur && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
        >
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {messageErreur}
        </p>
      )}
      {messageSucces && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {messageSucces}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {cotisations.map((cotisation) => {
          const actif = cotisation.id === selectionneeId;
          const enConfirmation = aSupprimer === cotisation.id;
          const nbVersements = cotisation.versements?.length || 0;
          const nbDepenses = cotisation.depenses?.length || 0;
          const suppressionBloquee = nbVersements > 0 || nbDepenses > 0;
          const infoBulle =
            nbVersements > 0
              ? "Suppression bloquée : des versements sont enregistrés sur cette cotisation."
              : "Suppression bloquée : des dépenses sont imputées sur cette cotisation.";
          const messageBlocage =
            nbVersements > 0
              ? "Cette cotisation contient des écritures financières. Pour la supprimer, annulez d'abord tous les versements associés dans l'onglet Versements."
              : "Cette cotisation contient des écritures financières. Pour la supprimer, annulez d'abord les dépenses imputées sur cette cotisation.";

          return (
            <li
              key={cotisation.id}
              className={clsx(
                "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                actif
                  ? "border-primary/60 bg-primary/10"
                  : "border-card-border bg-card hover:bg-muted/30",
                cotisation.estCloture && "opacity-80",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {cotisation.nom}
                  </span>
                  {cotisation.description && (
                    <span className="text-xs text-muted-foreground">
                      {cotisation.description}
                    </span>
                  )}
                </div>
                <BadgeType cotisation={cotisation} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {libelleFrequence(cotisation.frequence)}
                </span>
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    cotisation.estCloture
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-emerald-500/15 text-emerald-300",
                  )}
                >
                  {cotisation.estCloture ? "Clôturée" : "Ouverte"}
                </span>
                {cotisation.montantPlancher != null && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                    Plancher {formatMontant(cotisation.montantPlancher)} FCFA
                    {cotisation.autoriserSurplus ? " · surplus autorisé" : ""}
                  </span>
                )}
                {cotisation.montantCible != null && (
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200">
                    Cible {formatMontant(cotisation.montantCible)} FCFA
                  </span>
                )}
                {cotisation.departementNom && (
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200">
                    {cotisation.departementNom}
                  </span>
                )}
                {cotisation.groupeNom && (
                  <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-200">
                    {cotisation.groupeNom}
                  </span>
                )}
                {cotisation.baremes.length > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {cotisation.baremes.length} barème
                    {cotisation.baremes.length > 1 ? "s" : ""}
                  </span>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {formatMontant(cotisation.totalVerse)} FCFA encaissés
                </span>
                {cotisation.surplusTotal > 0 && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                    dont {formatMontant(cotisation.surplusTotal)} FCFA de surplus
                  </span>
                )}
              </div>

              {!exerciceCloture && (
                <div className="flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
                  <Link
                    href={`/finances/cotisations?exercice=${exerciceId}&onglet=types&edition=${cotisation.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Modifier
                  </Link>

                  <form action={actionCloture} className="inline-flex">
                    <input type="hidden" name="cotisationId" value={cotisation.id} readOnly />
                    <button
                      type="submit"
                      disabled={clotureEnCours}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      {clotureEnCours ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : cotisation.estCloture ? (
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {cotisation.estCloture ? "Rouvrir" : "Clôturer"}
                    </button>
                  </form>

                  {enConfirmation ? (
                    <form
                      action={actionSuppression}
                      className="inline-flex items-center gap-1.5"
                    >
                      <input
                        type="hidden"
                        name="cotisationId"
                        value={cotisation.id}
                        readOnly
                      />
                      <input type="hidden" name="confirmation" value="SUPPRIMER" readOnly />
                      <button
                        type="submit"
                        disabled={suppressionEnCours}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-60"
                      >
                        {suppressionEnCours ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Confirmer la suppression
                      </button>
                      <button
                        type="button"
                        onClick={() => setASupprimer(null)}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Annuler
                      </button>
                    </form>
                  ) : suppressionBloquee ? (
                    <button
                      type="button"
                      onClick={() => alert(messageBlocage)}
                      aria-disabled={true}
                      title={infoBulle}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 outline-none transition-colors hover:bg-red-500/20 focus-visible:ring-2 focus-visible:ring-red-500/40 opacity-70"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Supprimer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setASupprimer(cotisation.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-background px-2.5 py-1.5 text-xs font-medium text-red-400 outline-none transition-colors hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Supprimer
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
