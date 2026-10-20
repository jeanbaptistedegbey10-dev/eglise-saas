import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CircleAlert,
  Coins,
  HandCoins,
  Settings2,
} from "lucide-react";
import clsx from "clsx";

import CotisationForm from "@/components/finances/CotisationForm";
import CotisationsListe from "@/components/finances/CotisationsListe";
import CotisationsRapports from "@/components/finances/CotisationsRapports";
import ExportCSVBouton from "@/components/commun/ExportCSVBouton";
import VersementCotisationForm from "@/components/finances/VersementCotisationForm";
import {
  construireBilanExercice,
  construireRapportsCampagnes,
  construireVentilationMensuelle,
  type CotisationRapport,
  type MembreRapport,
} from "@/lib/cotisation-rapports";
import { determinerCible, determinerClasseAge, determinerSexe, typeMontantLibre } from "@/lib/cotisation";
import { parseDonneesEcclesiastiques } from "@/lib/membre";
import { libelleMoisClef, moisExercice, normaliserMoisCoches, type MoisExercice } from "@/lib/mois";
import { prisma } from "@/lib/prisma";
import type { ExerciceOption } from "@/types/finance";
import type {
  BilanExercice,
  CotisationEdition,
  CotisationPourVersement,
  CotisationResume,
  LigneMensuelleRapport,
  MembrePourVersement,
  MoisPaye,
  RapportCampagne,
} from "@/types/cotisation";

export const metadata: Metadata = {
  title: "Cotisations — Types, Versements & Rapports",
  description:
    "Module Finances à 3 onglets : types de cotisations et barèmes, enregistrement des versements (mois, surplus), rapports et bilans de l'exercice.",
};

export const dynamic = "force-dynamic";

/** Les 3 onglets du module Cotisations. */
const ONGLETS = [
  {
    id: "types",
    label: "Types de Cotisations & Barèmes",
    icon: Settings2,
    resume: "Créer, modifier, clôturer les cotisations et définir les barèmes.",
  },
  {
    id: "versements",
    label: "Enregistrement des Versements",
    icon: HandCoins,
    resume: "Mois réglés, plancher + surplus, dons anonymes.",
  },
  {
    id: "rapports",
    label: "Rapports & Bilans",
    icon: BarChart3,
    resume: "Bilan annuel, ventilation mensuelle et campagnes.",
  },
] as const;

type IdOnglet = (typeof ONGLETS)[number]["id"];

type Props = {
  searchParams: Promise<{
    exercice?: string;
    tab?: string;
    onglet?: string;
    edition?: string;
    cotisation?: string;
  }>;
};

