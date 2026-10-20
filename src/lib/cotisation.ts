import type {
  BaremeCotisation,
  CibleCotisation,
  FrequenceCotisation,
  TypeCotisation,
} from "@/generated/prisma/client";

// Re-export du formatateur de montants, utilisé dans tout l'espace cotisations.
export { formatMontant } from "@/lib/membre";

// ---------------------------------------------------------------------------
// Énumérations — libellés & sélecteurs
// ---------------------------------------------------------------------------

/**
 * Les natures de cotisation du module Finances, telles qu'affichées dans le
 * sélecteur du formulaire de création / modification :
 *  • RECURRENTE_CLASSE    — cotisation récurrente par classe (barème mensuel/hebdo),
 *  • PONCTUELLE_EVENEMENT — cotisation ponctuelle / aide ciblée (barème par classe
 *                           servant de plancher obligatoire, surplus possible),
 *  • ANONYME_PROJET       — travaux & projets (montant libre, cible globale),
 *  • QUETE_CULTE          — quête de culte & offrandes libres (sans barème imposé).
 */
export const TYPES_COTISATION: {
  value: TypeCotisation;
  label: string;
  resume: string;
}[] = [
  {
    value: "RECURRENTE_CLASSE",
    label: "Cotisation récurrente par classe (mensuelle / hebdo)",
    resume: "Mensuelle ou hebdomadaire, grille tarifaire Adultes / Jeunes / Enfants.",
  },
  {
    value: "PONCTUELLE_EVENEMENT",
    label: "Cotisation ponctuelle / Aide ciblée (avec barème & surplus)",
    resume:
      "Montant plancher obligatoire par classe (ex. Adulte 5 000), surplus volontaire possible.",
  },
  {
    value: "ANONYME_PROJET",
    label: "Travaux & Projets (loyer, réfection temple, instruments)",
    resume: "Loyer, instruments, travaux — montant libre ou cible globale.",
  },
  {
    value: "QUETE_CULTE",
    label: "Quête de culte & Offrandes libres",
    resume: "Sans barème imposé — saisie libre du montant collecté lors du culte.",
  },
];

/** Traduit la nature d'une cotisation (enum Prisma) en libellé lisible. */
export function libelleTypeCotisation(type: TypeCotisation | string): string {
  return TYPES_COTISATION.find((item) => item.value === type)?.label ?? String(type);
}

/**
 * Natures reposant sur une grille de barèmes par classe (le montant saisi par
 * classe est le dû / plancher). Concerne la récurrente et la ponctuelle.
 */
export const TYPES_AVEC_BAREME: TypeCotisation[] = [
  "RECURRENTE_CLASSE",
  "PONCTUELLE_EVENEMENT",
];

/** Vrai si la nature impose une grille tarifaire par classe. */
export function typeAvecBarème(type: TypeCotisation | string): boolean {
  return TYPES_AVEC_BAREME.includes(type as TypeCotisation);
}

/**
 * Natures à montant libre (aucun barème imposé) : travaux/projets et quêtes de
 * culte. Le montant collecté est saisi directement lors du versement.
 */
export const TYPES_MONTANT_LIBRE: TypeCotisation[] = ["ANONYME_PROJET", "QUETE_CULTE"];

/** Vrai si la nature autorise une saisie libre du montant (sans barème imposé). */
export function typeMontantLibre(type: TypeCotisation | string): boolean {
  return TYPES_MONTANT_LIBRE.includes(type as TypeCotisation);
}

/** Fréquences proposées pour une cotisation récurrente (mensuelle / hebdo). */
export const FREQUENCES_RECURRENTES: { value: FrequenceCotisation; label: string }[] = [
  { value: "MENSUEL", label: "Mensuelle" },
  { value: "HEBDOMADAIRE", label: "Hebdomadaire" },
];

/** Classes d'âge de la grille tarifaire d'une cotisation récurrente. */
export const CIBLES_CLASSE: CibleCotisation[] = ["ADULTE", "JEUNE", "ENFANT"];

/** Classes de sexe pour la grille tarifaire lorsqu'on utilise le mode par sexe (Hommes / Femmes). */
export const CIBLES_SEXE: CibleCotisation[] = ["HOMME", "FEMME"];

/** Fréquences proposées dans le sélecteur du formulaire de création. */
export const FREQUENCES_COTISATION: { value: FrequenceCotisation; label: string }[] = [
  { value: "HEBDOMADAIRE", label: "Hebdomadaire" },
  { value: "MENSUEL", label: "Mensuelle" },
  { value: "TRIMESTRIEL", label: "Trimestrielle" },
  { value: "ANNUEL", label: "Annuelle" },
  { value: "PONCTUEL", label: "Ponctuelle" },
];

