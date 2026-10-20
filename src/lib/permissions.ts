/**
 * Matrice des autorisations par rôle (RBAC) — edge-safe (sans Prisma, sans Node).
 *
 * Rôles Prisma (`RoleUtilisateur`) :
 * - ADMINISTRATEUR (= ADMIN : accès total)
 * - TRESORIER : Finances, Rapports, Dashboard (+ lecture seule Membres/Patrimoine,
 *   AUCUN accès à /administration/utilisateurs ni /parametres)
 * - PASTEUR : Communauté, Cultes, Solidarité, Dashboard
 * - SECRETARIAT : Membres, Organisation, Cultes, Dashboard
 * - MEMBRE_CONSULTATION (= MEMBRE : consultation restreinte / relevés uniquement)
 *
 * Utilisé par :
 * - `src/components/layout/Sidebar.tsx` (filtrage des liens via `session.user.role`)
 * - `src/lib/auth.config.ts` (blocage middleware + redirection vers /dashboard)
 */

import type { RoleUtilisateurValeur } from "@/lib/utilisateur";
import { ROLES_UTILISATEUR } from "@/lib/utilisateur";

/** Alias court demandé par le cahier des charges → valeur Prisma réelle. */
const ALIAS_VERS_ROLE: Record<string, RoleUtilisateurValeur> = {
  ADMIN: "ADMINISTRATEUR",
  ADMINISTRATEUR: "ADMINISTRATEUR",
  TRESORIER: "TRESORIER",
  PASTEUR: "PASTEUR",
  SECRETARIAT: "SECRETARIAT",
  MEMBRE: "MEMBRE_CONSULTATION",
  MEMBRE_CONSULTATION: "MEMBRE_CONSULTATION",
};

/** Normalise un rôle (alias court ou valeur Prisma) vers la valeur Prisma.
 * Totalement permissive face aux variations de casse :
 * tout est converti en majuscules sans accents : "ADMINISTRATEUR", "ADMIN",
 * "TRESORIER", "PASTEUR", "SECRETARIAT", "MEMBRE".
 * Gère "Administrateur", "administrateur", "admin", "Trésorier", "tresorier",
 * espaces superflus, traits d'union et accents éventuels.
 */
export function normaliserRole(role: string | null | undefined): RoleUtilisateurValeur | null {
  if (!role) return null;
  // Supprime accents, espaces superflus, puis passe en majuscules :
  // " Administrateur " -> "ADMINISTRATEUR", "admin" -> "ADMIN".
  const cle = role
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  // Alias courts prioritaires (ADMIN -> ADMINISTRATEUR, MEMBRE -> MEMBRE_CONSULTATION).
  const normalise = ALIAS_VERS_ROLE[cle];
  if (normalise) return normalise;
  return (ROLES_UTILISATEUR as readonly string[]).includes(cle)
    ? (cle as RoleUtilisateurValeur)
    : null;
}

/** Préfixe de route (sans query) pour les contrôles d'accès. */
function baseChemin(pathname: string): string {
  const sansQuery = pathname.split("?")[0] ?? pathname;
  return sansQuery || "/";
}

/** Vrai si le chemin commence par l'un des préfixes listés. */
function correspondPrefixes(pathname: string, prefixes: readonly string[]): boolean {
  const base = baseChemin(pathname);
  return prefixes.some((p) => base === p || base.startsWith(`${p}/`));
}

/**
 * Préfixes autorisés par rôle (hors ADMIN qui a accès total).
 * - TRESORIER : /dashboard, /finances, /rapports + lecture seule /membres, /patrimoine, /releve
 * - PASTEUR : /dashboard, /membres, /organisation, /communaute, /cultes, /solidarite, /releve
 * - SECRETARIAT : /dashboard, /membres, /organisation, /communaute, /cultes, /releve
 * - MEMBRE : /dashboard (consultation) + /releve uniquement
 */
const ROUTES_PAR_ROLE: Record<Exclude<RoleUtilisateurValeur, "ADMINISTRATEUR">, readonly string[]> = {
  TRESORIER: ["/dashboard", "/finances", "/rapports", "/membres", "/patrimoine", "/releve"],
  PASTEUR: [
    "/dashboard",
    "/membres",
    "/communaute",
    "/organisation",
    "/cultes",
    "/solidarite",
    "/releve",
  ],
  SECRETARIAT: [
    "/dashboard",
    "/membres",
    "/communaute",
    "/organisation",
    "/cultes",
    "/releve",
  ],
  MEMBRE_CONSULTATION: ["/dashboard", "/releve"],
};