/** Convertit une date Prisma en ISO court (AAAA-MM-JJ) ou null. */
function enISO(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export default async function CotisationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const ongletDemande = params.tab ?? params.onglet;
  const onglet: IdOnglet = ONGLETS.some((item) => item.id === ongletDemande)
    ? (ongletDemande as IdOnglet)
    : "types";
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

  const exerciceSelectionne =
    exercices.find((exercice) => exercice.id === params.exercice) ??
    exercices.find((exercice) => !exercice.cloture) ??
    exercices[0] ??
    null;

  let cotisationsResume: CotisationResume[] = [];
  let cotisationsVersement: CotisationPourVersement[] = [];
  let membresVersement: MembrePourVersement[] = [];
  let edition: CotisationEdition | null = null;
  let departements: { id: string; nom: string }[] = [];
  let groupes: { id: string; nom: string }[] = [];
  let mois: MoisExercice[] = [];
  let bilan: BilanExercice | null = null;
  let suivisMensuels: LigneMensuelleRapport[] = [];
  let campagnes: RapportCampagne[] = [];
  let cotisationsDetail: CotisationRapport[] = [];
  let membresDetail: MembreRapport[] = [];

  if (exerciceSelectionne) {
    mois = moisExercice(exerciceSelectionne.moisDebut, exerciceSelectionne.moisFin);

    try {
      const [lignesCotisations, membres, departementsLignes, groupesLignes] = await Promise.all([
        prisma.cotisation.findMany({
          where: { exerciceId: exerciceSelectionne.id },
          orderBy: { createdAt: "desc" },
          include: { baremes: true, versements: true, depenses: true, departement: true, groupe: true },
        }),
        prisma.membre.findMany({
          orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
          select: {
            id: true,
            nom: true,
            prenoms: true,
            telephone: true,
            donneesEcclesiastiques: true,
          },
        }),
        prisma.departement.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
        prisma.groupe.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      ]);

      departements = departementsLignes;
      groupes = groupesLignes;

      membresVersement = membres.map((membre) => {
        const profil = parseDonneesEcclesiastiques(membre.donneesEcclesiastiques);
        return {
          id: membre.id,
          label: `${membre.prenoms} ${membre.nom}`.trim(),
          telephone: membre.telephone,
          cible: determinerCible(profil),
          sexe: determinerSexe(profil),
          typePersonne: profil.typePersonne ?? null,
          classeAge: determinerClasseAge(profil),
        };
      });

      // --- Onglet 1 : résumés de chaque cotisation ---
      cotisationsResume = lignesCotisations.map((ligne) => {
        let totalVerse = 0;
        let montantBaseTotal = 0;
        let surplusTotal = 0;
        const participants = new Set<string>();

        for (const versement of ligne.versements) {
          totalVerse += Number(versement.montant);
          montantBaseTotal += Number(versement.montantBase);
          surplusTotal += Number(versement.surplusVolontaire);
          if (versement.membreId) participants.add(versement.membreId);
        }

        return {
          id: ligne.id,
          nom: ligne.nom,
          description: ligne.description,
          type: ligne.type,
          frequence: ligne.frequence,
          dateDebut: enISO(ligne.dateDebut),
          dateFin: enISO(ligne.dateFin),
          estCloture: ligne.estCloture,
          montantPlancher:
            ligne.montantPlancher != null ? Number(ligne.montantPlancher) : null,
          autoriserSurplus: ligne.autoriserSurplus,
          montantCible: ligne.montantCible != null ? Number(ligne.montantCible) : null,
          departementId: ligne.departementId ?? null,
          groupeId: ligne.groupeId ?? null,
          departementNom: ligne.departement?.nom ?? null,
          groupeNom: ligne.groupe?.nom ?? null,
          baremes: ligne.baremes.map((bareme) => ({
            cible: bareme.cible,
            montant: Number(bareme.montant),
          })),
          totalVerse,
          montantBaseTotal,
          surplusTotal,
          nombreVersements: ligne.versements.length,
          nombreParticipants: participants.size,
          // Plain Objects JSON sérialisables : Decimal → Number, Date → ISO.
          versements: ligne.versements.map((versement) => ({
            id: versement.id,
            cotisationId: versement.cotisationId,
            membreId: versement.membreId ?? null,
            montant: Number(versement.montant),
            montantBase: Number(versement.montantBase),
            surplusVolontaire: Number(versement.surplusVolontaire),
            moisCoches: [...versement.moisCoches],
            estAnonyme: versement.estAnonyme,
            dateEffective: enISO(versement.dateEffective),
            dateVersement: versement.dateVersement
              ? versement.dateVersement.toISOString()
              : null,
            modePaiement: versement.modePaiement,
            commentaire: versement.commentaire ?? null,
            createdAt: versement.createdAt
              ? versement.createdAt.toISOString()
              : null,
          })),
          depenses: ligne.depenses.map((depense) => ({
            id: depense.id,
            libelle: depense.libelle,
            description: depense.description ?? null,
            montant: Number(depense.montant),
            dateDepense: depense.dateDepense
              ? depense.dateDepense.toISOString().slice(0, 10)
              : null,
            modePaiement: depense.modePaiement,
            numeroPiece: depense.numeroPiece ?? null,
            cotisationId: depense.cotisationId ?? null,
            exerciceId: depense.exerciceId,
            createdAt: depense.createdAt
              ? depense.createdAt.toISOString()
              : null,
            updatedAt: depense.updatedAt
              ? depense.updatedAt.toISOString()
              : null,
          })),
        };
      });

      // --- Onglet 2 : mois déjà réglés + membres ayant déjà réglé (paiement unique) ---
      // Pour les cotisations à paiement unique (ponctuelle / anonyme), on charge
      // les membres ayant déjà versé afin de les désactiver côté client et de
      // refuser un second versement (le contrôle serveur existe aussi).
      const idsPonctuelles = lignesCotisations
        .filter((ligne) => ligne.type !== "RECURRENTE_CLASSE")
        .map((ligne) => ligne.id);
      const membresReglesParCotisation = new Map<string, string[]>();
      if (idsPonctuelles.length > 0) {
        const dejaRegles = await prisma.versementCotisation.findMany({
          where: { cotisationId: { in: idsPonctuelles }, membreId: { not: null } },
          select: { cotisationId: true, membreId: true },
        });
        for (const lien of dejaRegles) {
          if (!lien.membreId) continue;
          const liste = membresReglesParCotisation.get(lien.cotisationId) ?? [];
          liste.push(lien.membreId);
          membresReglesParCotisation.set(lien.cotisationId, liste);
        }
      }

      cotisationsVersement = lignesCotisations.map((ligne) => {
        const moisPayes: Record<string, MoisPaye[]> = {};
        let totalVerse = 0;

        for (const versement of ligne.versements) {
          totalVerse += Number(versement.montant);
          if (!versement.membreId) continue;
          const date = versement.dateEffective.toISOString();
          for (const cle of normaliserMoisCoches(versement.moisCoches)) {
            (moisPayes[versement.membreId] ??= []).push({
              cle,
              libelle: libelleMoisClef(cle),
              date,
            });
          }
        }

        return {
          id: ligne.id,
          nom: ligne.nom,
          type: ligne.type,
          frequence: ligne.frequence,
          dateDebut: enISO(ligne.dateDebut),
          dateFin: enISO(ligne.dateFin),
          estCloture: ligne.estCloture,
          montantPlancher:
            ligne.montantPlancher != null ? Number(ligne.montantPlancher) : null,
          autoriserSurplus: ligne.autoriserSurplus,
          montantCible: ligne.montantCible != null ? Number(ligne.montantCible) : null,
          // Membres ayant déjà réglé (paiement unique) — désactivés côté client.
          membresRegles:
            ligne.type === "RECURRENTE_CLASSE"
              ? []
              : (membresReglesParCotisation.get(ligne.id) ?? []),
          baremes: ligne.baremes.map((bareme) => ({
            cible: bareme.cible,
            montant: Number(bareme.montant),
          })),
          moisPayes,
          totalVerse,
        };
      });

      // --- Édition d'une cotisation (?edition=) ---
      if (params.edition) {
        const ligne = lignesCotisations.find((item) => item.id === params.edition);
        if (ligne) {
          edition = {
            id: ligne.id,
            nom: ligne.nom,
            description: ligne.description,
            type: ligne.type,
            frequence: ligne.frequence,
            dateDebut: enISO(ligne.dateDebut),
            dateFin: enISO(ligne.dateFin),
            estCloture: ligne.estCloture,
            montantPlancher:
              ligne.montantPlancher != null ? Number(ligne.montantPlancher) : null,
            autoriserSurplus: ligne.autoriserSurplus,
            montantCible:
              ligne.montantCible != null ? Number(ligne.montantCible) : null,
            departementId: ligne.departementId ?? null,
            groupeId: ligne.groupeId ?? null,
            baremes: ligne.baremes.map((bareme) => ({
              cible: bareme.cible,
              montant: Number(bareme.montant),
            })),
          };
        }
      }

      // --- Onglet 3 : Données pour le composant Rapports ---
      const membresRapport: MembreRapport[] = membresVersement.map((membre) => ({
        membreId: membre.id,
        cible: membre.cible,
        label: membre.label,
      }));

      const cotisationsRapport: CotisationRapport[] = lignesCotisations.map((ligne) => ({
        id: ligne.id,
        nom: ligne.nom,
        type: ligne.type,
        frequence: ligne.frequence,
        estCloture: ligne.estCloture,
        montantPlancher:
          ligne.montantPlancher != null ? Number(ligne.montantPlancher) : null,
        montantCible: ligne.montantCible != null ? Number(ligne.montantCible) : null,
        baremes: ligne.baremes.map((bareme) => ({
          cible: bareme.cible,
          montant: Number(bareme.montant),
        })),
        versements: ligne.versements.map((versement) => ({
          id: versement.id,
          membreId: versement.membreId,
          moisCoches: normaliserMoisCoches(versement.moisCoches),
          montant: Number(versement.montant),
          montantBase: Number(versement.montantBase),
          surplus: Number(versement.surplusVolontaire),
          estAnonyme: versement.estAnonyme,
          dateEffective: enISO(versement.dateEffective),
          modePaiement: versement.modePaiement,
        })),
      }));

      const recurrentes = cotisationsRapport.filter(
        (cotisation) => cotisation.type === "RECURRENTE_CLASSE",
      );
      const ponctuelles = cotisationsRapport.filter(
        (cotisation) => cotisation.type === "PONCTUELLE_EVENEMENT",
      );
      // « Anonymes » regroupe les collectes à montant libre : travaux/projets et
      // quêtes de culte (ni récurrentes ni ponctuelles).
      const anonymes = cotisationsRapport.filter((cotisation) =>
        typeMontantLibre(cotisation.type),
      );

      const datesParCotisation: Record<
        string,
        { debut: string | null; fin: string | null }
      > = {};
      let nombreDonsSansMembre = 0;
      for (const ligne of lignesCotisations) {
        datesParCotisation[ligne.id] = {
          debut: enISO(ligne.dateDebut),
          fin: enISO(ligne.dateFin),
        };
        nombreDonsSansMembre += ligne.versements.filter(
          (versement) => versement.membreId === null,
        ).length;
      }

      bilan = construireBilanExercice({
        recurrentes,
        ponctuelles,
        anonymes,
        membres: membresRapport,
        nombreMois: mois.length,
        nombreDonsSansMembre,
      });

      suivisMensuels = construireVentilationMensuelle(
        recurrentes,
        membresRapport,
        exerciceSelectionne.moisDebut,
        exerciceSelectionne.moisFin,
      );

      campagnes = construireRapportsCampagnes(cotisationsRapport, datesParCotisation);
      cotisationsDetail = cotisationsRapport;
      membresDetail = membresRapport;
    } catch (error) {
      console.error("Erreur lors du chargement des cotisations :", error);
      erreurBase = "Impossible de charger les cotisations de cet exercice.";
    }
  }

  const urlVers = (cibleOnglet: IdOnglet, avecEdition = false): string => {
    const recherche = new URLSearchParams({ tab: cibleOnglet });
    if (exerciceSelectionne) recherche.set("exercice", exerciceSelectionne.id);
    if (avecEdition && params.edition) recherche.set("edition", params.edition);
    return `/finances/cotisations?${recherche.toString()}`;
  };

  // Journal des versements de l'exercice courant pour l'export CSV
  // (onglet « versements ») — colonnes en français, montants bruts.
  const colonnesVersementsCSV = [
    "Date effective",
    "Date saisie",
    "Cotisation",
    "Membre",
    "Téléphone",
    "Montant base",
    "Surplus",
    "Montant total",
    "Mois payés",
    "Mode paiement",
    "Anonyme",
  ];
  const membresParId = new Map(membresVersement.map((m) => [m.id, m]));
  const lignesVersementsCSV = cotisationsResume.flatMap((c) =>
    (c.versements ?? []).map((v) => {
      const membre = v?.membreId ? membresParId.get(v.membreId) : undefined;
      return [
        v?.dateEffective ?? "",
        v?.dateVersement ?? "",
        c?.nom ?? "",
        v?.estAnonyme ? "Don anonyme" : (membre?.label ?? ""),
        membre?.telephone ?? "",
        v?.montantBase ?? "",
        v?.surplusVolontaire ?? "",
        v?.montant ?? "",
        (v?.moisCoches ?? []).join("; "),
        v?.modePaiement ?? "",
        v?.estAnonyme ? "Oui" : "Non",
      ];
    }),
  );

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
            Cotisations
          </h1>
          <p className="text-sm text-muted-foreground">
            Trois onglets : les types de cotisations et leurs barèmes, l&apos;enregistrement
            des versements (mois, plancher &amp; surplus), puis les rapports et bilans de
            l&apos;exercice.
          </p>
        </div>
        {!erreurBase && lignesVersementsCSV.length > 0 && (
          <div className="flex shrink-0 items-center">
            <ExportCSVBouton
              base={`versements-${exerciceSelectionne?.libelle ?? "exercice"}`}
              colonnes={colonnesVersementsCSV}
              lignes={lignesVersementsCSV}
            />
          </div>
        )}
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

      {!exerciceSelectionne && !erreurBase && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Coins className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <p className="text-base font-medium text-foreground">Aucun exercice comptable</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Les cotisations sont rattachées à un exercice. Créez d&apos;abord un exercice
            depuis la page Finances, puis revenez configurer vos cotisations.
          </p>
          <Link
            href="/finances"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
          >
            Aller aux finances
          </Link>
        </div>
      )}

      {exerciceSelectionne && (
        <>
          {/* Sélecteur d'exercice (la suppression vit sur la page de clôture) */}
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-card-border bg-card px-5 py-4 shadow-sm">
            <form
              method="get"
              action="/finances/cotisations"
              className="flex flex-wrap items-center gap-3"
            >
              <input type="hidden" name="tab" value={onglet} />
              <label
                htmlFor="cotisation-exercice"
                className="text-sm font-medium text-foreground"
              >
                Exercice
              </label>
              <select
                id="cotisation-exercice"
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
                className="rounded-lg border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Afficher
              </button>
              <span className="text-xs text-muted-foreground">
                Du {mois[0]?.libelle} au {mois[mois.length - 1]?.libelle} · {mois.length} mois
              </span>
            </form>
          </div>

          {exerciceSelectionne.cloture && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Cet exercice est clôturé : les données s&apos;affichent à titre
                consultatif, la saisie est désactivée.
              </span>
            </div>
          )}

          {/* Barre des 3 onglets */}
          <nav
            aria-label="Sections des cotisations"
            className="flex flex-col gap-1.5 rounded-2xl border border-card-border bg-card p-1.5 shadow-sm sm:flex-row"
          >
            {ONGLETS.map((item) => {
              const actif = item.id === onglet;
              const Icone = item.icon;
              return (
                <Link
                  key={item.id}
                  href={urlVers(item.id)}
                  aria-current={actif ? "page" : undefined}
                  className={clsx(
                    "flex flex-1 items-center gap-2.5 rounded-xl px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    actif
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icone className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span
                      className={clsx(
                        "text-[11px] leading-tight",
                        actif ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {item.resume}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* ---------- ONGLET 1 : Types de cotisations & barèmes ---------- */}
          {onglet === "types" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[24rem_1fr] items-start">
              {!exerciceSelectionne.cloture ? (
                <CotisationForm
                  key={edition?.id ?? "creation"}
                  exerciceId={exerciceSelectionne.id}
                  exerciceLibelle={exerciceSelectionne.libelle}
                  edition={edition}
                  urlAnnulation={urlVers("types")}
                  departements={departements}
                  groupes={groupes}
                />
              ) : (
                <p className="rounded-2xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Exercice clôturé : la création et la modification de cotisations sont désactivées.
                </p>
              )}

              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    Cotisations de l&apos;exercice
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {cotisationsResume.length} cotisation{cotisationsResume.length > 1 ? "s" : ""}
                  </span>
                </div>
                <CotisationsListe
                  cotisations={cotisationsResume}
                  exerciceId={exerciceSelectionne.id}
                  exerciceCloture={exerciceSelectionne.cloture}
                  selectionneeId={params.cotisation ?? cotisationsResume[0]?.id ?? null}
                />
              </section>
            </div>
          )}

          {/* ---------- ONGLET 2 : Enregistrement des versements ---------- */}
          {onglet === "versements" && (
            <VersementCotisationForm
              cotisations={cotisationsVersement}
              membres={membresVersement}
              mois={mois}
              dateInitiale={dateInitiale}
              exerciceCloture={exerciceSelectionne.cloture}
              cotisationInitiale={params.cotisation ?? null}
            />
          )}

          {/* ---------- ONGLET 3 : Rapports & bilans ---------- */}
          {onglet === "rapports" && bilan && (
            <CotisationsRapports
              exerciceLibelle={exerciceSelectionne.libelle}
              bilan={bilan}
              suivisMensuels={suivisMensuels}
              campagnes={campagnes}
              cotisationsRapport={cotisationsDetail}
              membresRapport={membresDetail}
            />
          )}
        </>
      )}
    </div>
  );
}