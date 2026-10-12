import type { Metadata } from "next";
import { CircleAlert, ClipboardCheck } from "lucide-react";

import ClotureExerciceModal from "@/components/rapports/ClotureExerciceModal";
import TableauQuiADonne from "@/components/rapports/TableauQuiADonne";
import ExerciceFormModal from "@/components/finances/ExerciceFormModal";
import { extraireStatistiquesExercice } from "@/actions/rapport";
import { formatMontant, libelleTypeCotisation } from "@/lib/finance";
import { libelleModePaiement } from "@/lib/membre";
import { prisma } from "@/lib/prisma";
import type { ExerciceOption, TypeCotisationOption } from "@/types/finance";
import type { LigneQuiADonne, VersementRecu } from "@/types/rapport";

export const metadata: Metadata = {
  title: "Rapports & Clôture",
  description:
    "Qui a donné par exercice et cotisation : montants cotisés, attendus, restes à payer, reçus PDF et clôture comptable.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ exercice?: string; type?: string; classe?: string }>;
};

const TOUTES = "toutes";

export default async function RapportsPage({ searchParams }: Props) {
  const {
    exercice: exerciceRequete,
    type: typeRequete,
    classe: classeRequete,
  } = await searchParams;

  let exercices: ExerciceOption[] = [];
  let types: (TypeCotisationOption & {
    paliers: { id: string; libelleClasse: string; montant: number }[];
  })[] = [];
  let erreurBase: string | null = null;

  try {
    const [lignesExercices, lignesTypes] = await Promise.all([
      prisma.exercice.findMany({ orderBy: { annee: "desc" } }),
      prisma.typeCotisation.findMany({
        orderBy: { libelle: "asc" },
        include: { paliers: { orderBy: { libelleClasse: "asc" } } },
      }),
    ]);
    exercices = lignesExercices.map((e) => ({
      id: e.id,
      annee: e.annee,
      libelle: e.libelle,
      cloture: e.cloture,
    }));
    types = lignesTypes.map((t) => ({
      id: t.id,
      libelle: t.libelle,
      type: t.type,
      paliers: t.paliers.map((p) => ({
        id: p.id,
        libelleClasse: p.libelleClasse,
        montant: Number(p.montant),
      })),
    }));
  } catch (error) {
    console.error("Erreur chargement rapports :", error);
    erreurBase = "Impossible de joindre la base de données.";
  }

  const exercice =
    exercices.find((e) => e.id === exerciceRequete) ??
    exercices.find((e) => !e.cloture) ??
    exercices[0] ??
    null;

  const typeSelectionne = types.find((t) => t.id === typeRequete) ?? null;
  const typeIdFiltre = typeSelectionne ? typeSelectionne.id : undefined;

  // Palier filtré (Option C : l'attendu = montant de la classe choisie).
  // Rechargé depuis la base pour garantir l'appartenance à l'exercice.
  let palierFiltre: { id: string; libelleClasse: string; montant: number } | null = null;
  if (exercice && classeRequete && classeRequete !== TOUTES) {
    try {
      const trouve = await prisma.paliereBareme.findFirst({
        where: {
          id: classeRequete,
          exerciceId: exercice.id,
          ...(typeSelectionne ? { typeCotisationId: typeSelectionne.id } : {}),
        },
      });
      if (trouve) {
        palierFiltre = {
          id: trouve.id,
          libelleClasse: trouve.libelleClasse,
          montant: Number(trouve.montant),
        };
      }
    } catch (error) {
      console.error("Erreur chargement palier filtré :", error);
    }
  }

  const avecAttendu = palierFiltre !== null;

  // Classes proposées : celles du type filtré, sinon toutes de l'exercice.
  const classesDisponibles: { id: string; libelleClasse: string; montant: number }[] =
    exercice
      ? (
          await prisma.paliereBareme.findMany({
            where: {
              exerciceId: exercice.id,
              ...(typeSelectionne ? { typeCotisationId: typeSelectionne.id } : {}),
            },
            orderBy: { libelleClasse: "asc" },
          })
        ).map((p) => ({
          id: p.id,
          libelleClasse: p.libelleClasse,
          montant: Number(p.montant),
        }))
      : [];

  let lignes: LigneQuiADonne[] = [];
  let versementsParMembre: Record<string, VersementRecu[]> = {};
  let stats: Awaited<ReturnType<typeof extraireStatistiquesExercice>> = null;

  if (exercice && !erreurBase) {
    try {
      const [membres, paiements] = await Promise.all([
        prisma.membre.findMany({
          orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
        }),
        prisma.paiement.findMany({
          where: {
            exerciceId: exercice.id,
            ...(typeIdFiltre ? { typeCotisationId: typeIdFiltre } : {}),
          },
          include: { typeCotisation: { select: { libelle: true } } },
          orderBy: { datePaiement: "asc" },
        }),
      ]);

      stats = await extraireStatistiquesExercice(exercice.id, typeIdFiltre);

      const totaux = new Map<string, { total: number; nombre: number }>();
      versementsParMembre = {};
      for (const p of paiements) {
        if (p.membreId === null) continue;
        const entree = totaux.get(p.membreId) ?? { total: 0, nombre: 0 };
        entree.total += Number(p.montant);
        entree.nombre += 1;
        totaux.set(p.membreId, entree);
        (versementsParMembre[p.membreId] ??= []).push({
          datePaiement: p.datePaiement.toISOString(),
          montant: Number(p.montant),
          modePaiement: libelleModePaiement(p.modePaiement),
          typeLibelle: p.typeCotisation.libelle,
          commentaire: p.commentaire,
        });
      }

      lignes = membres.map((m) => {
        const agg = totaux.get(m.id);
        const totalVerse = agg?.total ?? 0;
        const nombreVersements = agg?.nombre ?? 0;
        if (!avecAttendu || !palierFiltre) {
          return {
            membreId: m.id,
            nom: m.nom,
            prenoms: m.prenoms,
            telephone: m.telephone,
            totalVerse,
            montantAttendu: null,
            resteAPayer: null,
            statut: totalVerse > 0 ? "CONTRIBUTEUR" : "SANS_VERSEMENT",
            nombreVersements,
          } satisfies LigneQuiADonne;
        }
        const attendu = palierFiltre.montant;
        const reste = Math.max(0, Math.round((attendu - totalVerse) * 100) / 100);
        return {
          membreId: m.id,
          nom: m.nom,
          prenoms: m.prenoms,
          telephone: m.telephone,
          totalVerse,
          montantAttendu: attendu,
          resteAPayer: reste,
          statut:
            totalVerse + 0.001 >= attendu
              ? "SOLDE"
              : totalVerse > 0
                ? "PARTIEL"
                : "RIEN_VERSE",
          nombreVersements,
        } satisfies LigneQuiADonne;
      });
    } catch (error) {
      console.error("Erreur calcul Qui a donné :", error);
      erreurBase = "Impossible de calculer le rapport pour cet exercice.";
    }
  }

  const nombreSoldes = lignes.filter((l) => l.statut === "SOLDE").length;
  const totalAttendu =
    avecAttendu && palierFiltre
      ? Math.round(palierFiltre.montant * lignes.length * 100) / 100
      : null;
  const totalCotise = lignes.reduce((s, l) => s + l.totalVerse, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Pilotage</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Rapports & clôture
          </h1>
          <p className="text-sm text-muted-foreground">
            Qui a donné, par exercice et par cotisation — avec reçus PDF et clôture.
          </p>
        </div>
        {exercice && !exercice.cloture && (
          <ClotureExerciceModal
            exerciceId={exercice.id}
            exerciceLibelle={exercice.libelle}
            exerciceAnnee={exercice.annee}
          />
        )}
      </header>

      {erreurBase && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erreurBase}</span>
        </div>
      )}

      {!erreurBase && !exercice && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ClipboardCheck className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <p className="text-base font-medium text-foreground">Aucun exercice comptable</p>
          <ExerciceFormModal />
        </div>
      )}

      {exercice && (
        <form
          method="get"
          action="/rapports"
          className="flex flex-wrap items-end gap-4 rounded-2xl border border-card-border bg-card px-5 py-4 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rapport-exercice" className="text-sm font-medium text-foreground">
              Exercice
            </label>
            <select
              id="rapport-exercice"
              name="exercice"
              defaultValue={exercice.id}
              className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none"
            >
              {exercices.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.libelle}
                  {e.cloture ? " (clôturé)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rapport-type" className="text-sm font-medium text-foreground">
              Type de cotisation
            </label>
            <select
              id="rapport-type"
              name="type"
              defaultValue={typeSelectionne?.id ?? TOUTES}
              className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none"
            >
              <option value={TOUTES}>Toutes cotisations</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.libelle} ({libelleTypeCotisation(t.type)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rapport-classe" className="text-sm font-medium text-foreground">
              Classe (barème)
            </label>
            <select
              id="rapport-classe"
              name="classe"
              defaultValue={palierFiltre?.id ?? TOUTES}
              className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none"
            >
              <option value={TOUTES}>Toutes classes</option>
              {classesDisponibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelleClasse} — {formatMontant(c.montant)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
          >
            Filtrer
          </button>
          {exercice.cloture && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              Exercice clôturé — lecture seule
            </span>
          )}
        </form>
      )}

      {exercice && !avecAttendu && (
        <p className="rounded-2xl border border-dashed border-card-border bg-card/60 px-5 py-4 text-xs text-muted-foreground">
          Choisissez une classe pour voir l&apos;attendu et le reste à payer
          (attendu = montant du palier). Sans classe, le tableau affiche les
          montants cotisés seuls.
        </p>
      )}

      {exercice && stats && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total collecté
            </span>
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {formatMontant(stats.totalGeneral)}
            </span>
            <span className="text-xs text-muted-foreground">
              {stats.nombrePaiements} versements
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Contributeurs
            </span>
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {stats.nombreContributeurs}
            </span>
            <span className="text-xs text-muted-foreground">membres identifiés</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Soldés
            </span>
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {avecAttendu ? `${nombreSoldes} / ${lignes.length}` : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {avecAttendu ? "membres à jour" : "choisissez une classe"}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total attendu
            </span>
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {totalAttendu !== null ? formatMontant(totalAttendu) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              cotisé : {formatMontant(totalCotise)}
            </span>
          </div>
        </section>
      )}

      {exercice && (
        <TableauQuiADonne
          lignes={lignes}
          versementsParMembre={versementsParMembre}
          exerciceLibelle={exercice.libelle}
          exerciceAnnee={exercice.annee}
          cotisationLibelle={typeSelectionne?.libelle ?? null}
          classeLibelle={palierFiltre?.libelleClasse ?? null}
          avecAttendu={avecAttendu}
        />
      )}
    </div>
  );
}

