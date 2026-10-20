import { CalendarRange, Wallet } from "lucide-react";

import type { ConfigurationEglise } from "@/lib/configuration-eglise";
import { MOIS_LIBELLES } from "@/lib/mois";
import { ErreurChamp, inputCls } from "@/components/parametres/BlocCoordonnees";

type Props = {
  initiale?: Partial<ConfigurationEglise>;
  erreurs?: Record<string, string[]>;
};

/**
 * Onglet 3 — Devise & Exercice : devise d'affichage (XOF/FCFA par défaut),
 * symbole monétaire et mois de début de l'exercice comptable.
 */
export default function BlocDevise({ initiale = {}, erreurs = {} }: Props) {
  return (
    <section
      aria-label="Devise & exercice"
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm sm:p-6"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Wallet className="h-4 w-4 text-accent" aria-hidden />
        Devise &amp; exercice
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Devise d&apos;affichage</span>
          <select name="devise" defaultValue={initiale?.devise ?? "XOF"} className={inputCls}>
            <option value="XOF">Franc CFA (XOF) — FCFA</option>
            <option value="XAF">Franc CFA central (XAF) — FCFA</option>
            <option value="EUR">Euro (EUR) — €</option>
            <option value="USD">Dollar américain (USD) — $</option>
          </select>
          <ErreurChamp message={erreurs?.devise} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Symbole affiché</span>
          <input type="text" name="symboleDevise" defaultValue={initiale?.symboleDevise} maxLength={6} placeholder="FCFA" className={inputCls} />
          <ErreurChamp message={erreurs?.symboleDevise} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Mois de début d&apos;exercice</span>
          <select
            name="moisDebutExercice"
            defaultValue={String(initiale?.moisDebutExercice ?? 1)}
            className={inputCls}
          >
            {MOIS_LIBELLES.map((libelleMois, index) => (
              <option key={libelleMois} value={index + 1}>
                {libelleMois} ({index + 1})
              </option>
            ))}
          </select>
          <ErreurChamp message={erreurs?.moisDebutExercice} />
        </label>
        <p className="flex items-start gap-2 self-end text-xs text-muted-foreground">
          <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Le mois de début sert de référence à la création des exercices comptables
          (voir Finances → Exercices).
        </p>
      </div>
    </section>
  );
}
