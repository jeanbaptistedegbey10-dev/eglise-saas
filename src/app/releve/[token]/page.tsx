import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Church, CircleAlert, FileText } from "lucide-react";

import ActionsReleve from "@/components/releve/ActionsReleve";
import type { Prisma } from "@/generated/prisma/client";
import {
  determinerCible,
  determinerClasseAge,
  libelleFrequence,
  periodesParMois,
  selectionnerBareme,
} from "@/lib/cotisation";
import { formatMontant, parseDonneesEcclesiastiques } from "@/lib/membre";
import { moisCourantExercice, moisExercice } from "@/lib/mois";
import { prisma } from "@/lib/prisma";
import { arrondir2 } from "@/lib/versement-cotisation";

export const metadata: Metadata = {
  title: "Relevé annuel de cotisations",
  description:
    "Suivi individuel public des cotisations récurrentes de l'exercice en cours — accès par lien personnel.",
};

// Page publique dépendant d'un jeton unique et de la base : rendue à chaque requête.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

/** Statut visuel d'une cotisation (ou du relevé complet). */
type StatutReleve = {
  libelle: string;
  ton: "ajour" | "retard" | "attente";
  /** Nombre de mois échus non réglés (0 si à jour / en attente). */
  moisRetard: number;
};

/** Une ligne du tableau récapitulatif du relevé. */
type LigneReleve = {
  cotisationId: string;
  intitule: string;
  frequence: string;
  /** Barème annuel fixé pour la classe du membre (null si aucun barème). */
  baremeAnnuel: number | null;
  /** Part obligatoire déjà versée sur l'exercice. */
  montantVerse: number;
  /** Dons supplémentaires éventuels (au-delà du barème). */
  surplusVolontaire: number;
  /** Nombre de mois de l'exercice déjà réglés. */
  moisRegles: number;
  /** Nombre total de mois de l'exercice. */
  totalMois: number;
  /** Reste à payer d'ici la fin de l'exercice. */
  resteAPayer: number;
  /** Libellés des mois acquittés, dans l'ordre chronologique de l'exercice. */
  moisPayes: string[];
  statut: StatutReleve;
};

/** Libellés singuliers de la catégorie d'âge affichée dans l'en-tête. */
const LIBELLES_CATEGORIE_AGE: Record<"ADULTE" | "JEUNE" | "ENFANT", string> = {
  ADULTE: "Adulte",
  JEUNE: "Jeune",
  ENFANT: "Enfant",
};

/** Classes Tailwind des pastilles de statut. */
const TONS_STATUT: Record<StatutReleve["ton"], string> = {
  ajour: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  retard: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300",
  attente: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
};

