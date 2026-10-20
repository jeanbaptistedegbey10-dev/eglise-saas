"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { CircleAlert, LoaderCircle, Pencil, Search, Trash2 } from "lucide-react";

import { supprimerDepense } from "@/actions/depense";
import {
  CAISSES_INTERNE,
  formatMontant,
  libelleCategorieCaisse,
} from "@/lib/finance";
import { formatDateISO } from "@/lib/membre";
import {
  initialDepenseFormState,
  type DepenseFormState,
  type DepenseLigne,
  type ResumeDepenses,
} from "@/types/depense";

type Props = {
  depenses: DepenseLigne[];
  resume: ResumeDepenses;
  /** Cotisations de l'exercice — alimente le filtre « source ». */
  cotisations: { id: string; nom: string }[];
  exerciceId: string;
  exerciceCloture: boolean;
};

/** Libellé de la colonne « Source » : nom de la cotisation ou caisse interne. */
function sourceLigne(depense: DepenseLigne): string {
  if (depense.type === "AFFECTEE_COTISATION") {
    return depense.cotisationNom ?? "Cotisation supprimée";
  }
  return depense.caisseNom ?? libelleCategorieCaisse(depense.caisseSource);
}

/** Nom affiché : membre bénéficiaire ou tiers externe. */
function beneficiaireLigne(depense: DepenseLigne): string {
  return depense.beneficiaireNom ?? depense.beneficiaireTiers ?? "—";
}

/**
 * Tableau récapitulatif des décaissements de l'exercice : cartes de synthèse,
 * filtres (mot-clé + caisse / cotisation) et actions « Modifier »
 * (rectification) / « Supprimer » (double confirmation).
 */
