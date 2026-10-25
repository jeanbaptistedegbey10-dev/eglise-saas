import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  Coins,
  HandCoins,
  HeartHandshake,
  History,
  Inbox,
  Mail,
  ShieldCheck,
  TrendingDown,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { TeinteCarte } from "@/components/dashboard/CarteMetier";
import { formatMontant } from "@/lib/finance";
import { normaliserRole } from "@/lib/permissions";
import type { RoleUtilisateurValeur } from "@/lib/utilisateur";

// ---------------------------------------------------------------------------
// Grille de cartes métier du dashboard, filtrée par `session.user.role` :
// - ADMINISTRATEUR / PASTEUR : Membres, Cultes, Finances, Administration,
//   Patrimoine, Solidarité.
// - TRESORIER : Cotisations, Caisses, Dépenses, Rapports Financiers.
// - SECRETARIAT : Membres, Cultes, Réceptions, Courriers / Notes.
// - MEMBRE_CONSULTATION : Fiche Personnelle, Historique Cotisations,
//   Demandes d'Aide.
// ---------------------------------------------------------------------------

/** Compteurs transmis par la page serveur du dashboard. */
export type MetriquesDashboard = {
  nombreMembres: number;
  nombreCultesAVenir: number;
  totalEncaisse: number;
  totalDecaisse: number;
  cotisationsDuMois: number;
  soldeCaisses: number;
  /** Comptes utilisateurs (module Administration). */
  nombreComptes: number;
  /** Biens inventoriés (module Patrimoine). */
  nombreBiens: number;
  /** Aides distribuées (module Solidarité). */
  nombreAides: number;
  /** Nouvelles fiches membres créées depuis le début du mois (Réceptions). */
  nouvellesFichesMois: number;
  /** Groupes + départements suivis (Courriers / Notes — secrétariat). */
  nombreGroupesDepartements: number;
  /** Fiche membre rattachée au compte connecté (rôle MEMBRE_CONSULTATION). */
  ficheMembreSession: {
    trouve: boolean;
    nombreVersements: number;
    nombreAidesRecues: number;
  } | null;
};

/** Descriptif d'une carte prêt au rendu par `<CarteMetier />`. */
export type CarteMetierDescriptor = {
  id: string;
  libelle: string;
  icone: LucideIcon;
  teinte: TeinteCarte;
  compteur: string;
  legende: string;
  href?: string;
};

/** Identifiants de cartes affichées pour chaque rôle de l'application. */
export const CARTES_PAR_ROLE: Record<RoleUtilisateurValeur, readonly string[]> = {
  ADMINISTRATEUR: [
    "membres",
    "cultes",
    "finances",
    "administration",
    "patrimoine",
    "solidarite",
  ],
  PASTEUR: ["membres", "cultes", "finances", "administration", "patrimoine", "solidarite"],
  TRESORIER: ["cotisations", "caisses", "depenses", "rapports-financiers"],
  SECRETARIAT: ["membres", "cultes", "receptions", "courriers-notes"],
  MEMBRE_CONSULTATION: ["fiche-personnelle", "historique-cotisations", "demandes-aide"],
};

/** Rôle effectif pour le dashboard — repli MEMBRE_CONSULTATION si inconnu. */
export function roleDashboard(role: string | null | undefined): RoleUtilisateurValeur {
  return normaliserRole(role) ?? "MEMBRE_CONSULTATION";
}


/**
 * Construit la liste complète des cartes métier (catalogue), puis ne garde
 * que celles autorisées pour le rôle connecté — affichage dynamique
 * « Afficher / Masquer » selon `session.user.role`.
 */
