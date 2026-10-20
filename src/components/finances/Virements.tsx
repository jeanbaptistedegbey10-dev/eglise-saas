"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, MoveRight, Wallet } from "lucide-react";

import {
  completerCotisationDepuisCaisse,
  transfererCotisationVersCaisse,
  virerEntreCaisses,
} from "@/actions/caisse";
import { initialCaisseFormState } from "@/types/caisse";
import { formatDateISO, formatMontant } from "@/lib/membre";
import type { VirementTraceLigne } from "@/lib/caisse";

const INPUT =
  "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40";

type CotisationAvecSolde = {
  id: string;
  nom: string;
  soldeDisponible: number;
  estCloture: boolean;
};

type Mode = "cotisation-vers-caisse" | "caisse-vers-cotisation" | "caisse-vers-caisse";

const MODES: { id: Mode; label: string; description: string; icon: LucideIcon }[] = [
  {
    id: "cotisation-vers-caisse",
    label: "Cotisation vers Caisse",
    description: "Reversement de fonds collectés vers une caisse interne.",
    icon: ArrowRight,
  },
  {
    id: "caisse-vers-cotisation",
    label: "Caisse vers Cotisation (Complément)",
    description: "Appoint tiré d'une caisse pour combler une collecte insuffisante.",
    icon: MoveRight,
  },
  {
    id: "caisse-vers-caisse",
    label: "Virement inter-caisses",
    description: "Déplacement de trésorerie d'une caisse A vers une caisse B.",
    icon: Wallet,
  },
];

type Props = {
  caisses: { id: string; nom: string; soldeActuel: number }[];
  cotisations: CotisationAvecSolde[];
  traces: VirementTraceLigne[];
  totalTraces: number;
};

