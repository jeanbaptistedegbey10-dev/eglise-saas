import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, Coins, HandCoins, ReceiptText, Wallet } from "lucide-react";
import ExerciceFormModal from "@/components/finances/ExerciceFormModal";
import CaissesAccueil from "@/components/finances/CaissesAccueil";
import { formatMontant } from "@/lib/finance";
import { listerCaisses } from "@/lib/caisse";
import { prisma } from "@/lib/prisma";
import type { ExerciceOption } from "@/types/finance";
import type { CaisseResume } from "@/lib/caisse";
export const metadata: Metadata = { title: "Finances", description: "Tableau de bord : encaisse, decaisse, solde net et caisses reelles de l exercice." };
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ exercice?: string }> };

export default async function FinancesPage({ searchParams }: Props) {
  const { exercice: exerciceIdRequete } = await searchParams;

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

  // Exercice affiché : celui choisi dans l'URL, sinon le plus récent non clôturé.
  const exerciceSelectionne =
    exercices.find((exercice) => exercice.id === exerciceIdRequete) ??
    exercices.find((exercice) => !exercice.cloture) ??
    exercices[0] ??
    null;

let totalEncaisse = 0;
let totalDecaisse = 0;
let nombreVersements = 0;
let nombreDepenses = 0;
let caisses: CaisseResume[] = [];
if (exerciceSelectionne) {
try {
const [versements, paiements, depenses] = await Promise.all([
prisma.versementCotisation.findMany({ where: { cotisation: { exerciceId: exerciceSelectionne.id } }, select: { montant: true } }),
prisma.paiement.findMany({ where: { exerciceId: exerciceSelectionne.id }, select: { montant: true } }),
prisma.depense.findMany({ where: { exerciceId: exerciceSelectionne.id }, select: { montant: true } }),
]);
for (const v of [...versements, ...paiements]) { totalEncaisse += Number(v.montant); nombreVersements += 1; }
for (const d of depenses) { totalDecaisse += Number(d.montant); nombreDepenses += 1; }
} catch (error) {
console.error("Erreur resume finances :", error);
erreurBase = "Impossible de charger les donnees financieres de l exercice.";
}
try {
caisses = (await listerCaisses()).map((caisse) => ({
// Plain Object JSON : Decimal → Number explicite avant Client Component.
...caisse,
soldeActuel: Number(caisse.soldeActuel),
soldeInitial: Number(caisse.soldeInitial),
}));
} catch (error) {
console.warn("Caisses indisponibles :", error);
}
}

const soldeNet = totalEncaisse - totalDecaisse;
return (
<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
<div className="flex flex-col gap-1">
<span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
<Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-300" aria-hidden />
</span>
<p className="text-sm font-medium text-accent">Finances</p>
<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Tableau de bord Finances</h1>
<p className="text-sm text-muted-foreground">Encaisse, decaisse, solde net et caisses reelles de l exercice.</p>
</div>
<div className="flex flex-wrap items-center gap-3">
{!erreurBase && exercices.length > 0 && (
<form method="get" action="/finances" className="flex items-center gap-2">
<label htmlFor="exercice-select" className="sr-only">Changer d exercice</label>
<select id="exercice-select" name="exercice" defaultValue={exerciceSelectionne?.id ?? ""} className="h-10 rounded-lg border border-card-border bg-background px-3 text-sm text-foreground">
{exercices.map((exercice) => (<option key={exercice.id} value={exercice.id}>{exercice.libelle}{exercice.cloture ? " (cloture)" : ""}</option>))}
</select>
<button type="submit" className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Afficher</button>
</form>
)}
<ExerciceFormModal />
</div>
</header>
{erreurBase && (
<div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300">
<CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{erreurBase}</span>
</div>
)}
{!erreurBase && !exerciceSelectionne && (
<div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
<span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Wallet className="h-7 w-7 text-muted-foreground" aria-hidden /></span>
<div className="flex flex-col gap-1">
<p className="text-base font-medium text-foreground">Aucun exercice comptable</p>
<p className="max-w-md text-sm text-muted-foreground">Creez l exercice en cours pour commencer.</p>
</div>
</div>
)}
{exerciceSelectionne && !erreurBase && (
<>
<section aria-label="Tableau de bord" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
<div className="flex flex-col gap-1 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-accent">Total Encaisse</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(totalEncaisse)} FCFA</span>
<span className="text-xs text-muted-foreground">{nombreVersements} versement(s)</span>
</div>
<div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Decaisse</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(totalDecaisse)} FCFA</span>
<span className="text-xs text-muted-foreground">{nombreDepenses} depense(s)</span>
</div>
<div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Solde Net</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{formatMontant(soldeNet)} FCFA</span>
<span className="text-xs text-muted-foreground">encaisse moins decaisse</span>
</div>
<div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mouvements</span>
<span className="text-xl font-semibold tabular-nums text-foreground">{nombreVersements + nombreDepenses}</span>
<span className="text-xs text-muted-foreground">operations de l exercice</span>
</div>
</section>
<CaissesAccueil caisses={caisses} />
<div className="flex flex-wrap items-center gap-3">
<Link href="/finances/cotisations?tab=types" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
<Coins className="h-4 w-4" aria-hidden />Cotisations et Baremes
</Link>
<Link href="/finances/cotisations?tab=versements" className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
<HandCoins className="h-4 w-4" aria-hidden />Versements
</Link>
<Link href="/finances/depenses" className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
<ReceiptText className="h-4 w-4" aria-hidden />Depenses et Decaissements
</Link>
<Link href="/finances/cotisations?tab=rapports" className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
<Wallet className="h-4 w-4" aria-hidden />Rapports et Bilans
</Link>
</div>
</>
)}
</div>
);
}

