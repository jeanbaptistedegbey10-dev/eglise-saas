import {
  CategorieCaisse,
  CategorieCotisationEnum,
  ModePaiement,
  TypeDepense,
} from "@/generated/prisma/enums";

// Re-export du formatateur de montants (utilisé dans tout l'espace finances).
export { formatMontant } from "@/lib/membre";

// ---------------------------------------------------------------------------
// Modes de paiement
// ---------------------------------------------------------------------------

/** Liste ordonnée des modes de paiement, pour les sélecteurs côté client. */
export const MODES_PAIEMENT: { value: ModePaiement; label: string }[] = [
  { value: "ESPECES", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "VIREMENT", label: "Virement" },
  { value: "CHEQUE", label: "Chèque" },
  { value: "CARTE_BANCAIRE", label: "Carte bancaire" },
];

/** Valeurs de l'enum, sous forme exploitable par `z.enum` (côté serveur). */
export const VALEURS_MODE_PAIEMENT = Object.values(ModePaiement) as [
  ModePaiement,
  ...ModePaiement[],
];

export const VALEURS_TYPE_COTISATION = Object.values(CategorieCotisationEnum) as [
  CategorieCotisationEnum,
  ...CategorieCotisationEnum[],
];

// ---------------------------------------------------------------------------
// Types de cotisation
// ---------------------------------------------------------------------------

/** Libellé français des valeurs de l'enum `CategorieCotisationEnum`. */
const LIBELLES_TYPE_COTISATION: Record<CategorieCotisationEnum, string> = {
  OBLIGATOIRE_BAREME: "Cotisation obligatoire (barème)",
  VOLONTAIRE_CAMPAGNE: "Cotisation volontaire / campagne",
  QUETE_ANONYME: "Quête anonyme",
};

/** Traduit un type de cotisation (enum Prisma) en libellé lisible. */
export function libelleTypeCotisation(type: CategorieCotisationEnum | string): string {
  return (
    LIBELLES_TYPE_COTISATION[type as CategorieCotisationEnum] ?? String(type)
  );
}

/** Alias historique — `FinancesTypeTabs`, `/finances/baremes` et `/rapports` l'utilisent encore. */
export const libelleCategorieCotisation = libelleTypeCotisation;

/**
 * Les 3 grandes catégories du module Finances, telles qu'affichées dans la
 * navigation de la page /finances.
 */
export const CATEGORIES_FINANCES = [
  {
    id: "OBLIGATOIRE_BAREME",
    label: "Cotisations Obligatoires (Barèmes)",
    resume: "Cotisations fixées par barème et classe (ex. Jeunes, Adultes).",
  },
  {
    id: "VOLONTAIRE_CAMPAGNE",
    label: "Cotisations Volontaires & Campagnes",
    resume: "Dons et campagnes ponctuels, montant libre.",
  },
  {
    id: "QUETE_ANONYME",
    label: "Quêtes",
    resume: "Quêtes de culte et dons anonymes, sans identité du donneur.",
  },
] as const;

export type CategorieFinancesId = (typeof CATEGORIES_FINANCES)[number]["id"];

// ---------------------------------------------------------------------------
// Dépenses & décaissements
// ---------------------------------------------------------------------------

/** Les 2 natures de décaissement, telles qu'affichées dans le formulaire. */
export const TYPE_DEPENSES: {
  value: TypeDepense;
  label: string;
  resume: string;
}[] = [
  {
    value: "AFFECTEE_COTISATION",
    label: "Liée à une cotisation / projet",
    resume: "Dépense payée sur les fonds déjà collectés (Loyer, Aide, Travaux…).",
  },
  {
    value: "CAISSE_DIRECTE",
    label: "Sortie directe d'une caisse interne",
    resume: "Fonds propres de l'église : Caisse Générale, Solidarité ou Travaux.",
  },
];

/** Les 3 caisses internes de trésorerie. */
export const CAISSES_INTERNE: {
  value: CategorieCaisse;
  label: string;
  resume: string;
}[] = [
  {
    value: "GENERALE",
    label: "Caisse Générale",
    resume: "Fonctionnement courant et factures.",
  },
  {
    value: "SOLIDARITE",
    label: "Caisse de Solidarité",
    resume: "Secours diaconal et aide sociale.",
  },
  {
    value: "TRAVAUX_PROJETS",
    label: "Caisse Travaux & Projets",
    resume: "Investissements, équipements et travaux.",
  },
];

/** Valeurs des enums dépenses, sous forme exploitable par `z.enum`. */
export const VALEURS_TYPE_DEPENSE = Object.values(TypeDepense) as [
  TypeDepense,
  ...TypeDepense[],
];

export const VALEURS_CATEGORIE_CAISSE = Object.values(CategorieCaisse) as [
  CategorieCaisse,
  ...CategorieCaisse[],
];

/** Traduit un type de dépense (enum Prisma) en libellé lisible. */
export function libelleTypeDepense(type: TypeDepense | string): string {
  return (
    TYPE_DEPENSES.find((item) => item.value === type)?.label ?? String(type)
  );
}

/** Traduit une caisse interne (enum Prisma) en libellé lisible. */
export function libelleCategorieCaisse(caisse: CategorieCaisse | string): string {
  return (
    CAISSES_INTERNE.find((item) => item.value === caisse)?.label ?? String(caisse)
  );
}

/** Alias TypeScript — compatibilité si du code référence encore `CategorieCaisse`. */
export type CategorieCaisseAlias = CategorieCaisse;
