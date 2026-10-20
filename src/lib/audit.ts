import { prisma } from "@/lib/prisma";

export async function consignerAudit(params: {
  action: string;
  entite: string;
  entiteId?: string;
  auteurNom?: string;
  details: string;
}) {
  try {
    await prisma.journalAudit.create({
      data: {
        action: params.action,
        entite: params.entite,
        entiteId: params.entiteId,
        auteurNom: params.auteurNom ?? "Responsable",
        details: params.details,
      },
    });
  } catch (e) {
    console.error("Échec d'enregistrement de l'audit :", e);
  }
}