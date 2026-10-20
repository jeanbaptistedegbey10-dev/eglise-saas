"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import clsx from "clsx";
import { ChevronDown, LoaderCircle, Printer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { annulerVersementCotisation } from "@/actions/cotisation";
import {
  construireDetailCampagne,
  construireEtatMembresMensuel,
  evaluerQuotaCampagne,
  type CotisationRapport,
  type MembreRapport,
  type QuotaCampagne,
} from "@/lib/cotisation-rapports";
import { libelleTypeCotisation } from "@/lib/cotisation";
import { formatDateISO, formatMontant } from "@/lib/membre";
import { pourcentage } from "@/lib/versement-cotisation";
import {
  initialCotisationFormState,
  type BilanExercice,
  type LigneMensuelleRapport,
  type RapportCampagne,
} from "@/types/cotisation";

type Props = {
  exerciceLibelle: string;
  bilan: BilanExercice;
  suivisMensuels: LigneMensuelleRapport[];
  campagnes: RapportCampagne[];
  cotisationsRapport: CotisationRapport[];
  membresRapport: MembreRapport[];
};

/** Pastille verte « À jour » ou rouge « En retard » pour un membre sur un mois. */
function PastilleStatutMembre({
  aJour,
  dateReglement,
}: {
  aJour: boolean;
  dateReglement: string | null;
}) {
  if (aJour) {
    const jour = dateReglement ? formatDateISO(dateReglement).slice(0, 5) : null;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        À jour{jour ? ` (mois réglé le ${jour})` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-300">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-400" />
      En retard
    </span>
  );
}

/** Barre de progression « h-2 rounded-full » — couleur adaptée à l'état du quota. */
function BarreProgression({
  pourcentageAtteint,
  couleur,
}: {
  /** Taux d'atteinte en % (plafonné visuellement à 100). */
  pourcentageAtteint: number;
  couleur: "vert" | "bleu" | "ambre" | "rouge";
}) {
  const teintes = {
    vert: "bg-emerald-400",
    bleu: "bg-sky-500",
    ambre: "bg-amber-400",
    rouge: "bg-red-500",
  } as const;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pourcentageAtteint)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progression du quota"
      className="h-2 rounded-full bg-muted overflow-hidden"
    >
      <div
        className={clsx("h-full rounded-full transition-all duration-500", teintes[couleur])}
        style={{ width: `${Math.min(100, Math.max(0, pourcentageAtteint))}%` }}
      />
    </div>
  );
}

/** Badge d'état dynamique du quota : atteint / en cours / non atteint (échéance ou clôture). */
function BadgeQuota({ quota, estCloture }: { quota: QuotaCampagne; estCloture: boolean }) {
  if (quota.etat === "sans-objectif") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-card-border">
        Montant libre — sans objectif
      </span>
    );
  }
  if (quota.etat === "atteint") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
        🎯 Quota atteint ({Math.round(quota.tauxAtteinte ?? 100)} %)
      </span>
    );
  }
  const manque = formatMontant(quota.soldeRestant ?? 0);
  if (quota.etat === "non-atteint-terminee") {
    const motif =
      estCloture && quota.echeanceDepassee
        ? "Échéance dépassée · Clôturée"
        : estCloture
          ? "Clôturée"
          : "Échéance dépassée";
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
          estCloture
            ? "bg-red-500/15 text-red-300 ring-red-500/30"
            : "bg-amber-500/15 text-amber-300 ring-amber-500/30",
        )}
      >
        ⚠️ Quota non atteint (manque {manque} FCFA) — {motif}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-300 ring-1 ring-inset ring-sky-500/30">
      En cours — {Math.round(quota.tauxAtteinte ?? 0)} % atteint (reste {manque} FCFA)
    </span>
  );
}

/** Met en surbrillance la portion du texte correspondant à la recherche du donateur. */
function Surligner({ texte, recherche }: { texte: string; recherche: string }) {
  if (recherche === "") return <>{texte}</>;
  const index = texte.toLowerCase().indexOf(recherche);
  if (index === -1) return <>{texte}</>;
  return (
    <>
      {texte.slice(0, index)}
      <mark className="rounded bg-amber-400/25 px-0.5 text-inherit">
        {texte.slice(index, index + recherche.length)}
      </mark>
      {texte.slice(index + recherche.length)}
    </>
  );
}

