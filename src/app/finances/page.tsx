import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, ScrollText, Settings2, Wallet } from "lucide-react";

import ExerciceFormModal from "@/components/finances/ExerciceFormModal";
import FinancesTypeTabs from "@/components/finances/FinancesTypeTabs";
import { formatMontant, type CategorieFinancesId } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import type {
  CategorieFinancesResume,
  ExerciceOption,
  ResumeFinances,
  TypeCotisationResume,
} from "@/types/finance";

export const metadata: Metadata = {
  title: "Finances & Cotisations",
  description:
    "Résumé des cotisations et quêtes par exercice : barèmes, campagnes volontaires et quêtes anonymes.",
};

// Les données sont lues à chaque requête : le résumé reste à jour après un
// Server Action, et le build ne dépend pas d'une base accessible.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ exercice?: string }>;
};

const CATEGORIE_VIDE: CategorieFinancesResume = {
  nombreTypes: 0,
  nombrePaiements: 0,
  total: 0,
};

export default async function FinancesPage({ searchParams }: Props) {
  const { exercice: exerciceIdRequete } = await searchParams;

  let exercices: ExerciceOption[] = [];
  let erreurBase: string | null = null;

  try {
    const lignes = await prisma.exercice.findMany({ orderBy: { annee: "desc" } });
    exercices = lignes.map((exercice) => ({
      id: exercice.id,
      annee: exercice.annee,
      libelle: exercice.libelle,
      cloture: exercice.cloture,
    }));
  } catch (error) {
    console.error("Erreur lors du chargement des exercices :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  // Exercice affiché : celui choisi dans l'URL, sinon le plus récent non clôturé.
  const exerciceSelectionne =
    exercices.find((exercice) => exercice.id === exerciceIdRequete) ??
    exercices.find((exercice) => !exercice.cloture) ??
    exercices[0] ??
    null;

  let resume: ResumeFinances | null = null;

  if (exerciceSelectionne) {
    try {
      const types = await prisma.typeCotisation.findMany({
        orderBy: { libelle: "asc" },
        include: {
          paliers: {
            where: { exerciceId: exerciceSelectionne.id },
            orderBy: { libelleClasse: "asc" },
          },
          paiements: {
            where: { exerciceId: exerciceSelectionne.id },
            select: { montant: true, membreId: true },
          },
        },
      });

      const compteurs: Record<CategorieFinancesId, CategorieFinancesResume> = {
        OBLIGATOIRE_BAREME: { ...CATEGORIE_VIDE },
        VOLONTAIRE_CAMPAGNE: { ...CATEGORIE_VIDE },
        QUETE_ANONYME: { ...CATEGORIE_VIDE },
      };
      let totalGeneral = 0;
      let nombrePaiements = 0;

      const typesResumes: TypeCotisationResume[] = types.map((type) => {
        let totalVerse = 0;
        let totalAnonyme = 0;

        for (const paiement of type.paiements) {
          const montant = Number(paiement.montant);
          totalVerse += montant;
          if (paiement.membreId === null) totalAnonyme += montant;
        }

        totalGeneral += totalVerse;
        nombrePaiements += type.paiements.length;

        const compte = compteurs[type.type];
        compte.nombreTypes += 1;
        compte.nombrePaiements += type.paiements.length;
        compte.total += totalVerse;

        return {
          id: type.id,
          libelle: type.libelle,
          description: type.description,
          type: type.type,
          nombrePaiements: type.paiements.length,
          totalVerse,
          totalAnonyme,
          paliers: type.paliers.map((palier) => ({
            id: palier.id,
            libelleClasse: palier.libelleClasse,
            montant: Number(palier.montant),
          })),
        };
      });

      resume = {
        exercice: exerciceSelectionne,
        totalGeneral,
        nombrePaiements,
        obligatoires: compteurs.OBLIGATOIRE_BAREME,
        volontaires: compteurs.VOLONTAIRE_CAMPAGNE,
        quetes: compteurs.QUETE_ANONYME,
        types: typesResumes,
      };
    } catch (error) {
      console.error("Erreur lors du chargement du résumé financier :", error);
      erreurBase = "Impossible de charger les données financières de l'exercice.";
    }
  }

  // Aujourd'hui calculé côté serveur, transmis tel quel aux clients.
  const dateInitiale = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Finances</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Finances & Cotisations
          </h1>
          <p className="text-sm text-muted-foreground">
            Résumé des cotisations et quêtes de l&apos;exercice actif — barèmes, campagnes et
            collectes anonymes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!erreurBase && exercices.length > 0 && (
            <form method="get" action="/finances" className="flex items-center gap-2">
              <label htmlFor="exercice-select" className="sr-only">
                Changer d&apos;exercice
              </label>
              <select
                id="exercice-select"
                name="exercice"
                defaultValue={exerciceSelectionne?.id ?? ""}
                className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40"
              >
                {exercices.map((exercice) => (
                  <option key={exercice.id} value={exercice.id}>
                    {exercice.libelle}
                    {exercice.cloture ? " (clôturé)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Afficher
              </button>
            </form>
          )}
          <ExerciceFormModal />
        </div>
      </header>

      {erreurBase && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erreurBase}</span>
        </div>
      )}

      {!erreurBase && !exerciceSelectionne && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium text-foreground">Aucun exercice comptable</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Créez l&apos;exercice en cours (ex. « Exercice 2026 ») pour commencer à configurer
              les barèmes et à enregistrer des cotisations.
            </p>
          </div>
        </div>
      )}

      {resume && (
        <>
          {/* Résumé global de l'exercice */}
          <section
            aria-label="Résumé de l'exercice"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="flex flex-col gap-1 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-accent">
                Total général
              </span>
              <span className="text-xl font-semibold tabular-nums text-foreground">
                {formatMontant(resume.totalGeneral)}
              </span>
              <span className="text-xs text-muted-foreground">
                {resume.nombrePaiements} versement{resume.nombrePaiements > 1 ? "s" : ""} sur{" "}
                {resume.exercice.libelle}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cotisations obligatoires
              </span>
              <span className="text-xl font-semibold tabular-nums text-foreground">
                {formatMontant(resume.obligatoires.total)}
              </span>
              <span className="text-xs text-muted-foreground">
                {resume.obligatoires.nombrePaiements} versement
                {resume.obligatoires.nombrePaiements > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Volontaires & campagnes
              </span>
              <span className="text-xl font-semibold tabular-nums text-foreground">
                {formatMontant(resume.volontaires.total)}
              </span>
              <span className="text-xs text-muted-foreground">
                {resume.volontaires.nombrePaiements} versement
                {resume.volontaires.nombrePaiements > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Quêtes
              </span>
              <span className="text-xl font-semibold tabular-nums text-foreground">
                {formatMontant(resume.quetes.total)}
              </span>
              <span className="text-xs text-muted-foreground">
                {resume.quetes.nombrePaiements} collecte
                {resume.quetes.nombrePaiements > 1 ? "s" : ""} anonyme
                {resume.quetes.nombrePaiements > 1 ? "s" : ""}
              </span>
            </div>
          </section>

          {/* Raccourcis d'actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/finances/saisie-rapide"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ScrollText className="h-4 w-4" aria-hidden />
              Saisie rapide
            </Link>
            <Link
              href="/finances/baremes"
              className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              Barèmes & types de cotisations
            </Link>
          </div>

          <FinancesTypeTabs resume={resume} dateInitiale={dateInitiale} />
        </>
      )}
    </div>
  );
}

