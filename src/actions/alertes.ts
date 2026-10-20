import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { AlertesResume } from "@/components/layout/HeaderNotifications";

/** Alertes : cotisations en retard + événements J+7 non préparés. */
export const obtenirAlertes = cache(async (): Promise<AlertesResume> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const now = new Date();
    const dans7j = new Date(); dans7j.setDate(dans7j.getDate() + 7);

    // 1) Cotisations récurrentes non clôturées, sans versement depuis 35 jours (retard).
    let cotisationsEnRetard: AlertesResume["cotisationsEnRetard"] = [];
    try {
      const cotisations = await db.cotisation.findMany({
        where: { estCloture: false, type: "RECURRENTE_CLASSE" },
        select: { id: true, nom: true, versements: { orderBy: { dateVersement: "desc" }, take: 1, select: { dateVersement: true } }, _count: { select: { versements: true } } },
        take: 20,
      });
      const seuil = new Date(); seuil.setDate(seuil.getDate() - 35);
      cotisationsEnRetard = cotisations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c._count.versements === 0 || (c.versements[0] && new Date(c.versements[0].dateVersement) < seuil))
        .slice(0, 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => ({ id: c.id, titre: c.nom, detail: c._count.versements === 0 ? "Aucun versement enregistré" : "Dernier versement > 35 jours", href: "/finances/cotisations" }));
    } catch { /* table inchangée : on ignore */ }

    // 2) Événements J+7 : sans tâche ou avec tâche sans responsable.
    let evenementsNonPrepares: AlertesResume["evenementsNonPrepares"] = [];
    try {
      const cultes = await db.culte.findMany({
        where: { date: { gte: now, lte: dans7j } },
        orderBy: { date: "asc" },
        include: { taches: { select: { id: true, statut: true, responsableMembreId: true } } },
        take: 10,
      });
      evenementsNonPrepares = cultes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => {
          const t = Array.isArray(c.taches) ? c.taches : [];
          if (t.length === 0) return true;
          return t.some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (x: any) => !x.responsableMembreId || x.statut === "A_FAIRE",
          );
        })
        .slice(0, 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => {
          const t = Array.isArray(c.taches) ? c.taches : [];
          const sansResp = t.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (x: any) => !x.responsableMembreId,
          ).length;
          const detail = t.length === 0 ? "Aucune tâche de préparation" : sansResp > 0 ? `${sansResp} tâche(s) sans responsable` : "Tâches à démarrer";
          const d = new Date(c.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
          return { id: c.id, titre: `${c.intitule} — ${d}`, detail, href: "/cultes" };
        });
    } catch {
      // Base non migrée : repli sur les cultes J+7 sans info tâches.
      try {
        const cultes = await db.culte.findMany({ where: { date: { gte: now, lte: dans7j } }, orderBy: { date: "asc" }, take: 5 });
        evenementsNonPrepares = cultes.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => {
            const d = new Date(c.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
            return { id: c.id, titre: `${c.intitule} — ${d}`, detail: "À préparer (tâches / responsables)", href: "/cultes" };
          },
        );
      } catch { evenementsNonPrepares = []; }
    }
    void now;
    return { cotisationsEnRetard, evenementsNonPrepares };
  } catch {
    return { cotisationsEnRetard: [], evenementsNonPrepares: [] };
  }
});