/** Routes explicitement interdites même si un préfixe large les couvrirait. */
const INTERDITS_PAR_ROLE: Record<RoleUtilisateurValeur, readonly string[]> = {
  ADMINISTRATEUR: [],
  TRESORIER: ["/administration/utilisateurs", "/administration", "/parametres"],
  PASTEUR: ["/administration", "/parametres", "/finances", "/rapports", "/patrimoine"],
  SECRETARIAT: [
    "/administration",
    "/parametres",
    "/finances",
    "/rapports",
    "/patrimoine",
    "/solidarite",
  ],
  MEMBRE_CONSULTATION: [
    "/administration",
    "/parametres",
    "/finances",
    "/rapports",
    "/patrimoine",
    "/organisation",
    "/communaute",
    "/membres",
    "/cultes",
    "/solidarite",
  ],
};

/**
 * Indique si un rôle peut accéder à un chemin applicatif.
 * - Rôle inconnu → false (refus par défaut).
 * - ADMINISTRATEUR → true (accès total).
 * - Correspondance par préfixe : si l'URL commence par un chemin autorisé
 *   (ex: `/finances/cotisations` commence par `/finances`), l'accès renvoie TRUE.
 * - TRESORIER : autorise explicitement toutes les sous-routes de `/finances`
 *   (`/finances/*`), `/rapports` (`/rapports/*`), et `/dashboard`.
 */
export function aAccesAuChemin(
  roleBrut: string | null | undefined,
  pathname: string,
): boolean {
  const role = normaliserRole(roleBrut);
  if (!role) return false;
  if (role === "ADMINISTRATEUR") return true;
  const base = baseChemin(pathname);
  // Toujours autoriser la racine (elle redirige) — le middleware gère /login.
  if (base === "/") return true;
  // Anti-boucle ERR_TOO_MANY_REDIRECTS : /dashboard est le refuge du middleware.
  // Il doit être systématiquement autorisé pour TOUS les rôles authentifiés
  // (ADMINISTRATEUR, TRESORIER, PASTEUR, SECRETARIAT, MEMBRE_CONSULTATION).
  if (base === "/dashboard" || base.startsWith("/dashboard/")) return true;
  // TRESORIER : autorisation explicite de /finances/*, /rapports/* et /dashboard.
  // `correspondPrefixes` garantit la sémantique préfixe : toute URL qui commence
  // par un chemin autorisé (ex: `/finances/cotisations` commence par `/finances`)
  // renvoie TRUE.
  if (role === "TRESORIER") {
    if (
      base === "/finances" ||
      base.startsWith("/finances/") ||
      base === "/rapports" ||
      base.startsWith("/rapports/")
    ) {
      return true;
    }
  }
  if (correspondPrefixes(base, INTERDITS_PAR_ROLE[role])) return false;
  return correspondPrefixes(base, ROUTES_PAR_ROLE[role]);
}

/** Vrai si le rôle n'a qu'un droit de lecture sur le module (pas de saisie). */
export function estLectureSeule(
  roleBrut: string | null | undefined,
  module: "membres" | "patrimoine" | "dashboard",
): boolean {
  const role = normaliserRole(roleBrut);
  if (!role) return true;
  if (role === "ADMINISTRATEUR") return false;
  if (role === "TRESORIER" && (module === "membres" || module === "patrimoine")) return true;
  if (role === "MEMBRE_CONSULTATION") return true;
  return false;
}

/** Droits synthétiques par rôle (affichage / documentation). */
export const DROITS_PAR_ROLE: Record<RoleUtilisateurValeur, string[]> = {
  ADMINISTRATEUR: ["Accès total à tous les modules et paramètres."],
  TRESORIER: [
    "Finances, Rapports, Dashboard.",
    "Lecture seule sur Membres et Patrimoine.",
    "Aucun accès à /administration/utilisateurs ni /parametres.",
  ],
  PASTEUR: ["Communauté, Cultes, Solidarité, Dashboard."],
  SECRETARIAT: ["Membres, Organisation, Cultes, Dashboard."],
  MEMBRE_CONSULTATION: ["Consultation restreinte / Relevés uniquement."],
};