export default function DepensesListe({
  depenses,
  resume,
  cotisations,
  exerciceId,
  exerciceCloture,
}: Props) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [sourceFiltre, setSourceFiltre] = useState("");
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const [etatSuppression, actionSuppression, suppressionEnCours] = useActionState(
    async (_etat: DepenseFormState, formData: FormData) =>
      supprimerDepense(String(formData.get("depenseId") ?? "")),
    initialDepenseFormState,
  );

  useResetAuChangement(etatSuppression, () => {
    if (!etatSuppression.success) return;
    setASupprimer(null);
  });
  useEffect(() => {
    if (!etatSuppression.success) return;
    router.refresh();
  }, [etatSuppression]);

  const depensesFiltrees = useMemo(() => {
    const motCle = recherche.trim().toLowerCase();
    return depenses.filter((depense) => {
      if (sourceFiltre.startsWith("CAISSE:")) {
        const caisse = sourceFiltre.slice("CAISSE:".length);
        if (depense.type !== "CAISSE_DIRECTE" || depense.caisseSource !== caisse) {
          return false;
        }
      } else if (sourceFiltre.startsWith("COT:")) {
        const cotisationFiltree = sourceFiltre.slice("COT:".length);
        if (depense.cotisationId !== cotisationFiltree) return false;
      }

      if (!motCle) return true;
      const champ = [
        depense.libelle,
        depense.description,
        depense.beneficiaireNom,
        depense.beneficiaireTiers,
        depense.cotisationNom,
        depense.numeroPiece,
      ]
        .filter((valeur): valeur is string => Boolean(valeur))
        .join(" ")
        .toLowerCase();
      return champ.includes(motCle);
    });
  }, [depenses, recherche, sourceFiltre]);

  const messageErreur = etatSuppression.success
    ? null
    : etatSuppression.message || null;
  const messageSucces = etatSuppression.success ? etatSuppression.message : null;

  const cartes: { titre: string; valeur: string; detail: string; accent: boolean }[] = [
    {
      titre: "Total dépensé",
      valeur: formatMontant(resume.total),
      detail: `${resume.nombre} décaissement${resume.nombre > 1 ? "s" : ""} sur l'exercice`,
      accent: true,
    },
    {
      titre: "Affectées aux cotisations",
      valeur: formatMontant(resume.affectees),
      detail: `${resume.nombreAffectees} dépense${resume.nombreAffectees > 1 ? "s" : ""} liée${resume.nombreAffectees > 1 ? "s" : ""} à une collecte`,
      accent: false,
    },
    {
      titre: "Caisses internes",
      valeur: formatMontant(resume.caissesDirectes),
      detail: `${resume.nombreCaissesDirectes} sortie${resume.nombreCaissesDirectes > 1 ? "s" : ""} directe${resume.nombreCaissesDirectes > 1 ? "s" : ""}`,
      accent: false,
    },
  ];

  return (
    <section className="flex flex-col gap-4" aria-label="Dépenses de l'exercice">
      {/* --- Cartes de synthèse --- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cartes.map((carte) => (
          <div
            key={carte.titre}
            className={clsx(
              "flex flex-col gap-1 rounded-2xl border px-5 py-4",
              carte.accent
                ? "border-primary/40 bg-primary/10"
                : "border-card-border bg-card",
            )}
          >
            <span
              className={clsx(
                "text-xs font-medium uppercase tracking-wide",
                carte.accent ? "text-accent" : "text-muted-foreground",
              )}
            >
              {carte.titre}
            </span>
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {carte.valeur}
            </span>
            <span className="text-xs text-muted-foreground">{carte.detail}</span>
          </div>
        ))}
      </div>

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
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {messageSucces}
        </p>
      )}

      {/* --- Filtres : mot-clé + caisse / cotisation --- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="depenses-recherche" className="sr-only">
            Rechercher une dépense
          </label>
          <input
            id="depenses-recherche"
            type="search"
            value={recherche}
            onChange={(evenement) => setRecherche(evenement.target.value)}
            placeholder="Rechercher par libellé, bénéficiaire, pièce…"
            className="h-10 w-full rounded-lg border border-card-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="depenses-source" className="sr-only">
            Filtrer par caisse ou cotisation
          </label>
          <select
            id="depenses-source"
            value={sourceFiltre}
            onChange={(evenement) => setSourceFiltre(evenement.target.value)}
            className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40"
          >
            <option value="">Toutes les sources</option>
            <optgroup label="Caisses internes">
              {CAISSES_INTERNE.map((caisse) => (
                <option key={caisse.value} value={`CAISSE:${caisse.value}`}>
                  {caisse.label}
                </option>
              ))}
            </optgroup>
            {cotisations.length > 0 && (
              <optgroup label="Cotisations / projets">
                {cotisations.map((cotisation) => (
                  <option key={cotisation.id} value={`COT:${cotisation.id}`}>
                    {cotisation.nom}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* --- Tableau récapitulatif --- */}
      {depenses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune dépense enregistrée sur cet exercice — utilisez le formulaire
          pour enregistrer un premier décaissement.
        </p>
      ) : depensesFiltrees.length === 0 ? (
        <p className="rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune dépense ne correspond à votre recherche.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Bénéficiaire</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Justificatif</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {depensesFiltrees.map((depense) => {
                const enConfirmation = aSupprimer === depense.id;
                return (
                  <tr
                    key={depense.id}
                    className="align-top transition-colors hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                      {formatDateISO(depense.dateDepense)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {depense.libelle}
                        </span>
                        {depense.description && (
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {depense.description}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          depense.type === "AFFECTEE_COTISATION"
                            ? "bg-violet-500/15 text-violet-300"
                            : "bg-sky-500/15 text-sky-300",
                        )}
                      >
                        {sourceLigne(depense)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {beneficiaireLigne(depense)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatMontant(depense.montant)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {depense.numeroPiece ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!exerciceCloture ? (
                          <>
                            <Link
                              href={`/finances/depenses?exercice=${exerciceId}&edition=${depense.id}#formulaire-depense`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              Modifier
                            </Link>

                            {enConfirmation ? (
                              <form
                                action={actionSuppression}
                                className="inline-flex items-center gap-1.5"
                              >
                                <input
                                  type="hidden"
                                  name="depenseId"
                                  value={depense.id}
                                  readOnly
                                />
                                <button
                                  type="submit"
                                  disabled={suppressionEnCours}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-60"
                                >
                                  {suppressionEnCours ? (
                                    <LoaderCircle
                                      className="h-3.5 w-3.5 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  )}
                                  Confirmer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setASupprimer(null)}
                                  className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  Annuler
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setASupprimer(depense.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-background px-2.5 py-1.5 text-xs font-medium text-red-400 outline-none transition-colors hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Supprimer
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Lecture seule
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
