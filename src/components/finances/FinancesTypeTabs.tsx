"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  type LucideIcon,
  Coins,
  HandCoins,
  Landmark,
  ScrollText,
  Settings2,
} from "lucide-react";

import PaiementAnonymeForm from "@/components/finances/PaiementAnonymeForm";
import {
  CATEGORIES_FINANCES,
  type CategorieFinancesId,
  formatMontant,
  libelleTypeCotisation,
} from "@/lib/finance";
import type { ResumeFinances, TypeCotisationResume } from "@/types/finance";

const ICONES_CATEGORIE: Record<CategorieFinancesId, LucideIcon> = {
  OBLIGATOIRE_BAREME: Landmark,
  VOLONTAIRE_CAMPAGNE: HandCoins,
  QUETE_ANONYME: Coins,
};

type Props = {
  resume: ResumeFinances;
  /** Aujourd'hui, calculé côté serveur (cohérence d'hydratation). */
  dateInitiale: string;
};

function EtatVideCategorie({ categorie }: { categorie: CategorieFinancesId }) {
  const descriptions: Record<CategorieFinancesId, string> = {
    OBLIGATOIRE_BAREME:
      "Créez un type de cotisation obligatoire puis configurez ses classes (barème) depuis la page Barèmes.",
    VOLONTAIRE_CAMPAGNE:
      "Créez une campagne depuis la page Barèmes pour collecter des dons volontaires.",
    QUETE_ANONYME:
      "Créez une quête depuis la page Barèmes, puis enregistrez les collectes anonymes ci-dessous.",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">Aucune cotisation dans cette catégorie</p>
      <p className="max-w-md text-xs text-muted-foreground">{descriptions[categorie]}</p>
      <Link
        href="/finances/baremes"
        className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
        Gérer les barèmes
      </Link>
    </div>
  );
}

function TableauTypes({ types }: { types: TypeCotisationResume[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-medium">Cotisation</th>
            <th className="px-5 py-3 font-medium">Barème (classes)</th>
            <th className="px-5 py-3 text-right font-medium">Versements</th>
            <th className="px-5 py-3 text-right font-medium">Total</th>
            <th className="px-5 py-3 text-right font-medium">Dont anonyme</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {types.map((type) => (
            <tr key={type.id} className="transition-colors hover:bg-muted/40">
              <td className="px-5 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">{type.libelle}</span>
                  <span className="text-xs text-muted-foreground">
                    {type.description ?? libelleTypeCotisation(type.type)}
                  </span>
                </div>
              </td>
              <td className="px-5 py-3">
                {type.paliers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {type.paliers.map((palier) => (
                      <span
                        key={palier.id}
                        className="inline-flex items-center gap-1 rounded-full border border-card-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {palier.libelleClasse}
                        <span className="font-medium tabular-nums text-foreground">
                          {formatMontant(palier.montant)}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                {type.nombrePaiements}
              </td>
              <td className="px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                {formatMontant(type.totalVerse)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                {type.totalAnonyme > 0 ? formatMontant(type.totalAnonyme) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant : 3 onglets (obligatoires / volontaires / quêtes)
// ---------------------------------------------------------------------------

export default function FinancesTypeTabs({ resume, dateInitiale }: Props) {
  const [actif, setActif] = useState<CategorieFinancesId>("OBLIGATOIRE_BAREME");

  const typesCategorie = resume.types.filter((type) => type.type === actif);

  return (
    <section className="flex flex-col gap-6" aria-label="Détail par catégorie">
      <div
        role="tablist"
        aria-label="Catégories de cotisations"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {CATEGORIES_FINANCES.map((categorie) => {
          const Icone = ICONES_CATEGORIE[categorie.id];
          const estActif = categorie.id === actif;
          const sousTotal =
            categorie.id === "OBLIGATOIRE_BAREME"
              ? resume.obligatoires
              : categorie.id === "VOLONTAIRE_CAMPAGNE"
                ? resume.volontaires
                : resume.quetes;

          return (
            <button
              key={categorie.id}
              type="button"
              role="tab"
              id={`fin-tab-${categorie.id}`}
              aria-selected={estActif}
              aria-controls={`fin-panel-${categorie.id}`}
              onClick={() => setActif(categorie.id)}
              className={clsx(
                "flex flex-col gap-3 rounded-2xl border px-5 py-4 text-left text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                estActif
                  ? "border-primary/60 bg-primary/10 shadow-sm"
                  : "border-card-border bg-card hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    estActif ? "bg-primary/20 text-accent" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icone className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span
                  className={clsx(
                    "text-sm font-semibold",
                    estActif ? "text-foreground" : "text-foreground",
                  )}
                >
                  {categorie.label}
                </span>
              </span>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {formatMontant(sousTotal.total)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {sousTotal.nombrePaiements} versement
                  {sousTotal.nombrePaiements > 1 ? "s" : ""} · {sousTotal.nombreTypes} type
                  {sousTotal.nombreTypes > 1 ? "s" : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`fin-panel-${actif}`}
        role="tabpanel"
        aria-labelledby={`fin-tab-${actif}`}
        className="flex flex-col gap-5"
      >
        {typesCategorie.length === 0 ? (
          <EtatVideCategorie categorie={actif} />
        ) : (
          <TableauTypes types={typesCategorie} />
        )}

        {actif === "OBLIGATOIRE_BAREME" && (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/finances/saisie-rapide"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ScrollText className="h-4 w-4" aria-hidden />
              Saisie rapide des versements
            </Link>
            <Link
              href="/finances/baremes"
              className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              Configurer les barèmes
            </Link>
          </div>
        )}

        {actif === "VOLONTAIRE_CAMPAGNE" && (
          <PaiementAnonymeForm
            exerciceId={resume.exercice.id}
            types={resume.types
              .filter((type) => type.type === "VOLONTAIRE_CAMPAGNE")
              .map((type) => ({ id: type.id, libelle: type.libelle, type: type.type }))}
            dateInitiale={dateInitiale}
            contexte="don"
          />
        )}

        {actif === "QUETE_ANONYME" && (
          <PaiementAnonymeForm
            exerciceId={resume.exercice.id}
            types={resume.types
              .filter((type) => type.type === "QUETE_ANONYME")
              .map((type) => ({ id: type.id, libelle: type.libelle, type: type.type }))}
            dateInitiale={dateInitiale}
            contexte="quete"
          />
        )}
      </div>
    </section>
  );
}
