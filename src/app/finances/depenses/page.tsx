import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";

import DepenseForm from "@/components/finances/DepenseForm";
import DepensesListe from "@/components/finances/DepensesListe";
import { assurerCaissesInitiales, calculerSoldeCotisation } from "@/lib/caisse";
import { prisma } from "@/lib/prisma";
import type {
  CaissePourDepense,
  CotisationPourDepense,
  DepenseEdition,
  DepenseLigne,
  MembrePourDepense,
  ResumeDepenses,
} from "@/types/depense";
import type { CaisseResume } from "@/lib/caisse";
import type { ExerciceOption } from "@/types/finance";
export const metadata: Metadata = {
  title: "Dépenses & Décaissements",
  description:
    "Enregistrement et suivi des décaissements : dépenses affectées aux cotisations / projets et sorties directes des caisses internes.",
};

// Les données sont lues à chaque requête : le tableau reste à jour après une
// Server Action, et le build ne dépend pas d'une base accessible.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ exercice?: string; edition?: string }>;
};

const RESUME_VIDE: ResumeDepenses = {
  total: 0,
  affectees: 0,
  caissesDirectes: 0,
  nombre: 0,
  nombreAffectees: 0,
  nombreCaissesDirectes: 0,
};

export default async function DepensesPage({ searchParams }: Props) {
  const params = await searchParams;
  // Aujourd'hui calculé côté serveur, transmis tel quel au client.
  const dateInitiale = new Date().toISOString().slice(0, 10);

  let exercices: ExerciceOption[] = [];
  let erreurBase: string | null = null;

  try {
    const lignes = await prisma.exercice.findMany({ orderBy: { annee: "desc" } });
    exercices = lignes.map((exercice) => ({
      id: exercice.id,
      annee: exercice.annee,
      libelle: exercice.libelle,
      moisDebut: exercice.moisDebut,
      moisFin: exercice.moisFin,
      cloture: exercice.cloture,
    }));
  } catch (error) {
    console.error("Erreur lors du chargement des exercices :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  // Exercice affiché : celui choisi dans l'URL, sinon le plus récent non clôturé.
  const exerciceSelectionne =
    exercices.find((exercice) => exercice.id === params.exercice) ??
    exercices.find((exercice) => !exercice.cloture) ??
    exercices[0] ??
    null;

  let cotisations: CotisationPourDepense[] = [];
  let membres: MembrePourDepense[] = [];
  let depenses: DepenseLigne[] = [];
  let resume: ResumeDepenses = { ...RESUME_VIDE };
  let edition: DepenseEdition | null = null;
  let caisses: CaissePourDepense[] = [];

  // Caisses fondamentales garanties au chargement (créées si table vide).
  // Plain Objects JSON : Decimal → Number explicite avant Client Components.
  try {
    const lignes = await assurerCaissesInitiales();
    caisses = lignes.map((caisse: CaisseResume) => ({
      id: caisse.id,
      nom: caisse.nom,
      code: caisse.code,
      description: caisse.description,
      soldeActuel: Number(caisse.soldeActuel),
      soldeInitial: Number(caisse.soldeInitial),
      estParDefaut: caisse.estParDefaut,
    }));
  } catch (error) {
    console.error("Erreur lors du chargement des caisses :", error);
  }

  if (exerciceSelectionne) {
    try {
      const [lignesCotisations, lignesMembres, lignesDepenses] = await Promise.all([
        // SANS filtre estCloture : les clôturées restent visibles si solde > 0.
        prisma.cotisation.findMany({
          where: { exerciceId: exerciceSelectionne.id },
          orderBy: [{ estCloture: "asc" }, { nom: "asc" }],
          select: { id: true },
        }),
        prisma.membre.findMany({
          orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
          select: { id: true, nom: true, prenoms: true },
        }),
        prisma.depense.findMany({
          where: { exerciceId: exerciceSelectionne.id },
          orderBy: [{ dateDepense: "desc" }, { createdAt: "desc" }],
          include: {
            cotisation: { select: { nom: true } },
            beneficiaireMembre: { select: { nom: true, prenoms: true } },
          },
        }),
      ]);

      // Solde réel disponible par cotisation (collecte + compléments − dépenses − transferts).
      const soldes = await Promise.all(
        lignesCotisations.map((ligne) => calculerSoldeCotisation(ligne.id)),
      );
      cotisations = soldes
        .filter((solde): solde is NonNullable<typeof solde> => solde !== null)
        .map((solde) => ({
          id: solde.id,
          nom: solde.nom,
          exerciceId: solde.exerciceId,
          estCloture: solde.estCloture,
          // Plain Objects JSON : Decimal → Number explicite.
          totalCollecte: Number(solde.totalCollecte),
          totalDecaisse: Number(solde.totalDepenseImputee),
          totalTransfertVersCaisse: Number(solde.totalTransfertVersCaisse),
          totalComplementRecu: Number(solde.totalComplementRecu),
          soldeDisponible: Number(solde.soldeDisponible),
        }));

      membres = lignesMembres.map((membre) => ({
        id: membre.id,
        label: `${membre.prenoms} ${membre.nom}`.trim(),
      }));

      // Correspondance caisses en mémoire (caisses chargées séparément via assurerCaissesInitiales).
      const nomsCaisses = new Map(caisses.map((caisse) => [caisse.id, caisse.nom]));

      depenses = lignesDepenses.map((depense) => {
        const caisseIdBrut = (depense as unknown as { caisseId?: unknown }).caisseId;
        const caisseId = typeof caisseIdBrut === "string" ? caisseIdBrut : null;
        return {
          id: depense.id,
          libelle: depense.libelle,
          description: depense.description,
          montant: Number(depense.montant),
          dateDepense: depense.dateDepense.toISOString().slice(0, 10),
          modePaiement: depense.modePaiement,
          numeroPiece: depense.numeroPiece,
          type: depense.type,
          caisseSource: depense.caisseSource,
          caisseId,
          caisseNom: caisseId ? (nomsCaisses.get(caisseId) ?? null) : null,
          cotisationId: depense.cotisationId,
        cotisationNom: depense.cotisation?.nom ?? null,
        beneficiaireMembreId: depense.beneficiaireMembreId,
        beneficiaireNom: depense.beneficiaireMembre
          ? `${depense.beneficiaireMembre.prenoms} ${depense.beneficiaireMembre.nom}`.trim()
          : null,
          beneficiaireTiers: depense.beneficiaireTiers,
        };
      });

      let affectees = 0;
      let caissesDirectes = 0;
      let nombreAffectees = 0;
      let nombreCaissesDirectes = 0;
      for (const depense of depenses) {
        if (depense.type === "AFFECTEE_COTISATION") {
          affectees += depense.montant;
          nombreAffectees += 1;
        } else {
          caissesDirectes += depense.montant;
          nombreCaissesDirectes += 1;
        }
      }
      resume = {
        total: affectees + caissesDirectes,
        affectees,
        caissesDirectes,
        nombre: depenses.length,
        nombreAffectees,
        nombreCaissesDirectes,
      };

      edition = params.edition
        ? (depenses.find((depense) => depense.id === params.edition) ?? null)
        : null;
    } catch (error) {
      console.error("Erreur lors du chargement des dépenses :", error);
      erreurBase = "Impossible de charger les dépenses de l'exercice.";
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Finances</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Dépenses & Décaissements
          </h1>
          <p className="text-sm text-muted-foreground">
            Décaissements de l&apos;exercice — dépenses affectées aux
            cotisations et sorties des caisses internes.
          </p>
          <Link
            href="/finances"
            className="mt-2 inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Retour au tableau des finances
          </Link>
        </div>

        {!erreurBase && exercices.length > 0 && (
          <form method="get" action="/finances/depenses" className="flex items-center gap-2">
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
      </header>

      {erreurBase && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {erreurBase}
        </div>
      )}

      {!erreurBase && !exerciceSelectionne && (
        <p className="rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun exercice disponible — créez d&apos;abord un exercice depuis la
          page Finances.
        </p>
      )}

      {exerciceSelectionne && (
        <>
          <DepenseForm
            key={edition?.id ?? "creation"}
            cotisations={cotisations}
            caisses={caisses}
            membres={membres}
            exerciceId={exerciceSelectionne.id}
            exerciceCloture={exerciceSelectionne.cloture}
            dateInitiale={dateInitiale}
            depense={edition}
          />

          <DepensesListe
            depenses={depenses}
            resume={resume}
            cotisations={cotisations.map((cotisation) => ({
              id: cotisation.id,
              nom: cotisation.nom,
            }))}
            exerciceId={exerciceSelectionne.id}
            exerciceCloture={exerciceSelectionne.cloture}
          />
        </>
      )}
    </div>
  );
}
