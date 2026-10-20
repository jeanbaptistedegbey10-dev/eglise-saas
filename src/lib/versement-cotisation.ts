// ---------------------------------------------------------------------------
// Calculs synchrones des versements de cotisation (part obligatoire + surplus)
// ---------------------------------------------------------------------------

/** Arrondit à 2 décimales, en évitant les artefacts flottants (0.1 + 0.2). */
export function arrondir2(valeur: number): number {
  return Math.round((valeur + Number.EPSILON) * 100) / 100;
}

/** Répartition d'un montant remis entre part obligatoire et surplus. */
export type RepartitionMontant = {
  /** Montant total remis par le donateur. */
  total: number;
  /** Part obligatoire acquittée (plancher, ou total si pas de plancher). */
  base: number;
  /** Don additionnel au-delà du plancher (0 si aucun surplus). */
  surplus: number;
};

/**
 * Découpe un montant remis en « part obligatoire » et « surplus volontaire ».
 *
 * • Sans plancher (cotisation anonyme, montant libre) : tout est de base.
 * • Sous le plancher : le total est retenu comme base (paiement partiel — le
 *   serveur refuse de l'ailleurs, mais l'aperçu reste cohérent).
 * • Au-dessus : la base plafonne au plancher, l'écart devient surplus.
 */
export function repartitionMontant(
  montantTotal: number,
  montantPlancher: number | null | undefined,
): RepartitionMontant {
  const total = arrondir2(Math.max(0, Number.isFinite(montantTotal) ? montantTotal : 0));
  const plancher =
    montantPlancher != null && Number.isFinite(montantPlancher) && montantPlancher > 0
      ? arrondir2(montantPlancher)
      : null;

  if (plancher === null || total <= plancher) {
    return { total, base: total, surplus: 0 };
  }
  return { total, base: plancher, surplus: arrondir2(total - plancher) };
}

/** Vrai si le montant remis n'atteint pas le plancher obligatoire. */
export function estSousPlancher(
  montantTotal: number,
  montantPlancher: number | null | undefined,
): boolean {
  if (montantPlancher == null || montantPlancher <= 0) return false;
  return arrondir2(montantTotal) < arrondir2(montantPlancher);
}

/**
 * Montant dû pour N mois d'une cotisation récurrente : le barème de la classe
 * est un montant par période, on le multiplie par le nombre de mois cochés.
 */
export function montantRecurrent(montantPeriodique: number, nombreMois: number): number {
  const parMois = Number.isFinite(montantPeriodique) ? montantPeriodique : 0;
  const mois = Math.max(0, Math.trunc(nombreMois));
  return arrondir2(parMois * mois);
}

/** Progression (0 → 1) d'une campagne vers sa cible, ou null si pas de cible. */
export function progressionCible(totalRecolte: number, montantCible: number | null): number | null {
  if (montantCible == null || montantCible <= 0) return null;
  return Math.min(1, Math.max(0, totalRecolte / montantCible));
}

/** Formate un taux (0 → 1) en pourcentage lisible (« 84.5 % »). */
export function pourcentage(taux: number | null): string {
  if (taux === null) return "—";
  return `${Math.round(taux * 1000) / 10} %`;
}
