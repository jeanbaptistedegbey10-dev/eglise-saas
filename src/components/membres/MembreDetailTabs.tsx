"use client";

import { useState } from "react";
import clsx from "clsx";
import { Coins, HeartHandshake, Lock, ShieldCheck, type LucideIcon } from "lucide-react";

import { formatMontant } from "@/lib/membre";
import type { AideFiche, PaiementFiche } from "@/types/membre";

// ---------------------------------------------------------------------------
// Les 2 grands onglets de la fiche membre
// ---------------------------------------------------------------------------

const ONGLETS = [
  { id: "contributions", label: "Contributions & Participations", icon: Coins },
  { id: "solidarite", label: "Solidarité & Aides reçues", icon: HeartHandshake },
] as const;

type OngletId = (typeof ONGLETS)[number]["id"];

type Props = {
  paiements: PaiementFiche[];
  aides: AideFiche[];
};

// ---------------------------------------------------------------------------
// Primitives d'affichage
// ---------------------------------------------------------------------------

function StatCard({ label, valeur, sousTitre }: { label: string; valeur: string; sousTitre?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{valeur}</span>
      {sousTitre && <span className="text-xs text-muted-foreground">{sousTitre}</span>}
    </div>
  );
}

function EtatVide({
  icon: Icone,
  titre,
  description,
}: {
  icon: LucideIcon;
  titre: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icone className="h-6 w-6 text-muted-foreground" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{titre}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function MembreDetailTabs({ paiements, aides }: Props) {
  const [actif, setActif] = useState<OngletId>("contributions");

  const total = paiements.reduce((somme, paiement) => somme + paiement.montant, 0);

  return (
    <section className="flex flex-col gap-6" aria-label="Historique du membre">
      {/* Grands onglets */}
      <div role="tablist" aria-label="Sections de la fiche" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ONGLETS.map((onglet) => {
          const Icone = onglet.icon;
          const estActif = onglet.id === actif;
          const compteur = onglet.id === "contributions" ? paiements.length : aides.length;

          return (
            <button
              key={onglet.id}
              type="button"
              role="tab"
              id={`grand-tab-${onglet.id}`}
              aria-selected={estActif}
              aria-controls={`grand-panel-${onglet.id}`}
              onClick={() => setActif(onglet.id)}
              className={clsx(
                "flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                estActif
                  ? "border-primary bg-primary/15 text-foreground shadow-md shadow-primary/10"
                  : "border-card-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    estActif ? "bg-primary/25 text-accent" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icone className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-medium">{onglet.label}</span>
              </span>
              <span
                className={clsx(
                  "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums",
                  estActif ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {compteur}
              </span>
            </button>
          );
        })}
      </div>

      {/* Onglet 1 — Contributions & Participations */}
      {actif === "contributions" && (
        <div
          id="grand-panel-contributions"
          role="tabpanel"
          aria-labelledby="grand-tab-contributions"
          className="flex flex-col gap-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Total versé"
              valeur={formatMontant(total)}
              sousTitre={`${paiements.length} participation${paiements.length > 1 ? "s" : ""}`}
            />
            <StatCard
              label="Dernière contribution"
              valeur={paiements[0]?.dateAffichee ?? "—"}
              sousTitre={paiements[0]?.typeCotisation}
            />
            <StatCard
              label="Types de cotisation"
              valeur={String(new Set(paiements.map((paiement) => paiement.typeCotisation)).size)}
              sousTitre="Engagements distincts"
            />
          </div>

          {paiements.length === 0 ? (
            <EtatVide
              icon={Coins}
              titre="Aucune contribution enregistrée"
              description="Les paiements de ce membre apparaîtront ici dès la première cotisation enregistrée."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Cotisation</th>
                    <th className="px-5 py-3 font-medium">Exercice</th>
                    <th className="px-5 py-3 font-medium">Mode</th>
                    <th className="px-5 py-3 text-right font-medium">Montant</th>
                    <th className="px-5 py-3 font-medium">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {paiements.map((paiement) => (
                    <tr key={paiement.id} className="transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                        {paiement.dateAffichee}
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">
                        {paiement.typeCotisation}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{paiement.exercice}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full border border-card-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          {paiement.modePaiement}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                        {formatMontant(paiement.montant)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{paiement.commentaire ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-card-border bg-muted/40 text-sm">
                    <td colSpan={4} className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Total des contributions
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatMontant(total)}
                    </td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}


      {/* Onglet 2 — Solidarité & Aides reçues (traçabilité confidentielle) */}
      {actif === "solidarite" && (
        <div
          id="grand-panel-solidarite"
          role="tabpanel"
          aria-labelledby="grand-tab-solidarite"
          className="flex flex-col gap-5"
        >
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Espace confidentiel</p>
              <p className="text-amber-100/80">
                Historique des aides reçues par ce membre. Accès réservé aux responsables
                habilités — ces informations ne doivent pas être partagées en dehors du suivi
                pastoral.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              label="Aides reçues"
              valeur={String(aides.length)}
              sousTitre={
                aides.length > 0 ? `Dernière : ${aides[0].dateAffichee}` : "Aucune aide enregistrée"
              }
            />
            <StatCard
              label="Dernier motif"
              valeur={aides[0]?.motif ?? "—"}
              sousTitre={aides[0]?.montantOuNature}
            />
          </div>

          {aides.length === 0 ? (
            <EtatVide
              icon={HeartHandshake}
              titre="Aucune aide reçue"
              description="Les aides et solidarités accordées à ce membre seront tracées ici, de façon confidentielle."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {aides.map((aide) => (
                <li key={aide.id} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-foreground">{aide.motif}</p>
                      <p className="text-xs text-muted-foreground">{aide.dateAffichee}</p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-accent">
                      {aide.montantOuNature}
                    </span>
                  </div>

                  {aide.notesConflictuelles && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                      <span>
                        <span className="font-medium text-foreground">Notes de suivi (confidentiel) : </span>
                        {aide.notesConflictuelles}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

