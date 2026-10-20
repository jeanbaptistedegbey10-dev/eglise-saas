import type { Metadata } from "next";
import { CircleAlert, ClipboardCheck } from "lucide-react";
import ClotureExerciceModal, { RouvrirExerciceBloc } from "@/components/rapports/ClotureExerciceModal";
import RapportExerciceClient from "@/components/rapports/RapportExerciceClient";
import ExerciceFormModal from "@/components/finances/ExerciceFormModal";
import ExportCSVBouton from "@/components/commun/ExportCSVBouton";
import { prisma } from "@/lib/prisma";
import { parseDonneesEcclesiastiques } from "@/lib/membre";

export const metadata: Metadata = {
  title: "Rapports & Clôture",
  description: "Rapport par exercice et cotisation : filtres instantanes, synthese, registre et cloture.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ exercice?: string; type?: string; cotisation?: string }>;
};

const TOUTES = "toutes";
const TYPES_VALIDES = ["RECURRENTE_CLASSE", "PONCTUELLE_EVENEMENT", "ANONYME_PROJET", "QUETE_CULTE"];

function enISO(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export default async function RapportsPage({ searchParams }: Props) {
  const { exercice: exerciceRequete, type: typeRequete, cotisation: cotisationRequete } = await searchParams;
  const typeInitial = TYPES_VALIDES.includes(typeRequete ?? "") ? (typeRequete as string) : TOUTES;
  const cotisationInitiale = cotisationRequete && cotisationRequete !== TOUTES ? cotisationRequete : TOUTES;

  let exercices: { id: string; annee: number; libelle: string; cloture: boolean }[] = [];
  let erreurBase: string | null = null;

  try {
    const lignes = await prisma.exercice.findMany({ orderBy: { annee: "desc" } });
    exercices = lignes.map((e) => ({ id: e.id, annee: e.annee, libelle: e.libelle, cloture: e.cloture }));
  } catch (error) {
    console.error("Erreur chargement rapports :", error);
    erreurBase = "Impossible de joindre la base de donnees.";
  }

  const exerciceDemandeGlobal = exerciceRequete === "" || exerciceRequete === "toutes" || exerciceRequete === "global";

  const exercice = exerciceDemandeGlobal ? null : (exercices.find((e) => e.id === exerciceRequete) ?? exercices.find((e) => !e.cloture) ?? exercices[0] ?? null);

  let cotisationsClient: { id: string; nom: string; description: string | null; type: string; frequence: string; dateDebut: string | null; dateFin: string | null; estCloture: boolean; montantPlancher: number | null; montantCible: number | null; autoriserSurplus: boolean; departementNom: string | null; groupeNom: string | null; baremes: { cible: string; montant: number }[] }[] = [];
  let versementsClient: { id: string; cotisationId: string; cotisationNom: string; cotisationType: string; membreId: string | null; membreNom: string; membrePrenoms: string; membreTelephone: string | null; classificationSociale: string | null; sexe: string | null; montant: number; montantBase: number; surplus: number; dateEffective: string | null; dateVersement: string | null; modePaiement: string; estAnonyme: boolean }[] = [];
  let kpi = { totalEncaisse: 0, totalDecaisse: 0, soldeNet: 0, nombreContributeurs: 0, nombreVersements: 0 };

  if (exercice && !erreurBase) {
    try {
      const [cotisations, versements, depenses] = await Promise.all([
        prisma.cotisation.findMany({
          where: { exerciceId: exercice.id },
          include: { departement: { select: { nom: true } }, groupe: { select: { nom: true } }, baremes: true },
          orderBy: { nom: "asc" },
        }),
        prisma.versementCotisation.findMany({
          where: { cotisation: { exerciceId: exercice.id } },
          include: { membre: true, cotisation: { select: { id: true, nom: true, type: true } } },
          orderBy: { dateVersement: "asc" },
        }),
        prisma.depense.findMany({ where: { exerciceId: exercice.id } }),
      ]);

      cotisationsClient = cotisations.map((c) => ({
        id: c.id, nom: c.nom, description: c.description, type: String(c.type), frequence: String(c.frequence),
        dateDebut: enISO(c.dateDebut), dateFin: enISO(c.dateFin), estCloture: c.estCloture,
        montantPlancher: c.montantPlancher != null ? Number(c.montantPlancher) : null,
        montantCible: c.montantCible != null ? Number(c.montantCible) : null,
        autoriserSurplus: c.autoriserSurplus,
        departementNom: c.departement?.nom ?? null, groupeNom: c.groupe?.nom ?? null,
        baremes: c.baremes.map((b) => ({ cible: String(b.cible), montant: Number(b.montant) })),
      }));

      versementsClient = versements.map((v) => {
        const profil = parseDonneesEcclesiastiques(v.membre?.donneesEcclesiastiques ?? null);
        return {
          id: v.id, cotisationId: v.cotisationId, cotisationNom: v.cotisation.nom, cotisationType: String(v.cotisation.type),
          membreId: v.membreId, membreNom: v.membre?.nom ?? "Anonyme", membrePrenoms: v.membre?.prenoms ?? "",
          membreTelephone: v.membre?.telephone ?? null,
          classificationSociale: profil.classificationSociale ?? null, sexe: profil.sexe ?? null,
          montant: Number(v.montant), montantBase: Number(v.montantBase), surplus: Number(v.surplusVolontaire),
          dateEffective: enISO(v.dateEffective), dateVersement: enISO(v.dateVersement),
          modePaiement: String(v.modePaiement), estAnonyme: v.estAnonyme,
        };
      });

      const totalEncaisse = versements.reduce((s, v) => s + Number(v.montant), 0);
      const totalDecaisse = depenses.reduce((s, d) => s + Number(d.montant), 0);
      kpi = {
        totalEncaisse, totalDecaisse, soldeNet: totalEncaisse - totalDecaisse,
        nombreContributeurs: new Set(versements.filter((v) => v.membreId).map((v) => v.membreId as string)).size,
        nombreVersements: versements.length,
      };
    } catch (error) {
      console.error("Erreur calcul rapport :", error);
      erreurBase = "Impossible de calculer le rapport.";
    }
  }

  // Repli global : aucun exercice sélectionné / aucun exercice en base —
  // on charge toutes les récurrentes tous exercices pour ne jamais masquer le suivi.
  if (!exercice && !erreurBase) {
    try {
      const [cotisations, versements] = await Promise.all([
        prisma.cotisation.findMany({
          where: { type: "RECURRENTE_CLASSE" },
          include: { departement: { select: { nom: true } }, groupe: { select: { nom: true } }, baremes: true },
          orderBy: { nom: "asc" },
        }),
        prisma.versementCotisation.findMany({
          where: { cotisation: { type: "RECURRENTE_CLASSE" } },
          include: { membre: true, cotisation: { select: { id: true, nom: true, type: true } } },
          orderBy: { dateVersement: "asc" },
        }),
      ]);

      cotisationsClient = cotisations.map((c) => ({
        id: c.id, nom: c.nom, description: c.description, type: String(c.type), frequence: String(c.frequence),
        dateDebut: enISO(c.dateDebut), dateFin: enISO(c.dateFin), estCloture: c.estCloture,
        montantPlancher: c.montantPlancher != null ? Number(c.montantPlancher) : null,
        montantCible: c.montantCible != null ? Number(c.montantCible) : null,
        autoriserSurplus: c.autoriserSurplus,
        departementNom: c.departement?.nom ?? null, groupeNom: c.groupe?.nom ?? null,
        baremes: c.baremes.map((b) => ({ cible: String(b.cible), montant: Number(b.montant) })),
      }));

      versementsClient = versements.map((v) => {
        const profil = parseDonneesEcclesiastiques(v.membre?.donneesEcclesiastiques ?? null);
        return {
          id: v.id, cotisationId: v.cotisationId, cotisationNom: v.cotisation.nom, cotisationType: String(v.cotisation.type),
          membreId: v.membreId, membreNom: v.membre?.nom ?? "Anonyme", membrePrenoms: v.membre?.prenoms ?? "",
          membreTelephone: v.membre?.telephone ?? null,
          classificationSociale: profil.classificationSociale ?? null, sexe: profil.sexe ?? null,
          montant: Number(v.montant), montantBase: Number(v.montantBase), surplus: Number(v.surplusVolontaire),
          dateEffective: enISO(v.dateEffective), dateVersement: enISO(v.dateVersement),
          modePaiement: String(v.modePaiement), estAnonyme: v.estAnonyme,
        };
      });

      const totalEncaisse = versements.reduce((s, v) => s + Number(v.montant), 0);
      kpi = {
        totalEncaisse, totalDecaisse: 0, soldeNet: totalEncaisse,
        nombreContributeurs: new Set(versements.filter((v) => v.membreId).map((v) => v.membreId as string)).size,
        nombreVersements: versements.length,
      };
    } catch (error) {
      console.error("Erreur calcul rapport global :", error);
      erreurBase = "Impossible de calculer le rapport.";
    }
  }

  return (
    <div className="rapport-page mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Pilotage</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Rapports & cloture</h1>
          <p className="text-sm text-muted-foreground">Filtres instantanes, detail par cotisation et cloture.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!erreurBase && versementsClient.length > 0 && (
            <ExportCSVBouton
              base={`grand-livre-${exercice?.libelle ?? "global"}`}
              colonnes={[
                "Date effective",
                "Date saisie",
                "Cotisation",
                "Type cotisation",
                "Membre",
                "Téléphone",
                "Montant base",
                "Surplus",
                "Montant total",
                "Mode paiement",
                "Anonyme",
              ]}
              lignes={versementsClient.map((v) => [
                v.dateEffective ?? "",
                v.dateVersement ?? "",
                v.cotisationNom,
                v.cotisationType,
                v.estAnonyme || !v.membreId ? "Don anonyme" : `${v.membrePrenoms} ${v.membreNom}`,
                v.membreTelephone ?? "",
                v.montantBase,
                v.surplus,
                v.montant,
                v.modePaiement,
                v.estAnonyme ? "Oui" : "Non",
              ])}
            />
          )}
          {exercice && !exercice.cloture && (<ClotureExerciceModal exerciceId={exercice.id} exerciceLibelle={exercice.libelle} exerciceAnnee={exercice.annee} />)}
          {exercice && exercice.cloture && (<RouvrirExerciceBloc exerciceId={exercice.id} exerciceLibelle={exercice.libelle} />)}
        </div>
      </header>
      {erreurBase && (<div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{erreurBase}</span></div>)}
      {!erreurBase && !exercice && exercices.length === 0 && versementsClient.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><ClipboardCheck className="h-7 w-7 text-muted-foreground" aria-hidden /></span>
          <p className="text-base font-medium text-foreground">Aucun exercice comptable — affichage global des récurrentes ci-dessous</p>
          <ExerciceFormModal />
        </div>
      )}
      {!erreurBase && !exercice && (
        <RapportExerciceClient
          exercices={exercices}
          exerciceId=""
          exerciceLibelle="Tous les exercices (global)"
          exerciceCloture={false}
          cotisations={cotisationsClient}
          versements={versementsClient}
          kpi={kpi}
          typeInitial={typeInitial}
          cotisationInitiale={cotisationInitiale}
        />
      )}
      {exercice && (
        <RapportExerciceClient
          exercices={exercices}
          exerciceId={exercice.id}
          exerciceLibelle={exercice.libelle}
          exerciceCloture={exercice.cloture}
          cotisations={cotisationsClient}
          versements={versementsClient}
          kpi={kpi}
          typeInitial={typeInitial}
          cotisationInitiale={cotisationInitiale}
        />
      )}
    </div>
  );
}


