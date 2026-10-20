"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { BadgeCheck, Download, Hourglass, MinusCircle } from "lucide-react";

import { telechargerRecuPDF, type DonneesRecu } from "@/lib/recu-pdf";
import { formatMontant } from "@/lib/finance";
import type { LigneQuiADonne, VersementRecu } from "@/types/rapport";

type Props = {
  lignes: LigneQuiADonne[];
  versementsParMembre: Record<string, VersementRecu[]>;
  exerciceLibelle: string;
  exerciceAnnee: number;
  cotisationLibelle: string | null;
  classeLibelle: string | null;
  avecAttendu: boolean;
};

const STYLES_STATUT: Record<LigneQuiADonne["statut"], string> = {
  SOLDE: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  PARTIEL: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  RIEN_VERSE: "bg-red-500/15 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  CONTRIBUTEUR: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  SANS_VERSEMENT: "bg-muted text-muted-foreground",
};

const ICONES_STATUT = {
  SOLDE: BadgeCheck,
  PARTIEL: Hourglass,
  RIEN_VERSE: MinusCircle,
  CONTRIBUTEUR: BadgeCheck,
  SANS_VERSEMENT: MinusCircle,
} as const;

/**
 * Tableau « Qui a donné » : chaque membre, son total versé, l'attendu
 * (palier filtré) et le reste à payer — avec reçu PDF individuel.
 */
export default function TableauQuiADonne({
  lignes,
  versementsParMembre,
  exerciceLibelle,
  exerciceAnnee,
  cotisationLibelle,
  classeLibelle,
  avecAttendu,
}: Props) {
  const [recherche, setRecherche] = useState("");

  const lignesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (terme.length === 0) return lignes;
    return lignes.filter((l) =>
      `${l.prenoms} ${l.nom}`.toLowerCase().includes(terme),
    );
  }, [lignes, recherche]);
  if (lignes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">Aucun membre à afficher</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Enregistrez des membres ou ajustez les filtres pour voir le « Qui a donné ».
        </p>
      </div>
    );
  }

  const exporter = (ligne: LigneQuiADonne) => {
    const donnees: DonneesRecu = {
      membreNom: ligne.nom,
      membrePrenoms: ligne.prenoms,
      membreTelephone: ligne.telephone,
      exerciceLibelle,
      exerciceAnnee,
      cotisationLibelle,
      classeLibelle,
      montantAttendu: ligne.montantAttendu,
      totalVerse: ligne.totalVerse,
      resteAPayer: ligne.resteAPayer,
      versements: versementsParMembre[ligne.membreId] ?? [],
    };
    telechargerRecuPDF(donnees);
  };

  /** Badge simplifié : vert « À jour » ou ambre « Retard / Partiel ». */
  const badgeSimplifie = (ligne: LigneQuiADonne): { texte: string; classe: string } => {
    if (ligne.statut === "SOLDE" || (ligne.totalVerse > 0 && ligne.resteAPayer !== null && ligne.resteAPayer <= 0)) {
      return { texte: "À jour", classe: STYLES_STATUT.SOLDE };
    }
    if (ligne.statut === "CONTRIBUTEUR" && !avecAttendu) {
      return { texte: "À jour", classe: STYLES_STATUT.SOLDE };
    }
    if (ligne.totalVerse > 0) {
      return { texte: "Retard / Partiel", classe: STYLES_STATUT.PARTIEL };
    }
    return { texte: "Retard / Partiel", classe: STYLES_STATUT.PARTIEL };
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <label htmlFor="tableau-recherche-membre" className="text-xs font-medium text-muted-foreground">
          Rechercher (nom / prénom, temps réel)
        </label>
        <input
          id="tableau-recherche-membre"
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Ex. Yao…"
          className="h-9 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none"
        />
      </div>
    <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-medium">Membre</th>
            <th className="px-5 py-3 text-right font-medium">Cotisé</th>
            {avecAttendu && <th className="px-5 py-3 text-right font-medium">Attendu</th>}
            {avecAttendu && <th className="px-5 py-3 text-right font-medium">Reste</th>}
            <th className="px-5 py-3 font-medium">Statut</th>
            <th className="px-5 py-3 text-right font-medium">Reçu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {lignesFiltrees.map((ligne) => {
            const badge = badgeSimplifie(ligne);
            const Icone = badge.texte === "À jour" ? ICONES_STATUT.SOLDE : ICONES_STATUT.PARTIEL;
            return (
              <tr key={ligne.membreId} className="transition-colors hover:bg-muted/40">
                <td className="px-5 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {ligne.prenoms} {ligne.nom}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {ligne.telephone} · {ligne.nombreVersements} versement
                      {ligne.nombreVersements > 1 ? "s" : ""}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                  {ligne.totalVerse > 0 ? formatMontant(ligne.totalVerse) : "—"}
                </td>
                {avecAttendu && (
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {ligne.montantAttendu !== null ? formatMontant(ligne.montantAttendu) : "—"}
                  </td>
                )}
                {avecAttendu && (
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                    {ligne.resteAPayer !== null && ligne.resteAPayer > 0
                      ? formatMontant(ligne.resteAPayer)
                      : "—"}
                  </td>
                )}
                <td className="px-5 py-3">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                      badge.classe,
                    )}
                  >
                    <Icone className="h-3.5 w-3.5" aria-hidden />
                    {badge.texte}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => exporter(ligne)}
                    disabled={ligne.totalVerse <= 0}
                    title={
                      ligne.totalVerse > 0
                        ? `Télécharger le reçu PDF de ${ligne.prenoms} ${ligne.nom}`
                        : "Aucun versement à attester"
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Reçu PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