/** Libellé français d'une fréquence. */
export function libelleFrequence(frequence: FrequenceCotisation | string): string {
  return (
    FREQUENCES_COTISATION.find((f) => f.value === frequence)?.label ?? String(frequence)
  );
}

/** Libellés français des cibles de barème. */
export const LIBELLES_CIBLE: Record<CibleCotisation, string> = {
  TOUS: "Tous les membres",
  ADULTE: "Adultes",
  JEUNE: "Jeunes",
  ENFANT: "Enfants",
  HOMME: "Hommes",
  FEMME: "Femmes",
};

/** Traduit une cible (enum Prisma) en libellé lisible. */
export function libelleCible(cible: CibleCotisation | string): string {
  return LIBELLES_CIBLE[cible as CibleCotisation] ?? String(cible);
}

// ---------------------------------------------------------------------------
// Logique métier — période, barème applicable, attendu
// ---------------------------------------------------------------------------

/**
 * Nombre de périodes de recouvrement dans une année pour une fréquence donnée.
 * Sert à projeter le montant périodique d'un barème en attendu annuel.
 * Ex. : 1000 FCFA/mois → 12 périodes → 12 000 FCFA/an.
 */
export function periodesParAn(frequence: FrequenceCotisation): number {
  switch (frequence) {
    case "HEBDOMADAIRE":
      return 52;
    case "MENSUEL":
      return 12;
    case "TRIMESTRIEL":
      return 4;
    case "ANNUEL":
      return 1;
    case "PONCTUEL":
      return 1;
    default:
      return 1;
  }
}

/**
 * Nombre de périodes de recouvrement ramené à un mois (ex. hebdomadaire →
 * 52 / 12 ≈ 4.33 semaines). Sert à convertir un barème « par période » en
 * attendu mensuel, pour les grilles et les rapports.
 */
export function periodesParMois(frequence: FrequenceCotisation): number {
  return periodesParAn(frequence) / 12;
}

/** Intitulé de la période de recouvrement (pour l'affichage). */
export function libellePeriode(frequence: FrequenceCotisation): string {
  switch (frequence) {
    case "HEBDOMADAIRE":
      return "semaine";
    case "MENSUEL":
      return "mois";
    case "TRIMESTRIEL":
      return "trimestre";
    case "ANNUEL":
      return "an";
    case "PONCTUEL":
      return "versement";
    default:
      return "période";
  }
}

/** Données de profil nécessaires pour déterminer la cible d'un membre. */
export type ProfilMembre = {
  classificationSociale?: string | null;
  sexe?: string | null;
  typePersonne?: string | null;
};

/**
 * Détermine la cible de barème applicable à un membre.
 *
 * Priorité métier :
 *  1. La classification sociale d'âge (Adulte / Jeune / Enfant) si elle est
 *     renseignée — c'est la ventilation demandée pour les rapports.
 *  2. À défaut, le sexe (Homme / Femme).
 *  3. À défaut, la cible générique « TOUS ».
 */
export function determinerCible(profil: ProfilMembre): CibleCotisation {
  // 1. Priorité absolue : champ « Type de personne » du membre (étape 5).
  const typePersonne = (profil.typePersonne ?? "").trim().toUpperCase();
  if (typePersonne === "ADULTE") return "ADULTE";
  if (typePersonne === "JEUNE") return "JEUNE";
  if (typePersonne === "ENFANT") return "ENFANT";
  // VISITEUR → pas de cible de barème spécifique, on continue vers le fallback.

  const classification = (profil.classificationSociale ?? "").trim().toLowerCase();
  if (classification) {
    if (classification.includes("adulte")) return "ADULTE";
    if (classification.includes("jeune")) return "JEUNE";
    if (classification.includes("enfant")) return "ENFANT";
    // Une classification sociale peut aussi directement désigner un sexe.
    if (classification.includes("femme")) return "FEMME";
    if (classification.includes("homme")) return "HOMME";
  }

  const sexe = (profil.sexe ?? "").trim().toLowerCase();
  if (sexe === "masculin" || sexe === "homme") return "HOMME";
  if (sexe === "féminin" || sexe === "feminin" || sexe === "femme") return "FEMME";

  return "TOUS";
}

/**
 * Classe d'âge du membre (ADULTE / JEUNE / ENFANT) déduite de la
 * classification sociale, de la date de naissance ou de l'âge explicite.
 * Retourne `null` si aucune information d'âge n'est exploitable.
 */
