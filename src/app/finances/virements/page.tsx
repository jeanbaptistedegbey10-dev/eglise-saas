import type { Metadata } from "next";

import { listerCaisses, listerTracesVirements } from "@/lib/caisse";
import { calculerSoldeCotisation } from "@/lib/caisse";
import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/membre";
import Virements from "@/components/finances/Virements";

export const metadata: Metadata = {
  title: "Virements & Compléments",
  description:
    "Transferts de fonds internes : cotisation vers caisse, complément caisse vers cotisation et virement inter-caisses, avec traçabilité complète.",
};

export const dynamic = "force-dynamic";

type CotisationAvecSolde = {
  id: string;
  nom: string;
  exerciceId: string;
  estCloture: boolean;
  soldeDisponible: number;
};

export default async function VirementsPage() {
  let caisses: Awaited<ReturnType<typeof listerCaisses>> = [];
  let cotisations: CotisationAvecSolde[] = [];
  let traces: Awaited<ReturnType<typeof listerTracesVirements>> = [];
  let erreurBase: string | null = null;

  try {
    const [lignesCaisses, lignesCotisations, lignesTraces] = await Promise.all([
      listerCaisses(),
      prisma.cotisation.findMany({
        orderBy: [{ nom: "asc" }],
      }),
      listerTracesVirements(),
    ]);
    caisses = lignesCaisses.map((caisse) => ({
      // Plain Object JSON : Decimal → Number explicite avant Client Component.
      ...caisse,
      soldeActuel: Number(caisse.soldeActuel),
      soldeInitial: Number(caisse.soldeInitial),
    }));
    cotisations = (
      await Promise.all(
        lignesCotisations.map(async (cotisation) => {
          const solde = await calculerSoldeCotisation(cotisation.id);
          return {
            id: cotisation.id,
            nom: cotisation.nom,
            exerciceId: cotisation.exerciceId,
            estCloture: cotisation.estCloture,
            soldeDisponible: Number(solde?.soldeDisponible ?? 0),
          };
        }),
      )
    );
    // Plain Objects JSON : Decimal → Number explicite avant Client Component.
    traces = lignesTraces.map((trace) => ({
      ...trace,
      montant: Number(trace.montant),
    }));
  } catch (error) {
    console.error("Erreur lors du chargement des virements :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  const totalTraces = traces.reduce((somme, t) => somme + t.montant, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Finances</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Virements &amp; Compléments
          </h1>
          <p className="text-sm text-muted-foreground">
            Transferts de fonds internes entre cotisations et caisses, avec traçabilité des opérations.
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

      <Virements
        caisses={caisses}
        cotisations={cotisations}
        traces={traces}
        totalTraces={totalTraces}
      />
    </div>
  );
}