/**
 * Bouton poubelle à deux étapes (clic → confirmation) qui annule un versement
 * via la Server Action `annulerVersementCotisation`.
 */
function BoutonAnnulerVersement({ versementId }: { versementId: string }) {
  const router = useRouter();
  const [confirme, setConfirme] = useState(false);
  const [etat, formAction, enCours] = useActionState(
    annulerVersementCotisation,
    initialCotisationFormState,
  );

  useEffect(() => {
    if (etat.success) {
      setConfirme(false);
      router.refresh();
    }
  }, [etat, router]);

  if (!confirme) {
    return (
      <button
        type="button"
        onClick={() => setConfirme(true)}
        title="Annuler ce versement"
        aria-label="Annuler ce versement"
        className="rounded-lg p-1.5 text-red-400 outline-none transition-colors hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40 print:hidden"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1 print:hidden">
      <input type="hidden" name="versementId" value={versementId} readOnly />
      {!etat.success && etat.message && (
        <p className="max-w-40 text-[10px] text-red-400">{etat.message}</p>
      )}
      <div className="flex items-center gap-1">
        <button
          type="submit"
          disabled={enCours}
          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-[10px] font-medium text-white outline-none transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-50"
        >
          {enCours && <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />}
          {enCours ? "Annulation…" : "Confirmer"}
        </button>
        <button
          type="button"
          onClick={() => setConfirme(false)}
          className="rounded-md px-2 py-1 text-[10px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Non
        </button>
      </div>
    </form>
  );
}

export default function CotisationsRapports({
  exerciceLibelle,
  bilan,
  suivisMensuels,
  campagnes,
  cotisationsRapport,
  membresRapport,
}: Props) {
  // --- Filtres du rapport (onglet Rapports) ---
  const [filtreCotisation, setFiltreCotisation] = useState("");
  const [rechercheDonateur, setRechercheDonateur] = useState("");
  const recherche = rechercheDonateur.trim().toLowerCase();

  // Cotisations récurrentes visibles selon le filtre par cotisation.
  const recurrentes = useMemo(() => {
    const recurrentesToutes = cotisationsRapport.filter(
      (c) => c.type === "RECURRENTE_CLASSE",
    );
    if (!filtreCotisation) return recurrentesToutes;
    return recurrentesToutes.filter((c) => c.id === filtreCotisation);
  }, [cotisationsRapport, filtreCotisation]);

  // Le filtre est-il posé sur une cotisation récurrente ? (sinon le suivi
  // mensuel n'a rien à afficher : filtre posé sur une ponctuelle.)
  const filtreSurRecurrente =
    filtreCotisation === "" ||
    cotisationsRapport.some(
      (c) => c.id === filtreCotisation && c.type === "RECURRENTE_CLASSE",
    );

  const membresParId = useMemo(
    () => new Map(membresRapport.map((m) => [m.membreId, { label: m.label ?? m.membreId, cible: m.cible }])),
    [membresRapport],
  );
  const campagnesDetails = useMemo(() => {
    const visibles = campagnes.filter(
      (campagne) => !filtreCotisation || campagne.cotisationId === filtreCotisation,
    );
    return visibles.map((campagne) => {
      const cotisation = cotisationsRapport.find((item) => item.id === campagne.cotisationId);
      const toutes = cotisation ? construireDetailCampagne(cotisation, membresParId) : [];
      // Recherche par nom du donateur : seules les lignes correspondantes sont
      // affichées — l'en-tête de la campagne reste visible.
      const versements =
        recherche === ""
          ? toutes
          : toutes.filter((ligne) => ligne.contributeur.toLowerCase().includes(recherche));
      const totalBase = versements.reduce((t, ligne) => t + ligne.montantBase, 0);
      const totalSurplus = versements.reduce((t, ligne) => t + ligne.surplus, 0);
      // Quota : objectif = montant cible, sinon plancher × membres de l'exercice.
      const quota = evaluerQuotaCampagne({
        totalRecolte: campagne.totalRecolte,
        montantCible: campagne.montantCible,
        montantPlancher: campagne.montantPlancher,
        nombreMembres: membresRapport.length,
        dateFin: campagne.dateFin,
        estCloture: campagne.estCloture,
      });
      return {
        campagne,
        quota,
        rechercheActive: recherche !== "",
        versements,
        totalBase,
        totalSurplus,
        totalGeneral: totalBase + totalSurplus,
      };
    });
  }, [campagnes, cotisationsRapport, membresParId, membresRapport.length, filtreCotisation, recherche]);
  const suivisDetailles = useMemo(() => {
    if (!filtreSurRecurrente) return [];
    return suivisMensuels
      .map((ligne) => {
        const membres = construireEtatMembresMensuel(recurrentes, membresRapport, ligne.moisCle);
        const visibles =
          recherche === ""
            ? membres
            : membres.filter((m) => m.label.toLowerCase().includes(recherche));
        const tries = [...visibles].sort((a, b) => a.label.localeCompare(b.label, "fr"));
        return {
          ligne,
          membres: tries,
          nombreAJour: visibles.filter((m) => m.aJour).length,
          nombreEnRetard: visibles.filter((m) => !m.aJour).length,
          nombreTrouves: visibles.length,
        };
      })
      // Avec une recherche active, on n'affiche que les mois concernés.
      .filter((suivi) => recherche === "" || suivi.membres.length > 0);
  }, [suivisMensuels, recurrentes, membresRapport, filtreSurRecurrente, recherche]);
  const [moisOuverts, setMoisOuverts] = useState<Set<string>>(() => {
    const courant = suivisMensuels.find((ligne) => ligne.estCourant);
    return new Set(courant ? [courant.moisCle] : []);
  });
  const basculerMois = (cle: string) => {
    setMoisOuverts((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  };

  /** Retards cumulés (mois × membre) sur les cotisations récurrentes de l'exercice. */
  const retardsCumules = useMemo(
    () => suivisMensuels.reduce((total, ligne) => total + ligne.retards, 0),
    [suivisMensuels],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs text-muted-foreground">
          Registre nominatif de l&apos;exercice « {exerciceLibelle} ».
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimer le rapport
        </button>
      </div>

      {/* --- Filtres : cotisation + recherche du donateur --- */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-card-border bg-card p-5 print:hidden">
        <div className="flex min-w-56 flex-col gap-1.5">
          <label
            htmlFor="rapport-filtre-cotisation"
            className="text-xs font-medium text-foreground"
          >
            Cotisation
          </label>
          <select
            id="rapport-filtre-cotisation"
            value={filtreCotisation}
            onChange={(evenement) => setFiltreCotisation(evenement.target.value)}
            className="h-9 rounded-lg border border-card-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Toutes les cotisations</option>
            {cotisationsRapport.map((cotisation) => (
              <option key={cotisation.id} value={cotisation.id}>
                {cotisation.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label
            htmlFor="rapport-recherche-donateur"
            className="text-xs font-medium text-foreground"
          >
            Donateur
          </label>
          <input
            id="rapport-recherche-donateur"
            type="search"
            value={rechercheDonateur}
            onChange={(evenement) => setRechercheDonateur(evenement.target.value)}
            placeholder="Nom du donateur…"
            autoComplete="off"
            className="h-9 rounded-lg border border-card-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {(filtreCotisation !== "" || rechercheDonateur !== "") && (
          <button
            type="button"
            onClick={() => {
              setFiltreCotisation("");
              setRechercheDonateur("");
            }}
            className="h-9 rounded-lg border border-card-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Réinitialiser
          </button>
        )}
      </div>
      <section className="flex flex-col gap-3" aria-label="Bilan">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">
            Bilan de l&apos;exercice « {exerciceLibelle} »
          </h2>
          <p className="text-xs text-muted-foreground">
            {bilan.nombreContributeurs} contributeur{bilan.nombreContributeurs > 1 ? "s" : ""} ·{" "}
            {bilan.nombreVersements} versement{bilan.nombreVersements > 1 ? "s" : ""}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* 1 — Total encaissé réel */}
          <article className="flex flex-col gap-1.5 rounded-2xl border border-card-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">Total encaissé réel</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatMontant(bilan.totalGeneral)}{" "}
              <span className="text-sm font-semibold text-muted-foreground">FCFA</span>
            </p>
            <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-card-border">
              {bilan.nombreVersements} versement{bilan.nombreVersements > 1 ? "s" : ""}
            </span>
          </article>

          {/* 2 — Cotisations récurrentes */}
          <article className="flex flex-col gap-2 rounded-2xl border border-card-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">Cotisations récurrentes</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatMontant(bilan.encaisseRecurrence)}{" "}
              <span className="text-sm font-semibold text-muted-foreground">FCFA</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Encaissé vs attendu : {formatMontant(bilan.attenduRecurrence)} FCFA
            </p>
            <BarreProgression
              pourcentageAtteint={bilan.tauxRecouvrement * 100}
              couleur={
                bilan.tauxRecouvrement >= 1
                  ? "vert"
                  : bilan.tauxRecouvrement >= 0.5
                    ? "bleu"
                    : "ambre"
              }
            />
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">
                Recouvrement : {pourcentage(bilan.tauxRecouvrement)}
              </span>
              <span
                title="Cumul des mois × membres en retard sur l'exercice"
                className={clsx(
                  "font-medium",
                  retardsCumules > 0 ? "text-red-300" : "text-muted-foreground",
                )}
              >
                {retardsCumules} retard{retardsCumules > 1 ? "s" : ""} cumulé
                {retardsCumules > 1 ? "s" : ""}
              </span>
            </div>
          </article>

          {/* 3 — Aides & solidarité (ponctuelles) */}
          <article className="flex flex-col gap-1.5 rounded-2xl border border-card-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">Aides &amp; solidarité</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatMontant(bilan.totalPonctuelles)}{" "}
              <span className="text-sm font-semibold text-muted-foreground">FCFA</span>
            </p>
            <p className="text-xs text-muted-foreground">Total des cotisations ponctuelles.</p>
            <div className="mt-auto flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 ring-1 ring-inset ring-emerald-500/25">
              <span className="text-xs font-semibold text-emerald-300">
                Surplus volontaire : {formatMontant(bilan.totalSurplus)} FCFA
              </span>
            </div>
          </article>

          {/* 4 — Projets & quêtes anonymes */}
          <article className="flex flex-col gap-1.5 rounded-2xl border border-card-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">Projets &amp; quêtes anonymes</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatMontant(bilan.totalAnonymes)}{" "}
              <span className="text-sm font-semibold text-muted-foreground">FCFA</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Travaux &amp; culte — dons collectés sans souscripteur identifié.
            </p>
          </article>
        </div>
      </section>
       <section className="flex flex-col gap-3" aria-label="Suivi mensuel">
         <h2 className="text-base font-semibold text-foreground">Suivi mensuel des récurrentes</h2>
         {suivisDetailles.length === 0 ? (
           <p className="rounded-xl border border-dashed border-card-border p-4 text-sm text-muted-foreground">
             {filtreSurRecurrente && recherche === ""
               ? "Aucune cotisation récurrente sur cet exercice."
               : "Aucun résultat pour les filtres appliqués."}
           </p>
         ) : (
           <ul className="flex flex-col gap-2">
             {suivisDetailles.map(({ ligne, membres, nombreAJour, nombreEnRetard, nombreTrouves }) => {
               const ouvert = moisOuverts.has(ligne.moisCle);
               return (
                 <li key={ligne.moisCle} className="overflow-hidden rounded-xl border border-card-border bg-card">
                   <button
                     type="button"
                     onClick={() => basculerMois(ligne.moisCle)}
                     aria-expanded={ouvert}
                     className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/40 print:hidden">
                     <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                       <ChevronDown aria-hidden className={clsx("h-4 w-4 transition-transform", ouvert && "rotate-180")} />
                       {ligne.libelle}
                     </span>
                     <span className="text-xs text-muted-foreground">
                       {formatMontant(ligne.encaisse)} / {formatMontant(ligne.attendu)} FCFA · {nombreAJour} à jour · {nombreEnRetard} en retard
                        {recherche !== "" && (
                          <span className="ml-1 font-medium text-foreground">
                            · {nombreTrouves} trouvé{nombreTrouves > 1 ? "s" : ""}
                          </span>
                        )}
                     </span>
                   </button>
                   {ouvert && (
                     <div className="border-t border-card-border print:block">
                       <div className="overflow-x-auto">
                         <table className="w-full min-w-160 text-left text-xs">
                           <thead>
                             <tr className="border-b border-card-border text-muted-foreground">
                               <th scope="col" className="px-4 py-2 font-medium">Membre</th>
                               <th scope="col" className="px-4 py-2 font-medium">Classe</th>
                               <th scope="col" className="px-4 py-2 font-medium">Statut</th>
                               <th scope="col" className="px-4 py-2 text-right font-medium">Montant versé</th>
                               <th scope="col" className="px-4 py-2 font-medium">Règlement</th>
                             </tr>
                           </thead>
                           <tbody>
                             {membres.map((membre) => (
                               <tr key={membre.membreId} className="border-b border-card-border/60 last:border-0">
                                 <td className="px-4 py-2 font-medium text-foreground">{membre.label}</td>
                                 <td className="px-4 py-2 text-muted-foreground">{membre.classe}</td>
                                 <td className="px-4 py-2">
                                   <PastilleStatutMembre aJour={membre.aJour} dateReglement={membre.dateReglement} />
                                 </td>
                                 <td className="px-4 py-2 text-right tabular-nums text-foreground">
                                   {formatMontant(membre.montantVerse)} FCFA
                                 </td>
                                 <td className="px-4 py-2 text-muted-foreground">
                                   {membre.dateReglement ? formatDateISO(membre.dateReglement) : "—"}
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     </div>
                   )}
                 </li>
               );
             })}
           </ul>
         )}
       </section>

      <section className="flex flex-col gap-3" aria-label="Registre des campagnes">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">
            Registre des campagnes (ponctuelles &amp; anonymes)
          </h2>
          <p className="text-xs text-muted-foreground">
            {campagnesDetails.length} campagne{campagnesDetails.length > 1 ? "s" : ""}
          </p>
        </div>
        {campagnesDetails.length === 0 ? (
          <p className="rounded-xl border border-dashed border-card-border p-4 text-sm text-muted-foreground">
            {filtreCotisation === "" && recherche === ""
              ? "Aucune campagne ponctuelle ou anonyme sur cet exercice."
              : "Aucun versement pour les filtres appliqués."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {campagnesDetails.map(({ campagne, quota, rechercheActive, versements, totalBase, totalSurplus, totalGeneral }) => {
              const couleurBarre =
                quota.etat === "atteint"
                  ? "vert"
                  : quota.etat === "en-cours"
                    ? "bleu"
                    : campagne.estCloture
                      ? "rouge"
                      : "ambre";
              return (
                <article
                  key={campagne.cotisationId}
                  className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5"
                >
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-sm font-semibold text-foreground">{campagne.nom}</h3>
                      <p className="text-xs text-muted-foreground">{libelleTypeCotisation(campagne.type)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                          campagne.estCloture
                            ? "bg-muted text-muted-foreground ring-card-border"
                            : "bg-sky-500/10 text-sky-300 ring-sky-500/25",
                        )}
                      >
                        {campagne.estCloture ? "Clôturée" : "En cours"}
                      </span>
                      <BadgeQuota quota={quota} estCloture={campagne.estCloture} />
                    </div>
                  </header>
                  {/* Quota : objectif, récolté, solde restant + barre de progression */}
                  {quota.objectif !== null ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-card-border/70 bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">
                          Objectif :{" "}
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatMontant(quota.objectif)} FCFA
                          </span>
                          {campagne.montantCible == null && campagne.montantPlancher != null && (
                            <span className="text-muted-foreground">
                              {" "}
                              (plancher × {membresRapport.length} membres)
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          Récolté :{" "}
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatMontant(campagne.totalRecolte)} FCFA
                          </span>{" "}
                          · Reste :{" "}
                          <span
                            className={clsx(
                              "font-semibold tabular-nums",
                              (quota.soldeRestant ?? 0) > 0 ? "text-foreground" : "text-emerald-300",
                            )}
                          >
                            {formatMontant(quota.soldeRestant ?? 0)} FCFA
                          </span>
                        </span>
                      </div>
                      <BarreProgression pourcentageAtteint={quota.tauxAtteinte ?? 0} couleur={couleurBarre} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Campagne à montant libre — sans objectif. Récolté :{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMontant(campagne.totalRecolte)} FCFA
                      </span>
                    </p>
                  )}

                  {/* Indicateurs de la campagne */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 ring-1 ring-inset ring-card-border">
                      {campagne.nombreVersements} versement{campagne.nombreVersements > 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 ring-1 ring-inset ring-card-border">
                      {campagne.nombreParticipants} participant
                      {campagne.nombreParticipants > 1 ? "s" : ""}
                    </span>
                    {campagne.surplusTotal > 0 && (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/25">
                        Surplus : {formatMontant(campagne.surplusTotal)} FCFA
                      </span>
                    )}
                    {campagne.dateFin && (
                      <span className="text-muted-foreground">
                        Échéance : {formatDateISO(campagne.dateFin)}
                      </span>
                    )}
                  </div>

                  {/* Compteur discret de la recherche par donateur */}
                  {rechercheActive && (
                    <p className="text-xs text-muted-foreground">
                      {versements.length} versement{versements.length > 1 ? "s" : ""} trouvé
                      {versements.length > 1 ? "s" : ""} pour «&nbsp;{rechercheDonateur.trim()}&nbsp;».
                    </p>
                  )}

                  {versements.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-card-border px-4 py-3 text-xs text-muted-foreground">
                      {rechercheActive
                        ? `Aucun versement ne correspond à « ${rechercheDonateur.trim()} » dans cette campagne.`
                        : "Aucun versement enregistré pour cette campagne."}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-card-border">
                      <table className="w-full min-w-190 text-left text-xs">
                        <thead>
                          <tr className="border-b border-card-border bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                            <th scope="col" className="px-3 py-2.5 font-semibold">Date effective</th>
                            <th scope="col" className="px-3 py-2.5 font-semibold">Nom du contributeur</th>
                            <th scope="col" className="px-3 py-2.5 font-semibold">Statut / Classe</th>
                            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Part obligatoire</th>
                            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Surplus / Don</th>
                            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Total versé</th>
                            <th scope="col" className="px-3 py-2.5 font-semibold">Mode de paiement</th>
                            <th scope="col" className="px-3 py-2.5 font-semibold print:hidden">
                              <span className="sr-only">Annulation</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {versements.map((ligne) => (
                            <tr
                              key={ligne.id}
                              className="border-b border-card-border/60 transition-colors last:border-0 hover:bg-muted/30"
                            >
                              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                {ligne.dateEffective ? formatDateISO(ligne.dateEffective) : "—"}
                              </td>
                              <td className="px-3 py-2 font-medium text-foreground">
                                <Surligner texte={ligne.contributeur} recherche={recherche} />
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-inset ring-card-border">
                                  {ligne.classe}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-foreground">
                                {formatMontant(ligne.montantBase)} FCFA
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {ligne.surplus > 0 ? (
                                  <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/25">
                                    Don + {formatMontant(ligne.surplus)} FCFA
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                                {formatMontant(ligne.montantTotal)} FCFA
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{ligne.modePaiement}</td>
                              <td className="px-3 py-2 text-right print:hidden">
                                {/* Clôture : le bouton reste masqué (le serveur refuse aussi). */}
                                {!campagne.estCloture && <BoutonAnnulerVersement versementId={ligne.id} />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/30 font-semibold text-foreground">
                            <th scope="row" colSpan={3} className="px-3 py-2.5 text-left">
                              Total{rechercheActive ? " (filtre)" : ""} ({versements.length} versement
                              {versements.length > 1 ? "s" : ""})
                            </th>
                            <td className="px-3 py-2.5 text-right tabular-nums">{formatMontant(totalBase)} FCFA</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300">
                              {formatMontant(totalSurplus)} FCFA
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{formatMontant(totalGeneral)} FCFA</td>
                            <td className="px-3 py-2.5">—</td>
                            <td className="px-3 py-2.5 print:hidden" aria-hidden />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