export function construireCartesMetier(
  role: string | null | undefined,
  metriques: MetriquesDashboard,
): CarteMetierDescriptor[] {
  const catalogue: Record<string, CarteMetierDescriptor> = {
    membres: {
      id: "membres",
      libelle: "Membres",
      icone: Users,
      teinte: "green",
      compteur: String(metriques.nombreMembres),
      legende: "membres enregistrés",
      href: "/membres",
    },
    cultes: {
      id: "cultes",
      libelle: "Cultes",
      icone: CalendarDays,
      teinte: "orange",
      compteur: String(metriques.nombreCultesAVenir),
      legende: "cultes planifiés à venir",
      href: "/cultes",
    },
    finances: {
      id: "finances",
      libelle: "Finances",
      icone: Wallet,
      teinte: "emerald",
      compteur: `${formatMontant(metriques.totalEncaisse)} FCFA`,
      legende: `encaissé sur l'exercice · décaissé ${formatMontant(metriques.totalDecaisse)} FCFA`,
      href: "/finances",
    },
    administration: {
      id: "administration",
      libelle: "Administration",
      icone: ShieldCheck,
      teinte: "violet",
      compteur: String(metriques.nombreComptes),
      legende: "comptes & accès à gérer",
      href: "/administration/utilisateurs",
    },
    patrimoine: {
      id: "patrimoine",
      libelle: "Patrimoine",
      icone: Building2,
      teinte: "amber",
      compteur: String(metriques.nombreBiens),
      legende: "biens inventoriés",
      href: "/patrimoine",
    },
    solidarite: {
      id: "solidarite",
      libelle: "Solidarité",
      icone: HeartHandshake,
      teinte: "rose",
      compteur: String(metriques.nombreAides),
      legende: "aides distribuées",
      href: "/solidarite",
    },
    cotisations: {
      id: "cotisations",
      libelle: "Cotisations",
      icone: HandCoins,
      teinte: "emerald",
      compteur: `${formatMontant(metriques.cotisationsDuMois)} FCFA`,
      legende: "encaissé ce mois-ci",
      href: "/finances/cotisations?tab=versements",
    },
    caisses: {
      id: "caisses",
      libelle: "Caisses",
      icone: Coins,
      teinte: "teal",
      compteur: `${formatMontant(metriques.soldeCaisses)} FCFA`,
      legende: "solde total des caisses",
      href: "/finances/caisses",
    },
    depenses: {
      id: "depenses",
      libelle: "Dépenses",
      icone: TrendingDown,
      teinte: "orange",
      compteur: `${formatMontant(metriques.totalDecaisse)} FCFA`,
      legende: "décaissé sur l'exercice",
      href: "/finances/depenses",
    },
    "rapports-financiers": {
      id: "rapports-financiers",
      libelle: "Rapports Financiers",
      icone: ClipboardCheck,
      teinte: "blue",
      compteur: `${formatMontant(metriques.totalEncaisse - metriques.totalDecaisse)} FCFA`,
      legende: "solde de l'exercice en cours",
      href: "/rapports",
    },
    receptions: {
      id: "receptions",
      libelle: "Réceptions",
      icone: Inbox,
      teinte: "blue",
      compteur: String(metriques.nouvellesFichesMois),
      legende: "nouvelles fiches reçues ce mois-ci",
      href: "/membres",
    },
    "courriers-notes": {
      id: "courriers-notes",
      libelle: "Courriers / Notes",
      icone: Mail,
      teinte: "slate",
      compteur: String(metriques.nombreGroupesDepartements),
      legende: "groupes & départements suivis",
      href: "/organisation",
    },
    "fiche-personnelle": {
      id: "fiche-personnelle",
      libelle: "Fiche Personnelle",
      icone: UserRound,
      teinte: "indigo",
      compteur: metriques.ficheMembreSession?.trouve ? "1" : "0",
      legende: metriques.ficheMembreSession?.trouve
        ? "fiche membre rattachée à votre compte"
        : "aucune fiche rattachée (contactez le secrétariat)",
    },
    "historique-cotisations": {
      id: "historique-cotisations",
      libelle: "Historique Cotisations",
      icone: History,
      teinte: "emerald",
      compteur: String(metriques.ficheMembreSession?.nombreVersements ?? 0),
      legende: "versements de cotisation enregistrés",
    },
    "demandes-aide": {
      id: "demandes-aide",
      libelle: "Demandes d'Aide",
      icone: HeartHandshake,
      teinte: "rose",
      compteur: String(metriques.ficheMembreSession?.nombreAidesRecues ?? 0),
      legende: "aides & solidarité reçues",
    },
  };

  return CARTES_PAR_ROLE[roleDashboard(role)]
    .map((identifiant) => catalogue[identifiant])
    .filter((carte): carte is CarteMetierDescriptor => Boolean(carte));
}
