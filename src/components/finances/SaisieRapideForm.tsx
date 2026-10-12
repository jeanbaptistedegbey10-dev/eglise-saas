"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  BadgeCheck,
  CheckCheck,
  CircleAlert,
  Coins,
  LoaderCircle,
  ListChecks,
  X,
} from "lucide-react";

import { enregistrerPaiementsRapides } from "@/actions/finance";
import { formatMontant, MODES_PAIEMENT } from "@/lib/finance";
import {
  initialPaiementsRapidesFormState,
  type MembreSaisieRapide,
  type PalierResume,
} from "@/types/finance";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

type Props = {
  exerciceId: string;
  typeCotisationId: string;
  typeCotisationLibelle: string;
  paliers: PalierResume[];
  palierActifId: string;
  membres: MembreSaisieRapide[];
  /** Aujourd'hui, calculé côté serveur (cohérence d'hydratation). */
  dateInitiale: string;
};

/**
 * Grille de saisie rapide : cochez les membres ayant versé le montant du
 * palier sélectionné, choisissez le mode de paiement, puis enregistrez tout
 * d'un coup. Les membres déjà à jour sont verrouillés (badge « Soldé »).
 */
export default function SaisieRapideForm({
  exerciceId,
  typeCotisationId,
  typeCotisationLibelle,
  paliers,
  palierActifId,
  membres,
  dateInitiale,
}: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    enregistrerPaiementsRapides,
    initialPaiementsRapidesFormState,
  );

  const [coches, setCoches] = useState<Set<string>>(() => new Set());

  const palierActif = paliers.find((palier) => palier.id === palierActifId) ?? paliers[0];
  const montantCible = palierActif?.montant ?? 0;

  const { vendus, enAttente } = useMemo(() => {
    const vendus: MembreSaisieRapide[] = [];
    const enAttente: MembreSaisieRapide[] = [];
    for (const membre of membres) {
      if (membre.totalVerse + 0.001 >= montantCible) vendus.push(membre);
      else enAttente.push(membre);
    }
    return { vendus, enAttente };
  }, [membres, montantCible]);

  const basculer = (membreId: string) => {
    setCoches((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(membreId)) suivant.delete(membreId);
      else suivant.add(membreId);
      return suivant;
    });
  };

  const cocherTous = () => setCoches(new Set(enAttente.map((membre) => membre.id)));
  const decocherTous = () => setCoches(new Set());

  // Après un enregistrement réussi : grille rafraîchie et coches remises à zéro.
  useEffect(() => {
    if (etat.success) {
      setCoches(new Set());
      router.refresh();
    }
  }, [etat, router]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="exerciceId" defaultValue={exerciceId} />
      <input type="hidden" name="typeCotisationId" defaultValue={typeCotisationId} />
      <input type="hidden" name="palierId" defaultValue={palierActif?.id ?? ""} />

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
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{etat.message}</span>
        </div>
      )}

      {/* Barre de paramètres du versement */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Cotisation</span>
          <span className="flex h-10 items-center rounded-lg bg-muted px-3 text-sm text-foreground">
            {typeCotisationLibelle}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Classe / palier</span>
          <span className="flex h-10 items-center justify-between gap-2 rounded-lg bg-muted px-3 text-sm text-foreground">
            <span>{palierActif?.libelleClasse ?? "—"}</span>
            <span className="font-semibold tabular-nums text-accent">
              {formatMontant(montantCible)}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rapide-mode" className="text-sm font-medium text-foreground">
            Mode de paiement<span className="ml-1 text-red-400">*</span>
          </label>
          <select id="rapide-mode" name="modePaiement" className={clsx(INPUT_BASE, "h-10")}>
            {MODES_PAIEMENT.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rapide-date" className="text-sm font-medium text-foreground">
            Date des versements
          </label>
          <input
            id="rapide-date"
            name="datePaiement"
            type="date"
            defaultValue={dateInitiale}
            className={clsx(INPUT_BASE, "h-10")}
          />
        </div>
      </div>

      {/* Barre d'outils de la grille */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cocherTous}
            disabled={enAttente.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden />
            Tout cocher ({enAttente.length})
          </button>
          <button
            type="button"
            onClick={decocherTous}
            disabled={coches.size === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Tout décocher
          </button>
        </div>

        <span className="rounded-full border border-card-border bg-muted px-3 py-1 text-xs text-muted-foreground">
          {coches.size} membre{coches.size > 1 ? "s" : ""} sélectionné
          {coches.size > 1 ? "s" : ""} · {vendus.length} déjà à jour
        </span>
      </div>

      {/* Grille à coches */}
      {membres.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-12 text-center">
          <ListChecks className="h-7 w-7 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">Aucun membre dans le répertoire</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Ajoutez des membres depuis le module Communauté pour utiliser la saisie rapide.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-12 px-4 py-3">
                  <span className="sr-only">Cocher</span>
                </th>
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">Prénoms</th>
                <th className="px-5 py-3 font-medium">Téléphone</th>
                <th className="px-5 py-3 text-right font-medium">Déjà versé</th>
                <th className="px-5 py-3 text-right font-medium">À verser</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {membres.map((membre) => {
                const estVendu = membre.totalVerse + 0.001 >= montantCible;
                const reste = Math.max(montantCible - membre.totalVerse, 0);

                return (
                  <tr
                    key={membre.id}
                    className={clsx(
                      "transition-colors",
                      estVendu ? "opacity-60" : "hover:bg-muted/40",
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        name="membreIds"
                        value={membre.id}
                        checked={estVendu ? true : coches.has(membre.id)}
                        disabled={estVendu}
                        onChange={() => basculer(membre.id)}
                        aria-label={`Enregistrer le versement de ${membre.prenoms} ${membre.nom}`}
                        className="h-4 w-4 rounded border-card-border accent-primary disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{membre.nom}</td>
                    <td className="px-5 py-3 text-foreground">{membre.prenoms}</td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">
                      {membre.telephone}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                      {membre.totalVerse > 0 ? formatMontant(membre.totalVerse) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                      {estVendu ? "—" : formatMontant(reste)}
                    </td>
                    <td className="px-5 py-3">
                      {estVendu ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                          Soldé
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          En attente
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pied : enregistrement groupé */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-card-border bg-card px-5 py-4 shadow-sm">
        <p className="text-xs text-muted-foreground">
          Montant par membre coché :{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatMontant(montantCible)}
          </span>{" "}
          ({palierActif?.libelleClasse ?? "barème"} · {typeCotisationLibelle}). Les membres déjà
          à jour sont ignorés automatiquement.
        </p>
        <button
          type="submit"
          disabled={enCours || coches.size === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {enCours ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Coins className="h-4 w-4" aria-hidden />
          )}
          {enCours
            ? "Enregistrement…"
            : `Enregistrer ${coches.size} versement${coches.size > 1 ? "s" : ""}`}
        </button>
      </div>
    </form>
  );
}


