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

  return <PatrimoineClient biens={biens} stats={stats} />;
}