export default function Virements({ caisses, cotisations, traces, totalTraces }: Props) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("cotisation-vers-caisse");

  // --- Mode A : cotisation vers caisse ---
  const [etatA, actionA, enCoursA] = useActionState(
    (_e: unknown, fd: FormData) => transfererCotisationVersCaisse(fd),
    initialCaisseFormState,
  );
  // --- Mode B : caisse vers cotisation (complément) ---
  const [etatB, actionB, enCoursB] = useActionState(
    (_e: unknown, fd: FormData) => completerCotisationDepuisCaisse(fd),
    initialCaisseFormState,
  );
  // --- Mode C : virement inter-caisses ---
  const [etatC, actionC, enCoursC] = useActionState(
    (_e: unknown, fd: FormData) => virerEntreCaisses(fd),
    initialCaisseFormState,
  );

  const cotisationsOuvertes = useMemo(
    () => cotisations.filter((c) => !c.estCloture && c.soldeDisponible > 0),
    [cotisations],
  );

  return (
    <section aria-label="Virements et compléments" className="flex flex-col gap-4">
      {/* Sélecteur de mode d'opération */}
      <div className="rounded-xl border border-card-border bg-card p-3">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => {
            const actif = mode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={actif}
                className={clsx(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                  actif
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-card-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {MODES.find((m) => m.id === mode)?.description}
        </p>
      </div>

      {/* Formulaire : Mode A — Cotisation vers Caisse */}
      {mode === "cotisation-vers-caisse" && (
        <div className="rounded-xl border border-card-border bg-card shadow-sm p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                Reversement cotisation → caisse
              </h2>
              <p className="text-xs text-muted-foreground">
                Projet annulé ou surplus : reversement de fonds collectés vers une caisse interne.
              </p>
            </div>
          </div>
          <form action={actionA} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Cotisation source *</label>
              <select name="cotisationId" required className={INPUT}>
                <option value="">Sélectionner une cotisation…</option>
                {cotisationsOuvertes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} — {formatMontant(c.soldeDisponible)} FCFA dispo.
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Caisse destination *</label>
              <select name="caisseId" required className={INPUT}>
                <option value="">Sélectionner une caisse…</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({formatMontant(c.soldeActuel)} FCFA)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">Montant (FCFA) *</label>
              <input name="montant" type="number" min="0" step="0.01" required className={INPUT} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">Motif</label>
              <input
                name="motif"
                type="text"
                maxLength={300}
                placeholder="Ex. Projet annulé – reversement vers Caisse Travaux"
                className={INPUT}
              />
            </div>
            {!etatA.success && etatA.message && (
              <p className="col-span-4 text-xs text-red-400">{etatA.message}</p>
            )}
            {etatA.success && <p className="col-span-4 text-xs text-emerald-400">{etatA.message}</p>}
            <div className="col-span-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => router.refresh()}
                disabled={enCoursA}
                className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                Réinitialiser
              </button>
              <button
                type="submit"
                disabled={enCoursA}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {enCoursA ? "Transfert…" : "Valider le reversement"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulaire : Mode B — Caisse vers Cotisation (Complément) */}
      {mode === "caisse-vers-cotisation" && (
        <div className="rounded-xl border border-card-border bg-card shadow-sm p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MoveRight className="h-3.5 w-3.5" aria-hidden />
                Complement caisse → cotisation
              </h2>
              <p className="text-xs text-muted-foreground">
                Appoint tiré d'une caisse pour combler une collecte insuffisante (ex. complément loyer).
              </p>
            </div>
          </div>
          <form action={actionB} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Caisse source *</label>
              <select name="caisseId" required className={INPUT}>
                <option value="">Sélectionner une caisse…</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({formatMontant(c.soldeActuel)} FCFA)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Cotisation destination *</label>
              <select name="cotisationId" required className={INPUT}>
                <option value="">Sélectionner une cotisation…</option>
                {cotisations.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.estCloture}>
                    {c.nom} ({formatMontant(c.soldeDisponible)} FCFA dispo.)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">Montant (FCFA) *</label>
              <input name="montant" type="number" min="0" step="0.01" required className={INPUT} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">Motif</label>
              <input
                name="motif"
                type="text"
                maxLength={300}
                placeholder="Ex. Complément loyer – cotisation Mensualités"
                className={INPUT}
              />
            </div>
            {!etatB.success && etatB.message && (
              <p className="col-span-4 text-xs text-red-400">{etatB.message}</p>
            )}
            {etatB.success && <p className="col-span-4 text-xs text-emerald-400">{etatB.message}</p>}
            <div className="col-span-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => router.refresh()}
                disabled={enCoursB}
                className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                Réinitialiser
              </button>
              <button
                type="submit"
                disabled={enCoursB}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {enCoursB ? "Versement…" : "Valider le complément"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulaire : Mode C — Virement inter-caisses */}
      {mode === "caisse-vers-caisse" && (
        <div className="rounded-xl border border-card-border bg-card shadow-sm p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" aria-hidden />
                Virement entre caisses
              </h2>
              <p className="text-xs text-muted-foreground">
                Déplacement de trésorerie d'une caisse A vers une caisse B.
              </p>
            </div>
          </div>
          <form action={actionC} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Caisse source (débit) *</label>
              <select name="caisseSourceId" required className={INPUT}>
                <option value="">Sélectionner la caisse source…</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({formatMontant(c.soldeActuel)} FCFA)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Caisse destination (crédit) *</label>
              <select name="caisseDestinationId" required className={INPUT}>
                <option value="">Sélectionner la caisse destination…</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({formatMontant(c.soldeActuel)} FCFA)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">Montant (FCFA) *</label>
              <input name="montant" type="number" min="0" step="0.01" required className={INPUT} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">Motif</label>
              <input
                name="motif"
                type="text"
                maxLength={300}
                placeholder="Ex. Trésorerie excédentaire vers Caisse Travaux"
                className={INPUT}
              />
            </div>
            {!etatC.success && etatC.message && (
              <p className="col-span-4 text-xs text-red-400">{etatC.message}</p>
            )}
            {etatC.success && <p className="col-span-4 text-xs text-emerald-400">{etatC.message}</p>}
            <div className="col-span-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => router.refresh()}
                disabled={enCoursC}
                className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                Réinitialiser
              </button>
              <button
                type="submit"
                disabled={enCoursC}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {enCoursC ? "Virement…" : "Valider le virement"}
              </button>
            </div>
          </form>
        </div>
      )}




      {/* Tableau de traçabilité des opérations */}
      <div className="rounded-xl border border-card-border bg-card shadow-sm">
        <div className="border-b border-card-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" aria-hidden /> Traçabilité des opérations
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {formatMontant(totalTraces)} FCFA
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type d'opération</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2 text-right">Montant (FCFA)</th>
                <th className="px-3 py-2">Motif</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((t) => (
                <tr key={t.id} className="border-t border-card-border">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.date}</td>
                  <td className="px-3 py-2 text-xs">{t.type}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.source}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.destination}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-600">
                    {formatMontant(t.montant)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.motif}</td>
                </tr>
              ))}
              {traces.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-xs text-muted-foreground">
                    Aucune opération de virement enregistrée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
