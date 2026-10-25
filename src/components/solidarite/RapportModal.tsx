"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Filter, Printer, X, Clock } from "lucide-react";
import type { Exercice } from "@/generated/prisma/client";
import { formatMontant } from "@/lib/membre";
import { obtenirRapportMembre } from "@/actions/solidarite";
import type {
  MembreOption,
  RapportMembreDonnees,
} from "@/types/solidarite";

type ModeRapport = "exercice" | "historique";

type Props = {
  open: boolean;
  membres: MembreOption[];
  membrePreselectionne: MembreOption | null;
  modeInitial: ModeRapport;
  exerciceIdInitial: string | null;
  exercices: Exercice[];
  onFermer: () => void;
};

const INPUT =
  "flex w-full rounded-lg border border-card-border bg-background px-3 h-10 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";
const BADGE_STATUT: Record<string, string> = {
  RECURRENT: "bg-emerald-50/15 text-emerald-600 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30",
  PONCTUEL: "bg-amber-50/15 text-amber-600 dark:text-amber-400 border border-amber-100/60 dark:border-amber-900/30",
};

export default function RapportModal({
  open,
  membres,
  membrePreselectionne,
  modeInitial,
  exerciceIdInitial,
  exercices,
  onFermer,
}: Props) {
  const [membreId, setMembreId] = useState(membrePreselectionne?.id ?? "");
  const [mode, setMode] = useState<ModeRapport>(modeInitial);
  const [exerciceId, setExerciceId] = useState<string | null>(
    modeInitial === "exercice" ? exerciceIdInitial : null,
  );
  const [data, setData] = useState<RapportMembreDonnees | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filtreRecurrent, setFiltreRecurrent] = useState(false);

  const membreSel = useMemo(
    () => membres.find((m) => m.id === membreId) ?? null,
    [membres, membreId],
  );

  const exerciceSel = useMemo(
    () => (exercices ?? []).find((e) => e.id === exerciceId) ?? null,
    [exercices, exerciceId],
  );

  const chargerRapport = useCallback(async () => {
    if (!membreId) {
      setData(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resultat = await obtenirRapportMembre({
        membreId,
        exerciceId:
          mode === "exercice"
            ? exerciceId ?? (exercices ?? []).find((e) => !e.cloture)?.id ?? null
            : null,
      });
      if ("erreur" in resultat) {
        setError(resultat.erreur);
        setData(null);
      } else {
        setData(resultat);
      }
    } catch (e) {
      setError("Impossible de charger le rapport. Réessayez.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [membreId, mode, exerciceId]);
  useEffect(() => {
    if (!open) {
      setData(null);
      setError("");
      setFiltreRecurrent(false);
      setMembreId(membrePreselectionne?.id ?? membres[0]?.id ?? "");
      setMode(modeInitial);
      setExerciceId(modeInitial === "exercice" ? exerciceIdInitial : null);
      return;
    }
    chargerRapport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, membreId, mode, exerciceId, chargerRapport]);

  const libelleMode = useMemo(() => {
    if (data?.historique) return "Historique global (depuis l'adhésion)";
    if (data?.exerciceLibelle) return data.exerciceLibelle;
    if (exerciceSel) return `${exerciceSel.libelle} (${exerciceSel.annee})`;
    return "Sélectionner un exercice";
  }, [data, exerciceSel]);

  const cotisationsAffichees = useMemo(() => {
    if (!data) return [];
    if (!filtreRecurrent) return data.cotisations;
    return data.cotisations.filter((c) => c.statut === "RECURRENT");
  }, [data, filtreRecurrent]);

  const imprimer = () => {
    window.print();
  };

  if (!open) return null;

  return createPortal(
    <div
      className="rapport-print-root fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8"
      aria-hidden="true"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer le fond"
        className="absolute inset-0 bg-black/60 print:hidden"
        onClick={onFermer}
      />
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Rapport de solidarité"
      >
        <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4 shrink-0">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              Rapport de solidarité
            </p>
            <h3 className="text-lg font-semibold text-foreground">
              {membreSel ? `${membreSel.prenoms} ${membreSel.nom}` : "—"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Tel : {membreSel?.telephone ?? "—"} &nbsp;|&nbsp;{' '}
              <span className="font-medium">{libelleMode}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={imprimer}
              aria-label="Imprimer / Exporter PDF"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />Imprimer / Exporter PDF
            </button>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-4 shrink-0 print:overflow-visible print:max-h-none">
          <section className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-xl border bg-card px-4 py-3 shrink-0 print:hidden">
            <div className="flex flex-col gap-1 sm:flex-1">
              <label htmlFor="rapport-membre" className="text-xs font-medium text-muted-foreground">
                Membre
              </label>
              <select
                id="rapport-membre"
                value={membreId}
                onChange={(e) => setMembreId(e.target.value)}
                className={INPUT}
              >
                <option value="">Tous les membres — sélectionner…</option>
                {membres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.prenoms} {m.nom} — {m.telephone}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:flex-1">
              <label htmlFor="rapport-mode" className="text-xs font-medium text-muted-foreground">
                Type de rapport
              </label>
              <select
                id="rapport-mode"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as ModeRapport);
                  setExerciceId(
                    e.target.value === "exercice" ? exerciceIdInitial : null,
                  );
                }}
                className={INPUT}
              >
                <option value="exercice">Rapport par exercice</option>
                <option value="historique">Rapport global (Historique)</option>
              </select>
            </div>
            {mode === "exercice" && (
              <div className="flex flex-col gap-1 sm:flex-1">
                <label htmlFor="rapport-exercice" className="text-xs font-medium text-muted-foreground">
                  Exercice
                </label>
                <select
                  id="rapport-exercice"
                  value={exerciceId ?? ""}
                  onChange={(e) =>
                    setExerciceId(e.target.value ? e.target.value : null)
                  }
                  className={INPUT}
                  disabled={!exercices.length}
                >
                  <option value="">— Exercice en cours —</option>
                  {exercices.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.libelle} ({e.annee}){e.cloture ? " — clôturé" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {mode === "historique" && (
              <div className="flex items-end gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Cumul depuis l'adhésion (tous exercices)
                </span>
              </div>
            )}
          </section>
          {error ? (
            <div role="alert" className="flex gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 shrink-0">
              <span className="h-4 w-4 shrink-0" aria-hidden>!</span>
              <span>{error}</span>
            </div>
          ) : null}

          {loading && !data ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 shrink-0">
              <Clock className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Chargement du rapport…</p>
            </div>
          ) : null}

          {data && (
            <>
              <section aria-label="Informations du membre" className="flex flex-col gap-1.5 shrink-0 print:break-inside-avoid">
                <h4 className="text-sm font-semibold text-foreground">
                  1 — Informations du membre
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-sm border border-card-border rounded-xl p-3 bg-muted/50">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Nom</span>
                    <span className="font-medium">{data.membre.nom}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Prénom(s)</span>
                    <span className="font-medium">{data.membre.prenoms}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Téléphone</span>
                    <span className="font-medium tabular-nums">{data.membre.telephone}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Périmètre</span>
                    <span className="font-medium">{data.historique ? "Historique global" : libelleMode}</span>
                  </div>
                </div>
              </section>
              <section aria-label="Cotisations versées" className="flex flex-col gap-3 shrink-0 print:break-inside-avoid">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    2 — Cotisations versées
                  </h4>
                  <button
                    type="button"
                    onClick={() => setFiltreRecurrent((f) => !f)}
                    aria-pressed={filtreRecurrent}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      filtreRecurrent
                        ? "bg-emerald-50/60 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-card text-muted-foreground border-card-border hover:bg-muted"
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" aria-hidden />
                    {filtreRecurrent ? "Tous les types" : "Récurrentes uniquement"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {cotisationsAffichees.length} versement(s) affiché(s)
                  {filtreRecurrent ? " (filtre : récurrentes)" : ""}.
                </p>
                <div className="overflow-x-auto rounded-2xl border border-card-border shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5 font-medium">Type de cotisation</th>
                        <th className="px-4 py-2.5 font-medium">Date exacte</th>
                        <th className="px-4 py-2.5 text-right font-medium">Montant (FCFA)</th>
                        <th className="px-4 py-2.5 font-medium">Statut</th>
                        <th className="px-4 py-2.5 font-medium">Mode de paiement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {cotisationsAffichees.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Aucune cotisation enregistrée pour ce périmètre.
                          </td>
                        </tr>
                      ) : (
                        cotisationsAffichees.map((ligne) => (
                          <tr key={ligne.id} className="hover:bg-muted/40">
                            <td className="px-4 py-2.5 font-medium text-foreground">{ligne.typeCotisation}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                              {ligne.dateAffichee}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-foreground">
                              {formatMontant(ligne.montant)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_STATUT[ligne.statut]}`}>
                                {ligne.statut === "RECURRENT" ? "Récurrent" : "Ponctuel"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                              {ligne.modePaiement ? (
                                <span className="capitalize">{ligne.modePaiement.toLowerCase()}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              {/* Section 3 — Aides et soutiens perçus. */}
              <section aria-label="Aides perçues" className="flex flex-col gap-3 shrink-0 print:break-inside-avoid">
                <h4 className="text-sm font-semibold text-foreground">
                  3 — Aides et soutiens perçus
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-card-border shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5 font-medium">Type d'aide</th>
                        <th className="px-4 py-2.5 font-medium">Date exacte</th>
                        <th className="px-4 py-2.5 text-right font-medium">Montant reçu (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {data.aides.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Aucune aide perçue pour ce périmètre.
                          </td>
                        </tr>
                      ) : (
                        data.aides.map((ligne) => (
                          <tr key={ligne.id} className="hover:bg-muted/40">
                            <td className="px-4 py-2.5 font-medium text-foreground">{ligne.typeAide}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                              {ligne.dateAffichee}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">
                              {formatMontant(ligne.montant)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 4 — Synthèse financière. */}
              <section aria-label="Synthèse financière" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 shrink-0 print:break-inside-avoid">
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">Cumul des versements</p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {formatMontant(data.synthese.totalVersements)} FCFA
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.synthese.nbVersements} versement(s)
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">Cumul des aides perçues</p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {formatMontant(data.synthese.totalAides)} FCFA
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.synthese.nbAides} soutien(s)
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">Moyenne par versement</p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {formatMontant(data.synthese.moyenneVersement)} FCFA
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.synthese.nbVersements > 0 ? "sur " + data.synthese.nbVersements : "—"}
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">Moyenne par soutien</p>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {formatMontant(data.synthese.moyenneAide)} FCFA
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.synthese.nbAides > 0 ? "sur " + data.synthese.nbAides : "—"}
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}