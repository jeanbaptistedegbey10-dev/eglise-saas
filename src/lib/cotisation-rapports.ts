// ---------------------------------------------------------------------------
// Rapports & bilans du module Cotisations — calculs synchrones
//
// Les pages assemblent des objets plats (`CotisationRapport`, `MembreRapport`)
// à partir de Prisma ; ces fonctions produisent les vues de l'onglet
// « Rapports & bilans » sans aucun accès à la base.
// ---------------------------------------------------------------------------

import type { CibleCotisation, FrequenceCotisation, TypeCotisation } from "@/generated/prisma/client";

import { libelleCible, periodesParMois, selectionnerBareme, type BaremeMinimal } from "@/lib/cotisation";
import { libelleModePaiement } from "@/lib/membre";
import { moisCourantExercice, moisExercice } from "@/lib/mois";
import { arrondir2, progressionCible } from "@/lib/versement-cotisation";
import type {
  BilanExercice,
  ClasseRapport,
  DetailVersementCampagne,
  EtatMembreMensuel,
  LigneMensuelleRapport,
  RapportCampagne,
} from "@/types/cotisation";

/** Membre considéré dans les rapports (classe d'âge déjà déterminée). */
export type MembreRapport = {
  membreId: string;
  cible: CibleCotisation;
  /** Nom affiché (« Nom Prénoms ») pour le registre nominatif. */
  label?: string;
};

/** Versement lu pour les rapports. */
export type VersementRapport = {
  id?: string;
  /** Null pour un don anonyme sans souscripteur identifié. */
  membreId: string | null;
  /** Mois acquittés (clés normalisées) — cotisations récurrentes. */
  moisCoches: string[];
  /** Montant total remis. */
  montant: number;
  /** Part obligatoire. */
  montantBase: number;
  /** Don additionnel. */
  surplus: number;
  estAnonyme: boolean;
  /** Date effective ISO (AAAA-MM-JJ) — registre nominatif. */
  dateEffective?: string | null;
  /** Mode de paiement brut (enum Prisma) — registre nominatif. */
  modePaiement?: string | null;
};

/** Cotisation lue pour les rapports. */
export type CotisationRapport = {
  id: string;
  nom: string;
  type: TypeCotisation;
  frequence: FrequenceCotisation;
  estCloture: boolean;
  montantPlancher: number | null;
  montantCible: number | null;
  baremes: BaremeMinimal[];
  versements: VersementRapport[];
};

/**
 * Attendu mensuel d'un membre sur une cotisation récurrente : le barème de sa
 * classe exprimé « par période » est ramené au mois (1 pour le mensuel,
 * ≈4.33 pour l'hebdomadaire).
 */
function attenduMensuel(cotisation: CotisationRapport, cible: CibleCotisation): number {
  const bareme = selectionnerBareme(cotisation.baremes, cible);
  if (!bareme) return 0;
  return arrondir2(Number(bareme.montant) * periodesParMois(cotisation.frequence));
}

/** Part mensuelle d'un versement réparti sur plusieurs mois. */
function partMensuelleVersement(versement: VersementRapport): number {
  if (versement.moisCoches.length === 0) return 0;
  return arrondir2(versement.montantBase / versement.moisCoches.length);
}

/**
 * Vue mensuelle ventilée par classe (Adultes / Jeunes / Enfants) avec les
 * retards du mois, sur toute la période de l'exercice.
 */
