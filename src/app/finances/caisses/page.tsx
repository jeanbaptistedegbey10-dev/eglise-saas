import type { Metadata } from "next";

import { assurerCaissesInitiales, listerMouvementsCaisse } from "@/lib/caisse";
import { formatMontant } from "@/lib/membre";
import CarteCaisse from "@/components/finances/CarteCaisse";
import GestionCaisses from "@/components/finances/GestionCaisses";
import type { CaisseResume, MouvementCaisseLigne } from "@/lib/caisse";

export const metadata: Metadata = {
  title: "Gestion des Caisses",
  description:
    "Suivre les soldes des caisses internes, créer de nouvelles caisses et consulter l'historique des mouvements de trésorerie.",
};

// Les données sont lues à chaque requête : le tableau reste à jour après une
// Server Action, et le build ne dépend pas d'une base accessible.
export const dynamic = "force-dynamic";

export default async function CaissesPage() {
  let caisses: CaisseResume[] = [];
  let mouvements: MouvementCaisseLigne[] = [];
  let erreurBase: string | null = null;

  try {
    const [lignesCaisses, lignesMouvements] = await Promise.all([
      assurerCaissesInitiales(),
      listerMouvementsCaisse(100),
    ]);
    // Plain Objects JSON : Decimal → Number explicite avant Client Components.
    caisses = lignesCaisses.map((caisse) => ({
      ...caisse,
      soldeActuel: Number(caisse.soldeActuel),
      soldeInitial: Number(caisse.soldeInitial),
    }));
    mouvements = lignesMouvements.map((mouvement) => ({
      ...mouvement,
      montant: Number(mouvement.montant),
    }));
  } catch (error) {
    console.error("Erreur lors du chargement des caisses :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  const totalTresorerie = caisses.reduce((acc, c) => acc + Number(c.soldeActuel), 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Finances</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Gestion des Caisses
          </h1>
          <p className="text-sm text-muted-foreground">
            Soldes des caisses internes, création de caisses et historique des mouvements.
          </p>
        </div>
      </header>

      {erreurBase && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {erreurBase}
        </div>
      )}

      {/* Cartes de solde des caisses */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {caisses.map((caisse) => (
          <CarteCaisse key={caisse.id} caisse={caisse} />
        ))}
        {caisses.length === 0 && (
          <div className="col-span-1 rounded-xl border border-dashed border-card-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
            Aucune caisse configurée. Cliquez sur « Nouvelle Caisse » pour en
            créer une.
          </div>
        )}
        <div className="col-span-1 rounded-xl border border-card-border bg-primary p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary-foreground">
            Trésorerie totale
          </div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-white tabular-nums">
            {formatMontant(totalTresorerie)} FCFA
          </div>
          <p className="mt-1 text-xs text-primary-foreground/70">
            Somme des soldes actuels des caisses
          </p>
        </div>
      </section>

      <GestionCaisses caisses={caisses} mouvements={mouvements} />
    </div>
  );
}
