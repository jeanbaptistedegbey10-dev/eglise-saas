import { ModePaiement, TypeCotisationEnum } from "@/generated/prisma/enums";

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

export const VALEURS_TYPE_COTISATION = Object.values(TypeCotisationEnum) as [
  TypeCotisationEnum,
  ...TypeCotisationEnum[],
];

// ---------------------------------------------------------------------------
// Types de cotisation
// ---------------------------------------------------------------------------

/** Libellé français des valeurs de l'enum `TypeCotisationEnum`. */
const LIBELLES_TYPE_COTISATION: Record<TypeCotisationEnum, string> = {
  OBLIGATOIRE_BAREME: "Cotisation obligatoire (barème)",
  VOLONTAIRE_CAMPAGNE: "Cotisation volontaire / campagne",
  QUETE_ANONYME: "Quête anonyme",
};

/** Traduit un type de cotisation (enum Prisma) en libellé lisible. */
export function libelleTypeCotisation(type: TypeCotisationEnum | string): string {
  return (
    LIBELLES_TYPE_COTISATION[type as TypeCotisationEnum] ?? String(type)
  );
}

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