export function construireVentilationMensuelle(
  recurrentes: CotisationRapport[],
  membres: MembreRapport[],
  moisDebut: number,
  moisFin: number,
): LigneMensuelleRapport[] {
  if (recurrentes.length === 0) return [];

  const mois = moisExercice(moisDebut, moisFin);
  const moisCourant = moisCourantExercice(moisDebut, moisFin);

  return mois.map(({ cle, libelle }) => {
    const classes = new Map<CibleCotisation, ClasseRapport>();
    let attenduTotal = 0;
    let encaisseTotal = 0;
    let retardsTotaux = 0;

    for (const membre of membres) {
      let attenduMembre = 0;
      for (const cotisation of recurrentes) {
        attenduMembre += attenduMensuel(cotisation, membre.cible);
      }
      attenduMembre = arrondir2(attenduMembre);

      // Encaissé du membre sur le mois (part du versement couvrant ce mois).
      let encaisseMembre = 0;
      for (const cotisation of recurrentes) {
        for (const versement of cotisation.versements) {
          if (versement.membreId !== membre.membreId) continue;
          if (!versement.moisCoches.includes(cle)) continue;
          encaisseMembre += partMensuelleVersement(versement);
        }
      }
      encaisseMembre = arrondir2(encaisseMembre);

      // Un membre est « en retard » s'il reste une part non couverte ce mois.
      const enRetard = attenduMembre > 0 && encaisseMembre + 0.5 < attenduMembre;

      const classe = classes.get(membre.cible) ?? {
        cible: membre.cible,
        nombreMembres: 0,
        attendu: 0,
        encaisse: 0,
        retards: 0,
        taux: null,
      };
      classe.nombreMembres += 1;
      classe.attendu = arrondir2(classe.attendu + attenduMembre);
      classe.encaisse = arrondir2(classe.encaisse + encaisseMembre);
      if (enRetard) classe.retards += 1;
      classes.set(membre.cible, classe);

      attenduTotal = arrondir2(attenduTotal + attenduMembre);
      encaisseTotal = arrondir2(encaisseTotal + encaisseMembre);
      if (enRetard) retardsTotaux += 1;
    }

    const ventilation = Array.from(classes.values())
      .map((classe) => ({
        ...classe,
        taux: classe.attendu > 0 ? classe.encaisse / classe.attendu : null,
      }))
      .sort((a, b) => a.cible.localeCompare(b.cible));

    return {
      moisCle: cle,
      libelle,
      estCourant: cle === moisCourant,
      attendu: attenduTotal,
      encaisse: encaisseTotal,
      taux: attenduTotal > 0 ? encaisseTotal / attenduTotal : null,
      retards: retardsTotaux,
      classes: ventilation,
    };
  });
}

/**
 * Bilan annuel de l'exercice : attendu / encaissé des récurrentes, totaux des
 * campagnes ponctuelles et anonymes, surplus et contributeurs distincts.
 */
export function construireBilanExercice(params: {
  recurrentes: CotisationRapport[];
  ponctuelles: CotisationRapport[];
  anonymes: CotisationRapport[];
  membres: MembreRapport[];
  /** Nombre de mois couverts par l'exercice. */
  nombreMois: number;
  /** Dons anonymes sans souscripteur identifié (comptés à part). */
  nombreDonsSansMembre: number;
}): BilanExercice {
  const { recurrentes, ponctuelles, anonymes, membres, nombreMois } = params;

  // Attendu annuel des récurrentes : barème × périodes/mois × mois d'exercice.
  let attenduRecurrence = 0;
  for (const cotisation of recurrentes) {
    for (const membre of membres) {
      const bareme = selectionnerBareme(cotisation.baremes, membre.cible);
      if (!bareme) continue;
      const periodes = periodesParMois(cotisation.frequence) * nombreMois;
      attenduRecurrence = arrondir2(
        attenduRecurrence + Number(bareme.montant) * periodes,
      );
    }
  }

  let encaisseRecurrence = 0;
  let totalPonctuelles = 0;
  let totalSurplus = 0;
  let totalAnonymes = 0;
  let totalGeneral = 0;
  let nombreVersements = 0;
  const contributeurs = new Set<string>();

  const cumuler = (cotisation: CotisationRapport) => {
    for (const versement of cotisation.versements) {
      nombreVersements += 1;
      totalGeneral = arrondir2(totalGeneral + versement.montant);
      totalSurplus = arrondir2(totalSurplus + versement.surplus);
      if (versement.membreId) contributeurs.add(versement.membreId);
      if (cotisation.type === "RECURRENTE_CLASSE") {
        encaisseRecurrence = arrondir2(encaisseRecurrence + versement.montantBase);
      } else if (cotisation.type === "PONCTUELLE_EVENEMENT") {
        totalPonctuelles = arrondir2(totalPonctuelles + versement.montant);
      } else {
        totalAnonymes = arrondir2(totalAnonymes + versement.montant);
      }
    }
  };

  for (const cotisation of recurrentes) cumuler(cotisation);
  for (const cotisation of ponctuelles) cumuler(cotisation);
  for (const cotisation of anonymes) cumuler(cotisation);

  return {
    attenduRecurrence,
    encaisseRecurrence,
    tauxRecouvrement:
      attenduRecurrence > 0 ? Math.min(1, encaisseRecurrence / attenduRecurrence) : 0,
    totalPonctuelles,
    totalSurplus,
    totalAnonymes,
    totalGeneral,
    nombreVersements,
    nombreContributeurs: contributeurs.size + params.nombreDonsSansMembre,
  };
}

