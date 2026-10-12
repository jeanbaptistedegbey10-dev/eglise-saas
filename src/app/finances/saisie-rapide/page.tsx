import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleAlert, ScrollText } from "lucide-react";

import ExerciceFormModal from "@/components/finances/ExerciceFormModal";
import SaisieRapideForm from "@/components/finances/SaisieRapideForm";
import { prisma } from "@/lib/prisma";
import type {
  ExerciceOption,
  MembreSaisieRapide,
  PalierResume,
  TypeCotisationOption,
} from "@/types/finance";

export const metadata: Metadata = {
  title: "Saisie rapide des cotisations",
  description:
    "Grille à coches pour enregistrer rapidement les versements d'une cotisation obligatoire.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ exercice?: string; type?: string; palier?: string }>;
};

export default async function SaisieRapidePage({ searchParams }: Props) {
  const { exercice: exerciceIdRequete, type: typeRequete, palier: palierRequete } =
    await searchParams;

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

  const exerciceSelectionne =
    exercices.find((exercice) => exercice.id === exerciceIdRequete) ??
    exercices.find((exercice) => !exercice.cloture) ??
    exercices[0] ??
    null;

  let typesObligatoires: (TypeCotisationOption & { paliers: PalierResume[] })[] = [];
  let membres: MembreSaisieRapide[] = [];

  if (exerciceSelectionne) {
    try {
      const [lignesTypes, lignesMembres] = await Promise.all([
        prisma.typeCotisation.findMany({
          where: { type: "OBLIGATOIRE_BAREME" },
          orderBy: { libelle: "asc" },
          include: {
            paliers: {
              where: { exerciceId: exerciceSelectionne.id },
              orderBy: { libelleClasse: "asc" },
            },
          },
        }),
        prisma.membre.findMany({
          orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
          select: { id: true, nom: true, prenoms: true, telephone: true },
        }),
      ]);

      typesObligatoires = lignesTypes.map((type) => ({
        id: type.id,
        libelle: type.libelle,
        type: type.type,
        paliers: type.paliers.map((palier) => ({
          id: palier.id,
          libelleClasse: palier.libelleClasse,
          montant: Number(palier.montant),
        })),
      }));

      membres = lignesMembres.map((membre) => ({
        id: membre.id,
        nom: membre.nom,
        prenoms: membre.prenoms,
        telephone: membre.telephone,
        // Recalculé plus bas pour la cotisation sélectionnée.
        totalVerse: 0,
      }));
    } catch (error) {
      console.error("Erreur lors du chargement de la grille de saisie :", error);
      erreurBase = "Impossible de charger les données de la saisie rapide.";
    }
  }

  // Cotisation et palier effectivement affichés.
  const typeSelectionne =
    typesObligatoires.find((type) => type.id === typeRequete) ?? typesObligatoires[0] ?? null;
  const palierSelectionne =
    typeSelectionne?.paliers.find((palier) => palier.id === palierRequete) ??
    typeSelectionne?.paliers[0] ??
    null;

  // Totaux déjà versés par membre pour la cotisation sélectionnée.
  let membresAffiches: MembreSaisieRapide[] = membres;
  if (typeSelectionne) {
    try {
      const totaux = await prisma.paiement.groupBy({
        by: ["membreId"],
        where: {
          exerciceId: exerciceSelectionne?.id ?? "",
          typeCotisationId: typeSelectionne.id,
        },
        _sum: { montant: true },
      });
      const parMembre = new Map(
        totaux.map((ligne) => [ligne.membreId as string, Number(ligne._sum.montant ?? 0)]),
      );
      membresAffiches = membres.map((membre) => ({
        ...membre,
        totalVerse: parMembre.get(membre.id) ?? 0,
      }));
    } catch (error) {
      console.error("Erreur lors du calcul des totaux déjà versés :", error);
    }
  }

  const dateInitiale = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <Link
        href="/finances"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux finances
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-accent">Finances</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Saisie rapide des cotisations
        </h1>
        <p className="text-sm text-muted-foreground">
          Cochez les membres ayant versé le montant de la classe, puis enregistrez d&apos;un seul
          geste.
        </p>
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
            <ScrollText className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium text-foreground">Aucun exercice comptable</p>
            <p className="max-w-md text-sm text-muted-foreground">
              La saisie rapide est rattachée à un exercice. Créez-le depuis la page Finances,
              puis configurez un barème obligatoire.
            </p>
          </div>
          <ExerciceFormModal />
        </div>
      )}

      {!erreurBase && exerciceSelectionne && typesObligatoires.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ScrollText className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium text-foreground">
              Aucune cotisation obligatoire à barème
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Créez d&apos;abord un type de cotisation « Cotisations Obligatoires (Barèmes) » et
              configurez ses classes sur la page Barèmes.
            </p>
          </div>
          <Link
            href="/finances/baremes"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Configurer les barèmes
          </Link>
        </div>
      )}

      {exerciceSelectionne && typeSelectionne && palierSelectionne && (
        <>
          {/* Sélecteurs (exercice · cotisation · classe) */}
          <form
            method="get"
            action="/finances/saisie-rapide"
            className="flex flex-wrap items-end gap-4 rounded-2xl border border-card-border bg-card px-5 py-4 shadow-sm"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="saisie-exercice" className="text-sm font-medium text-foreground">
                Exercice
              </label>
              <select
                id="saisie-exercice"
                name="exercice"
                defaultValue={exerciceSelectionne.id}
                className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40"
              >
                {exercices.map((exercice) => (
                  <option key={exercice.id} value={exercice.id}>
                    {exercice.libelle}
                    {exercice.cloture ? " (clôturé)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="saisie-type" className="text-sm font-medium text-foreground">
                Cotisation obligatoire
              </label>
              <select
                id="saisie-type"
                name="type"
                defaultValue={typeSelectionne.id}
                className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40"
              >
                {typesObligatoires.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.libelle}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="saisie-palier" className="text-sm font-medium text-foreground">
                Classe
              </label>
              <select
                id="saisie-palier"
                name="palier"
                defaultValue={palierSelectionne.id}
                className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40"
              >
                {typeSelectionne.paliers.map((palier) => (
                  <option key={palier.id} value={palier.id}>
                    {palier.libelleClasse}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="rounded-lg border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Afficher la grille
            </button>
          </form>

          {exerciceSelectionne.cloture && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Cet exercice est clôturé : la grille s&apos;affiche à titre consultatif, mais
                aucun versement ne pourra être enregistré.
              </span>
            </div>
          )}

          <SaisieRapideForm
            exerciceId={exerciceSelectionne.id}
            typeCotisationId={typeSelectionne.id}
            typeCotisationLibelle={typeSelectionne.libelle}
            paliers={typeSelectionne.paliers}
            palierActifId={palierSelectionne.id}
            membres={membresAffiches}
            dateInitiale={dateInitiale}
          />
        </>
      )}
    </div>
  );
}