export function determinerClasseAge(profil: {
  classificationSociale?: string | null;
  sexe?: string | null;
  dateNaissance?: string | null;
  age?: number | null;
  typePersonne?: string | null;
}): "ADULTE" | "JEUNE" | "ENFANT" | null {
  // 1. Priorité absolue : champ « Type de personne » du membre (étape 5).
  const typePersonne = (profil.typePersonne ?? "").trim().toUpperCase();
  if (typePersonne === "JEUNE") return "JEUNE";
  if (typePersonne === "ENFANT") return "ENFANT";
  if (typePersonne === "ADULTE") return "ADULTE";
  // VISITEUR → pas de classe d'âge (don libre), retour null.

  const classification = (profil.classificationSociale ?? "").trim().toLowerCase();
  if (classification.includes("adulte")) return "ADULTE";
  if (classification.includes("jeune")) return "JEUNE";
  if (classification.includes("enfant")) return "ENFANT";

  const age = calculerAge(profil.dateNaissance ?? null, profil.age ?? null);
  if (age == null) return null;
  if (age < 13) return "ENFANT";
  if (age < 30) return "JEUNE";
  return "ADULTE";
}

/** Calcule l'âge en années révolues depuis une date ISO ou un âge explicite. */
function calculerAge(dateNaissance: string | null, ageExplicite: number | null): number | null {
  if (ageExplicite != null && Number.isFinite(ageExplicite) && ageExplicite >= 0) {
    return Math.floor(ageExplicite);
  }
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  if (Number.isNaN(naissance.getTime())) return null;
  const maintenant = new Date();
  let age = maintenant.getFullYear() - naissance.getFullYear();
  const mois = maintenant.getMonth() - naissance.getMonth();
  if (mois < 0 || (mois === 0 && maintenant.getDate() < naissance.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Sexe du membre (HOMME / FEMME) déduit du sexe, de la civilité ou de la
 * classification sociale. Retourne `null` si indéterminé.
 */
export function determinerSexe(profil: {
  sexe?: string | null;
  civilite?: string | null;
  classificationSociale?: string | null;
}): "HOMME" | "FEMME" | null {
  const brut = `${profil.sexe ?? ""} ${profil.civilite ?? ""} ${profil.classificationSociale ?? ""}`
    .trim()
    .toLowerCase();
  if (!brut.trim()) return null;
  if (
    brut.includes("femme") ||
    brut.includes("féminin") ||
    brut.includes("feminin") ||
    brut.includes("fille") ||
    brut.includes("madame") ||
    brut.includes("mme") ||
    brut.includes("mlle")
  ) {
    // « homme » contient « mme » : on priorise le féminin uniquement si un
    // marqueur féminin explicite est présent sans marqueur masculin fort.
    if (!brut.includes("homme") || brut.includes("femme")) return "FEMME";
  }
  if (
    brut.includes("homme") ||
    brut.includes("masculin") ||
    brut.includes("garçon") ||
    brut.includes("garcon") ||
    brut.includes("monsieur") ||
    /(^|\s)m[\s.]/.test(brut)
  ) {
    return "HOMME";
  }
  return null;
}

/** Vrai si la grille utilise des barèmes par âge (ADULTE / JEUNE / ENFANT). */
export function grilleParAge(baremes: BaremeMinimal[]): boolean {
  return baremes.some(
    (bareme) => bareme.cible === "ADULTE" || bareme.cible === "JEUNE" || bareme.cible === "ENFANT",
  );
}

/** Vrai si la grille utilise des barèmes par sexe (HOMME / FEMME). */
export function grilleParSexe(baremes: BaremeMinimal[]): boolean {
  return baremes.some((bareme) => bareme.cible === "HOMME" || bareme.cible === "FEMME");
}

/** Un barème allégé, tel que nécessaire à la sélection et au calcul. */
export type BaremeMinimal = {
  cible: CibleCotisation | string;
  montant: number;
};

/**
 * Sélectionne le barème applicable à un membre selon le mode de la grille :
 *  • grille par ÂGE (ADULTE / JEUNE / ENFANT) → classe d'âge du membre,
 *  • grille par SEXE (HOMME / FEMME) → sexe du membre,
 *  • barème global unique (TOUS ou un seul barème) → ce montant.
 *
 * La signature historique `(baremes, cible)` reste supportée : sans profil,
 * elle conserve la stratégie de repli systématique (exact → ADULTE →
 * TOUS → premier barème).
 */
export function selectionnerBareme<T extends BaremeMinimal>(
  baremes: T[],
  cible: CibleCotisation,
  profil?: {
    classificationSociale?: string | null;
    sexe?: string | null;
    civilite?: string | null;
    dateNaissance?: string | null;
    age?: number | null;
  } | null,
): T | null {
  if (baremes.length === 0) return null;

  // --- Mode profilé : on respecte le mode réel de la grille. ---
  if (profil) {
    const utiliseAge = grilleParAge(baremes);
    const utiliseSexe = grilleParSexe(baremes);

    if (utiliseAge && !utiliseSexe) {
      const classe = determinerClasseAge(profil);
      if (classe) {
        const exact = baremes.find((bareme) => bareme.cible === classe);
        if (exact) return exact;
      }
      const generique = baremes.find((bareme) => bareme.cible === "TOUS");
      if (generique) return generique;
      // Repli : premier barème d'âge disponible (ne jamais renvoyer null).
      const premierAge = baremes.find(
        (bareme) => bareme.cible === "ADULTE" || bareme.cible === "JEUNE" || bareme.cible === "ENFANT",
      );
      if (premierAge) return premierAge;
      return baremes[0] ?? null;
    }

    if (utiliseSexe && !utiliseAge) {
      const sexe = determinerSexe(profil);
      if (sexe) {
        const exact = baremes.find((bareme) => bareme.cible === sexe);
        if (exact) return exact;
      }
      const generique = baremes.find((bareme) => bareme.cible === "TOUS");
      if (generique) return generique;
      const premierSexe = baremes.find(
        (bareme) => bareme.cible === "HOMME" || bareme.cible === "FEMME",
      );
      if (premierSexe) return premierSexe;
      return baremes[0] ?? null;
    }

    if (baremes.length === 1) return baremes[0] ?? null;
    const generique = baremes.find((bareme) => bareme.cible === "TOUS");
    if (generique) return generique;
  }

  const exact = baremes.find((bareme) => bareme.cible === cible);
  if (exact) return exact;

  // 2. Repli Homme / Femme → ADULTE (grille par tranche d'âge).
  if (cible === "HOMME" || cible === "FEMME") {
    const adulte = baremes.find((bareme) => bareme.cible === "ADULTE");
    if (adulte) return adulte;
  }

  // 3. Repli générique.
  const tous = baremes.find((bareme) => bareme.cible === "TOUS");
  if (tous) return tous;

  // 4. Cible indéterminée → ADULTE en priorité.
  if (cible === "TOUS") {
    const adulte = baremes.find((bareme) => bareme.cible === "ADULTE");
    if (adulte) return adulte;
  }

  // 5. Dernier filet : ne jamais renvoyer null quand une grille existe.
  // Couvre le cas « Femme adulte sans barème FEMME » sur une grille
  // ADULTE / JEUNE / ENFANT (le cas 2 l'a déjà résolu) ainsi que toute
  // autre cible sans correspondance.
  return baremes[0] ?? null;
}

/** Attendus calculés pour un membre sur une cotisation. */
export type AttenduCalcule = {
  /** Cible retenue pour ce membre (Adulte, Jeune…). */
  cible: CibleCotisation;
  /** Montant dû par période de recouvrement (mois, semaine…), ou null. */
  montantPeriodique: number | null;
  /** Attendu projeté sur l'année complète, ou null si aucun barème. */
  attenduAnnuel: number | null;
};

/**
 * Calcule l'attendu périodique et annuel d'un membre pour une cotisation,
 * à partir de son profil (classification / sexe) et de la grille de barèmes.
 *
 * Le montant stocké dans un barème représente le dû par période ; l'attendu
 * annuel est obtenu en le multipliant par le nombre de périodes de l'année
 * (ex. 1000 FCFA/mois → 12 000 FCFA/an).
 */
export function calculerAttendu(
  profil: ProfilMembre,
  baremes: BaremeMinimal[],
  frequence: FrequenceCotisation,
): AttenduCalcule {
  const cible = determinerCible(profil);
  const bareme = selectionnerBareme(baremes, cible);

  if (!bareme) {
    return { cible, montantPeriodique: null, attenduAnnuel: null };
  }

  const montantPeriodique = Number(bareme.montant);
  const attenduAnnuel = montantPeriodique * periodesParAn(frequence);

  return { cible, montantPeriodique, attenduAnnuel };
}

/** Regroupe une grille de barèmes en dictionnaire cible → montant. */
export function baremesEnDictionnaire(
  baremes: Pick<BaremeCotisation, "cible" | "montant">[] | BaremeMinimal[],
): Record<string, number> {
  const dictionnaire: Record<string, number> = {};
  for (const bareme of baremes) {
    dictionnaire[bareme.cible] = Number(bareme.montant);
  }
  return dictionnaire;
}