/** Bilans des cotisations ponctuelles et anonymes (cartes de l'onglet 3). */
export function construireRapportsCampagnes(
  cotisations: CotisationRapport[],
  datesParCotisation: Record<string, { debut: string | null; fin: string | null }>,
): RapportCampagne[] {
  return cotisations
    .filter((cotisation) => cotisation.type !== "RECURRENTE_CLASSE")
    .map((cotisation) => {
      let totalRecolte = 0;
      let surplusTotal = 0;
      const participants = new Set<string>();

      for (const versement of cotisation.versements) {
        totalRecolte = arrondir2(totalRecolte + versement.montant);
        surplusTotal = arrondir2(surplusTotal + versement.surplus);
        if (versement.membreId) participants.add(versement.membreId);
      }

      const dates = datesParCotisation[cotisation.id] ?? { debut: null, fin: null };

      return {
        cotisationId: cotisation.id,
        nom: cotisation.nom,
        type: cotisation.type,
        estCloture: cotisation.estCloture,
        dateDebut: dates.debut,
        dateFin: dates.fin,
        montantPlancher: cotisation.montantPlancher,
        montantCible: cotisation.montantCible,
        totalRecolte,
        surplusTotal,
        nombreVersements: cotisation.versements.length,
        nombreParticipants: participants.size,
        progression: progressionCible(totalRecolte, cotisation.montantCible),
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

// ---------------------------------------------------------------------------
// Quotas / objectifs des campagnes (ponctuelles & anonymes)
// ---------------------------------------------------------------------------

/** État d'atteinte du quota d'une campagne. */
export type QuotaCampagne = {
  /** Objectif monétaire (montantCible, sinon plancher × membres), null si libre. */
  objectif: number | null;
  /** Taux d'atteinte en %, non plafonné (peut dépasser 100). */
  tauxAtteinte: number | null;
  /** Solde restant pour atteindre l'objectif (≥ 0), null si libre. */
  soldeRestant: number | null;
  /** Progression plafonnée à 1 — barre visuelle. */
  progression: number;
  /** Vrai si la date limite de la campagne est passée. */
  echeanceDepassee: boolean;
  /** État synthétique pour le badge d'état. */
  etat: "atteint" | "non-atteint-terminee" | "en-cours" | "sans-objectif";
};

/** Date du jour au format ISO local (AAAA-MM-JJ) — comparable aux dates de campagne. */
export function dateISOLocale(date: Date = new Date()): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

/**
 * Évalue le quota d'une campagne :
 * • objectif = `montantCible`, sinon `montantPlancher` × nombre de membres ;
 * • taux d'atteinte = total récolté / objectif (non plafonné) ;
 * • solde restant = max(0, objectif − récolté) ;
 * • état terminal si échéance dépassée ou campagne clôturée.
 */
export function evaluerQuotaCampagne(params: {
  totalRecolte: number;
  montantCible: number | null;
  montantPlancher: number | null;
  /** Nombre de membres sur qui la part obligatoire est appelée. */
  nombreMembres: number;
  dateFin: string | null;
  estCloture: boolean;
}): QuotaCampagne {
  const { totalRecolte, montantCible, montantPlancher, nombreMembres, dateFin, estCloture } = params;

  const cible = montantCible != null && montantCible > 0 ? arrondir2(montantCible) : null;
  const plancher =
    montantPlancher != null && montantPlancher > 0 ? arrondir2(montantPlancher) : null;
  const objectif =
    cible ?? (plancher !== null && nombreMembres > 0 ? arrondir2(plancher * nombreMembres) : null);

  const echeanceDepassee = dateFin !== null && dateFin < dateISOLocale();
  const total = arrondir2(Math.max(0, totalRecolte));

  if (objectif === null) {
    return {
      objectif: null,
      tauxAtteinte: null,
      soldeRestant: null,
      progression: 0,
      echeanceDepassee,
      etat: "sans-objectif",
    };
  }

  const tauxAtteinte = Math.round((total / objectif) * 1000) / 10;
  const soldeRestant = Math.max(0, arrondir2(objectif - total));

  let etat: QuotaCampagne["etat"];
  if (total >= objectif) etat = "atteint";
  else if (estCloture || echeanceDepassee) etat = "non-atteint-terminee";
  else etat = "en-cours";

  return {
    objectif,
    tauxAtteinte,
    soldeRestant,
    progression: Math.min(1, total / objectif),
    echeanceDepassee,
    etat,
  };
}

/**
 * Registre nominatif d'une campagne ponctuelle / anonyme : chaque versement
 * devient une ligne (date, contributeur, classe, part obligatoire, surplus,
 * total, mode de paiement) triée par date puis nom, avec totaux en bas.
 */
export function construireDetailCampagne(
  cotisation: CotisationRapport,
  membresParId: Map<string, { label: string; cible: CibleCotisation }>,
): DetailVersementCampagne[] {
  const lignes: DetailVersementCampagne[] = cotisation.versements.map((versement, index) => {
    const membre = versement.membreId ? membresParId.get(versement.membreId) : undefined;
    const estAnonyme = versement.estAnonyme || !versement.membreId || !membre;
    return {
      id: versement.id ?? `${cotisation.id}-versement-${index}`,
      dateEffective: versement.dateEffective ?? null,
      contributeur: estAnonyme ? "Don anonyme" : (membre?.label ?? "Membre inconnu"),
      classe: estAnonyme ? "—" : libelleCible(membre?.cible ?? "TOUS"),
      montantBase: versement.montantBase,
      surplus: versement.surplus,
      montantTotal: versement.montant,
      modePaiement: versement.modePaiement ? libelleModePaiement(versement.modePaiement) : "—",
    };
  });

  return lignes.sort((a, b) => {
    if (a.dateEffective && b.dateEffective && a.dateEffective !== b.dateEffective) {
      return a.dateEffective.localeCompare(b.dateEffective);
    }
    if (a.dateEffective && !b.dateEffective) return -1;
    if (!a.dateEffective && b.dateEffective) return 1;
    return a.contributeur.localeCompare(b.contributeur, "fr");
  });
}

/**
 * État nominatif des membres pour un mois récurrent : pastille verte
 * « À jour (mois réglé le JJ/MM) » ou rouge « En retard », avec le montant
 * versé pour le mois.
 */
export function construireEtatMembresMensuel(
  recurrentes: CotisationRapport[],
  membres: MembreRapport[],
  moisCle: string,
): EtatMembreMensuel[] {
  return membres.map((membre) => {
    let montantVerse = 0;
    let dateReglement: string | null = null;

    for (const cotisation of recurrentes) {
      for (const versement of cotisation.versements) {
        if (versement.membreId !== membre.membreId) continue;
        if (!versement.moisCoches.includes(moisCle)) continue;
        montantVerse = arrondir2(montantVerse + partMensuelleVersement(versement));
        const date = versement.dateEffective ?? null;
        if (date && (!dateReglement || date < dateReglement)) dateReglement = date;
      }
    }

    return {
      membreId: membre.membreId,
      label: membre.label ?? membre.membreId,
      classe: libelleCible(membre.cible),
      aJour: montantVerse > 0,
      montantVerse,
      dateReglement,
    };
  });
}
