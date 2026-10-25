import { Building2 } from "lucide-react";
import { PatrimoineClient, type PatrimoineStats } from "@/components/patrimoine/PatrimoineClient";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Patrimoine & Logistique",
  description:
    "Inventaire du patrimoine et du matériel de l'église : sonorisation, instruments, mobilier, informatique, immobilier.",
};

export default async function PatrimoinePage() {
  const [biens, totalArticles, valeurTotale, nbEnPanne] = await Promise.all([
    prisma.bienPatrimoine.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.bienPatrimoine.aggregate({ _sum: { quantite: true } }),
    prisma.bienPatrimoine.aggregate({ _sum: { valeurEstimee: true } }),
    prisma.bienPatrimoine.count({
      where: { etat: { in: ["EN_PANNE", "HORS_SERVICE"] } },
    }),
  ]);

  const stats: PatrimoineStats = {
    totalArticles: totalArticles._sum.quantite ?? 0,
    valeurTotale: Number(valeurTotale._sum.valeurEstimee ?? 0),
    nbEnPanne,
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
            <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-300" aria-hidden />
          </span>
          <p className="text-sm font-medium text-accent">Patrimoine</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Inventaire du patrimoine
          </h1>
          <p className="text-sm text-muted-foreground">
            Sonorisation, instruments, mobilier, informatique, immobilier.
          </p>
        </div>
      </header>
      <PatrimoineClient biens={biens} stats={stats} />
    </div>
  );
}
