import type { Metadata } from "next";

import { listerCaisses, listerMouvementsCaisse } from "@/lib/caisse";
import { prisma } from "@/lib/prisma";
import DonsLibres from "@/components/finances/DonsLibres";
import type { CaisseResume, MouvementCaisseLigne } from "@/lib/caisse";

export const metadata: Metadata = {
  title: "Dons Libres & Offrandes",
  description:
    "Enregistrement des dons spontanés hors barème / cotisation et grand livre chronologique des dons libres perçus sur l'exercice en cours.",
};

export const dynamic = "force-dynamic";

export default async function DonsLibresPage() {
  let caisses: CaisseResume[] = [];
  let membres: { id: string; nom: string; prenoms: string }[] = [];
  let dons: MouvementCaisseLigne[] = [];
  let erreurBase: string | null = null;

  try {
    const [lignesCaisses, lignesMembres, lignesMouvements] = await Promise.all([
      listerCaisses(),
      prisma.membre.findMany({
        orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
        select: { id: true, nom: true, prenoms: true },
      }),
      listerMouvementsCaisse(200),
    ]);
    caisses = lignesCaisses.map((caisse) => ({
      // Plain Object JSON : Decimal → Number explicite avant Client Component.
      ...caisse,
      soldeActuel: Number(caisse.soldeActuel),
      soldeInitial: Number(caisse.soldeInitial),
    }));
    membres = lignesMembres;
    dons = lignesMouvements
      .filter((m) => m.type === "DON_LIBRE")
      .map((mouvement) => ({
        // Plain Object JSON : Decimal → Number explicite avant Client Component.
        ...mouvement,
        montant: Number(mouvement.montant),
      }));
  } catch (error) {
    console.error("Erreur lors du chargement des dons libres :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  const totalCumule = dons.reduce((somme, d) => somme + d.montant, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Finances</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Dons Libres &amp; Offrandes
          </h1>
          <p className="text-sm text-muted-foreground">
            Enregistrement des dons spontanés hors barème / cotisation et grand livre chronologique.
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

      <section className="flex flex-col gap-4">
        <DonsLibres
          caisses={caisses}
          membres={membres}
          dons={dons}
          totalCumule={totalCumule}
        />
      </section>
    </div>
  );
}
