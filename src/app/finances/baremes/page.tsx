import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleAlert, Scale } from "lucide-react";

import BaremeConfigModal from "@/components/finances/BaremeConfigModal";
import ExerciceFormModal from "@/components/finances/ExerciceFormModal";
import TypeCotisationFormModal from "@/components/finances/TypeCotisationFormModal";
import { formatMontant, libelleTypeCotisation } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import type { ExerciceOption, TypeCotisationEdition } from "@/types/finance";

export const metadata: Metadata = {
  title: "Barèmes & Cotisations",
  description:
    "Configuration des classes (barèmes) et des types de cotisations pour l'exercice en cours.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ exercice?: string }>;
};

type TypeAvecPaliers = TypeCotisationEdition & {
  paliers: { id: string; libelleClasse: string; montant: number }[];
};

export default async function BaremesPage({ searchParams }: Props) {
  const { exercice: exerciceIdRequete } = await searchParams;

  let exercices: ExerciceOption[] = [];
  let types: TypeAvecPaliers[] = [];
  let erreurBase: string | null = null;

  try {
    const [lignesExercices, lignesTypes] = await Promise.all([
      prisma.exercice.findMany({ orderBy: { annee: "desc" } }),
      prisma.typeCotisation.findMany({
        orderBy: [{ type: "asc" }, { libelle: "asc" }],
        include: {
          paliers: { orderBy: { libelleClasse: "asc" } },
        },
      }),
    ]);

    exercices = lignesExercices.map((exercice) => ({
      id: exercice.id,
      annee: exercice.annee,
      libelle: exercice.libelle,
      cloture: exercice.cloture,
    }));
    types = lignesTypes.map((type) => ({
      id: type.id,
      libelle: type.libelle,
      description: type.description,
      type: type.type,
      paliers: type.paliers.map((palier) => ({
        id: palier.id,
        libelleClasse: palier.libelleClasse,
        montant: Number(palier.montant),
      })),
    }));
  } catch (error) {
    console.error("Erreur lors du chargement des barèmes :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  const exerciceSelectionne =
    exercices.find((exercice) => exercice.id === exerciceIdRequete) ??
    exercices.find((exercice) => !exercice.cloture) ??
    exercices[0] ??
    null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <Link
        href="/finances"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux finances
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Finances</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Barèmes & types de cotisations
          </h1>
          <p className="text-sm text-muted-foreground">
            Classes (ex. « Jeunes », « Adultes ») et montants pour l&apos;exercice en cours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TypeCotisationFormModal triggerLabel="Nouveau type de cotisation" />
          <ExerciceFormModal variant="secondary" triggerLabel="Nouvel exercice" />
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
            <Scale className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium text-foreground">Aucun exercice comptable</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Les barèmes sont propres à un exercice. Créez d&apos;abord l&apos;exercice en cours,
              puis configurez les classes ici.
            </p>
          </div>
        </div>
      )}

      {exerciceSelectionne && (
        <>
          {/* Sélecteur d'exercice */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-card-border bg-card px-5 py-4 shadow-sm">
            <form method="get" action="/finances/baremes" className="flex items-center gap-3">
              <label
                htmlFor="bareme-exercice-select"
                className="text-sm font-medium text-foreground"
              >
                Exercice
              </label>
              <select
                id="bareme-exercice-select"
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
              <button
                type="submit"
                className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Afficher
              </button>
            </form>

            {exerciceSelectionne.cloture && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                Exercice clôturé — lecture seule
              </span>
            )}
          </div>

          {/* Liste des types de cotisations et de leurs barèmes */}
          {types.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Scale className="h-7 w-7 text-muted-foreground" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-base font-medium text-foreground">Aucun type de cotisation</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Créez une cotisation obligatoire (ex. « Cotisation annuelle »), une campagne
                  volontaire ou une quête, puis configurez ses classes ci-dessous.
                </p>
              </div>
              <TypeCotisationFormModal triggerLabel="Créer le premier type" />
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {types.map((type) => {
                const paliersExercice = type.paliers;

                return (
                  <li
                    key={type.id}
                    className="rounded-2xl border border-card-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-foreground">{type.libelle}</h2>
                          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                            {libelleTypeCotisation(type.type)}
                          </span>
                        </div>
                        {type.description && (
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <TypeCotisationFormModal
                          typeCotisation={type}
                          triggerLabel="Modifier"
                          variant="secondary"
                        />
                        {!exerciceSelectionne.cloture && (
                          <BaremeConfigModal
                            exerciceId={exerciceSelectionne.id}
                            exerciceLibelle={exerciceSelectionne.libelle}
                            typeCotisation={type}
                            paliers={paliersExercice}
                            triggerLabel={
                              paliersExercice.length > 0
                                ? "Modifier les classes"
                                : "Configurer les classes"
                            }
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-card-border pt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Classes de l&apos;exercice {exerciceSelectionne.annee}
                      </p>
                      {paliersExercice.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                          {paliersExercice.map((palier) => (
                            <li
                              key={palier.id}
                              className="inline-flex items-center gap-2 rounded-full border border-card-border bg-muted px-3 py-1.5 text-sm text-muted-foreground"
                            >
                              <span>{palier.libelleClasse}</span>
                              <span className="font-semibold tabular-nums text-foreground">
                                {formatMontant(palier.montant)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Aucune classe configurée pour cet exercice — le montant libre s&apos;applique
                          aux versements saisis un par un.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Note sur l'historique */}
          <p className="rounded-2xl border border-dashed border-card-border bg-card/60 px-5 py-4 text-xs text-muted-foreground">
            Chaque palier est rattaché à un exercice : modifier une classe ou un montant en cours
            d&apos;année concerne uniquement les futurs versements. Les paiements déjà enregistrés
            conservent le montant du barème applicable à leur date — l&apos;historique n&apos;est
            jamais réécrit. Une évolution de classe en cours d&apos;année (ex. « Jeunes » vers
            « Adultes ») se traduit simplement par le choix du bon palier à la saisie.
          </p>
        </>
      )}
    </div>
  );
}