export default async function ReleveMembrePage({ params }: Props) {
  const { token } = await params;

  if (!token?.trim()) notFound();

  let membre: Prisma.MembreGetPayload<{
    select: {
      id: true;
      tokenConsultation: true;
      nom: true;
      prenoms: true;
      donneesEcclesiastiques: true;
    };
  }> | null = null;
  let erreurBase: string | null = null;
  let exerciceLibelle: string | null = null;
  let lignes: LigneReleve[] = [];

  try {
    membre = await prisma.membre.findUnique({
      where: { tokenConsultation: token },
      // La page publique n'affiche pas la photo : on évite de charger la
      // data URL (potentiellement volumineuse) pour chaque consultation.
      select: {
        id: true,
        tokenConsultation: true,
        nom: true,
        prenoms: true,
        donneesEcclesiastiques: true,
      },
    });
  } catch (error) {
    console.error("Erreur lors du chargement du relevé (membre) :", error);
    erreurBase =
      "Impossible de joindre la base de données pour afficher ce relevé. Réessayez dans quelques instants.";
  }

  if (erreurBase) return <EcranErreurReleve message={erreurBase} />;
  // `tokenConsultation` temporairement nullable (migration sans perte) :
  // un membre sans jeton ne doit jamais afficher un relevé.
  if (!membre || !membre.tokenConsultation) notFound();

  const profil = parseDonneesEcclesiastiques(membre.donneesEcclesiastiques);
  const classeAge = determinerClasseAge(profil);
  const cibleMembre = determinerCible(profil);
  const categorieAge =
    classeAge !== null
      ? LIBELLES_CATEGORIE_AGE[classeAge]
      : cibleMembre === "ADULTE" || cibleMembre === "JEUNE" || cibleMembre === "ENFANT"
        ? LIBELLES_CATEGORIE_AGE[cibleMembre]
        : "Non déterminée";

  try {
    // Exercice en cours : premier exercice non clôturé (le plus récent), à
    // défaut le dernier exercice créé (relevé consultable en fin d'exercice).
    const exercice =
      (await prisma.exercice.findFirst({
        where: { cloture: false },
        orderBy: { annee: "desc" },
      })) ??
      (await prisma.exercice.findFirst({
        orderBy: [{ annee: "desc" }, { createdAt: "desc" }],
      }));

    if (exercice) {
      exerciceLibelle = `${exercice.libelle} (${exercice.annee})`;

      const cotisations = await prisma.cotisation.findMany({
        where: { exerciceId: exercice.id, type: "RECURRENTE_CLASSE" },
        include: {
          baremes: true,
          versements: { where: { membreId: membre.id } },
        },
        orderBy: { nom: "asc" },
      });

      const mois = moisExercice(exercice.moisDebut, exercice.moisFin);
      const totalMois = mois.length;
      const moisCourant = moisCourantExercice(exercice.moisDebut, exercice.moisFin);
      // Mois échus : ceux de l'exercice jusqu'au mois courant inclus — seuls
      // comptent pour le calcul du retard.
      const indexCourant = Math.max(0, mois.findIndex((m) => m.cle === moisCourant));
      const moisEchus = mois.slice(0, indexCourant + 1);

      lignes = cotisations.map((cotisation) => {
        const grille = cotisation.baremes.map((bareme) => ({
          cible: bareme.cible,
          montant: Number(bareme.montant),
        }));
        const bareme = selectionnerBareme(grille, cibleMembre);

        // Le barème est exprimé « par période » (mois, semaine…) : on le
        // projette sur la durée réelle de l'exercice (12 mois si civil complet).
        const parPeriode = bareme ? Number(bareme.montant) : null;
        const periodesMois = periodesParMois(cotisation.frequence);
        const baremeAnnuel =
          parPeriode !== null ? arrondir2(parPeriode * periodesMois * totalMois) : null;

        let montantVerse = 0;
        let surplusVolontaire = 0;
        const clesPayees = new Set<string>();
        for (const versement of cotisation.versements) {
          montantVerse += Number(versement.montantBase);
          surplusVolontaire += Number(versement.surplusVolontaire);
          for (const cle of versement.moisCoches) clesPayees.add(cle);
        }
        montantVerse = arrondir2(montantVerse);
        surplusVolontaire = arrondir2(surplusVolontaire);

        const moisPayes = mois.filter((m) => clesPayees.has(m.cle)).map((m) => m.libelle);
        const resteAPayer =
          baremeAnnuel !== null ? Math.max(0, arrondir2(baremeAnnuel - montantVerse)) : 0;
        const moisEchusNonRegles = moisEchus.filter((m) => !clesPayees.has(m.cle)).length;

        let statut: StatutReleve;
        if (baremeAnnuel === null) {
          statut = { libelle: "En attente", ton: "attente", moisRetard: 0 };
        } else if (moisEchusNonRegles > 0) {
          statut = {
            libelle: `En retard de ${moisEchusNonRegles} mois`,
            ton: "retard",
            moisRetard: moisEchusNonRegles,
          };
        } else if (montantVerse === 0) {
          statut = { libelle: "En attente", ton: "attente", moisRetard: 0 };
        } else {
          statut = { libelle: "À jour", ton: "ajour", moisRetard: 0 };
        }

        return {
          cotisationId: cotisation.id,
          intitule: cotisation.nom,
          frequence: libelleFrequence(cotisation.frequence),
          baremeAnnuel,
          montantVerse,
          surplusVolontaire,
          moisRegles: moisPayes.length,
          totalMois,
          resteAPayer,
          moisPayes,
          statut,
        };
      });
    }
  } catch (error) {
    console.error("Erreur lors du chargement du relevé (cotisations) :", error);
    erreurBase =
      "Impossible de calculer votre relevé de cotisations pour le moment. Réessayez dans quelques instants.";
    lignes = [];
  }

  if (erreurBase) return <EcranErreurReleve message={erreurBase} />;

  const statutGlobal = calculerStatutGlobal(lignes);
  const totaux = lignes.reduce(
    (accumulateur, ligne) => ({
      baremeAnnuel: accumulateur.baremeAnnuel + (ligne.baremeAnnuel ?? 0),
      montantVerse: accumulateur.montantVerse + ligne.montantVerse,
      resteAPayer: accumulateur.resteAPayer + ligne.resteAPayer,
    }),
    { baremeAnnuel: 0, montantVerse: 0, resteAPayer: 0 },
  );
  const urlReleve = `/releve/${token}`;
  const nomComplet = `${membre.prenoms} ${membre.nom}`.trim();
  const dateGeneration = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="releve-page mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-8">
      {/* En-tête : identité, catégorie d'âge, exercice et statut global */}
      <header className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Church className="h-7 w-7" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              Relevé annuel des cotisations
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {membre.prenoms} {membre.nom}
            </h1>
            <p className="text-sm text-muted-foreground">
              Catégorie d&apos;age :{" "}
              <span className="font-medium text-foreground">{categorieAge}</span>
              {" · "}
              {exerciceLibelle ?? "Aucun exercice enregistré"}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center self-start rounded-full border px-3 py-1.5 text-sm font-medium sm:self-auto ${TONS_STATUT[statutGlobal.ton]}`}
        >
          {statutGlobal.libelle}
        </span>
      </header>

      {/* Actions : impression PDF et partage du lien (masquées à l'impression) */}
      <ActionsReleve
        urlReleve={urlReleve}
        titre={`Relevé annuel de cotisations — ${nomComplet}`}
      />

      {/* Tableau récapitulatif */}
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">
            Cotisations récurrentes — {exerciceLibelle ?? "exercice"}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm print:min-w-full">
            <thead>
              <tr className="border-b border-card-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Intitulé de la cotisation
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Barème annuel fixé
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Montant déjà versé
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  Mois réglés
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Reste à payer
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    Aucune cotisation récurrente enregistrée pour le moment sur cet exercice.
                  </td>
                </tr>
              ) : (
                lignes.map((ligne) => (
                  <tr
                    key={ligne.cotisationId}
                    className="border-b border-card-border/60 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <span className="font-medium text-foreground">{ligne.intitule}</span>
                      <span className="block text-xs text-muted-foreground">
                        Cotisation {ligne.frequence.toLowerCase()}
                        {ligne.surplusVolontaire > 0
                          ? ` · dont ${formatMontant(ligne.surplusVolontaire)} FCFA de don additionnel`
                          : ""}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {ligne.baremeAnnuel !== null
                        ? `${formatMontant(ligne.baremeAnnuel)} FCFA`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {formatMontant(ligne.montantVerse)} FCFA
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-foreground">
                      {ligne.moisRegles} / {ligne.totalMois}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-semibold tabular-nums ${
                        ligne.resteAPayer > 0
                          ? "text-red-600 dark:text-red-300"
                          : "text-emerald-600 dark:text-emerald-300"
                      }`}
                    >
                      {ligne.resteAPayer > 0
                        ? `${formatMontant(ligne.resteAPayer)} FCFA`
                        : "Soldé"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${TONS_STATUT[ligne.statut.ton]}`}
                      >
                        {ligne.statut.libelle}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lignes.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-card-border text-sm font-semibold text-foreground">
                  <td className="px-3 py-3">Total général</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatMontant(arrondir2(totaux.baremeAnnuel))} FCFA
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatMontant(arrondir2(totaux.montantVerse))} FCFA
                  </td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatMontant(arrondir2(totaux.resteAPayer))} FCFA
                  </td>
                  <td className="px-3 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
      {/* Détail des mois réglés */}
      {lignes.some((ligne) => ligne.moisPayes.length > 0) && (
        <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Détail des mois réglés
          </h2>
          <div className="flex flex-col gap-4">
            {lignes.map((ligne) => (
              <div key={ligne.cotisationId} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">{ligne.intitule}</p>
                {ligne.moisPayes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {ligne.moisPayes.map((mois) => (
                      <span
                        key={mois}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-600 dark:text-emerald-300"
                      >
                        {mois}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aucun mois réglé pour l&apos;instant.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Document généré le {dateGeneration} — Église SaaS.</p>
        <p>Ce relevé est personnel : ne partagez son lien qu&apos;avec les personnes autorisées.</p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers de rendu
// ---------------------------------------------------------------------------

/** Regroupe les statuts de lignes en un statut global (le plus pessimiste). */
function calculerStatutGlobal(lignes: LigneReleve[]): StatutReleve {
  if (lignes.length === 0) {
    return { libelle: "En attente", ton: "attente", moisRetard: 0 };
  }
  const lignesEnRetard = lignes.filter((ligne) => ligne.statut.ton === "retard");
  if (lignesEnRetard.length > 0) {
    const moisRetard = Math.max(...lignesEnRetard.map((ligne) => ligne.statut.moisRetard));
    return { libelle: `En retard de ${moisRetard} mois`, ton: "retard", moisRetard };
  }
  if (lignes.every((ligne) => ligne.statut.ton === "ajour")) {
    return { libelle: "À jour", ton: "ajour", moisRetard: 0 };
  }
  return { libelle: "En attente", ton: "attente", moisRetard: 0 };
}

/** Écran d'erreur clair lorsque la base de données est injoignable. */
function EcranErreurReleve({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <CircleAlert className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="text-xl font-semibold text-foreground">Relevé indisponible</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}




