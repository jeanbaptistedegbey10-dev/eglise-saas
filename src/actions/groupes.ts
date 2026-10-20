"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAccesChemin } from "@/lib/garde-actions";
import type { OrganisationFormState } from "@/types/organisation";
import { dedupe, echec, identifiantSchema, lireBool, lireOpt, lireTexte, revalOrg, srvErr } from "@/lib/organisation-utils";
import { membresOk } from "./organisation";
const schema = z.object({
  id: identifiantSchema.optional(),
  nom: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullish(),
  aUnBureau: z.boolean(),
  estSousGroupe: z.boolean(),
  parentId: identifiantSchema.nullish(),
  departementId: identifiantSchema.nullish(),
  responsableId: identifiantSchema.nullish(),
  bureauIds: z.array(identifiantSchema),
});
export async function enregistrerGroupe(_p: OrganisationFormState, fd: FormData): Promise<OrganisationFormState> {
  const garde = await exigerAccesChemin("/organisation");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const a = schema.safeParse({
    id: lireTexte(fd.get("id")) || undefined,
    nom: lireTexte(fd.get("nom")),
    description: lireOpt(fd.get("description")),
    aUnBureau: lireBool(fd.get("aUnBureau")),
    estSousGroupe: lireBool(fd.get("estSousGroupe")),
    parentId: lireOpt(fd.get("parentId")),
    departementId: lireOpt(fd.get("departementId")),
    responsableId: lireOpt(fd.get("responsableId")),
    bureauIds: fd.getAll("bureauIds").map((v) => lireTexte(v)).filter((v) => v !== ""),
  });
  if (!a.success) return echec(a.error);
  const d = a.data;
  const parentId = d.estSousGroupe ? (d.parentId ?? null) : null;
  const depId = d.estSousGroupe ? null : (d.departementId ?? null);
  const resp = d.responsableId ?? null;
  const bureau = d.aUnBureau ? dedupe(d.bureauIds.filter((id) => id !== resp)) : [];
  if (d.id && parentId && d.id === parentId) {
    return { success: false, message: "Parent invalide.", fieldErrors: { parentId: ["Autre groupe requis."] } };
  }
  try {
    const dbl = await prisma.groupe.findFirst({
      where: { nom: d.nom, ...(d.id ? { id: { not: d.id } } : {}) },
      select: { id: true },
    });
    if (dbl) return { success: false, message: "Nom déjà utilisé.", fieldErrors: { nom: ["Nom déjà utilisé."] } };
    if (resp) {
      const ok = await prisma.membre.findUnique({ where: { id: resp }, select: { id: true } });
      if (!ok) return { success: false, message: "Responsable introuvable.", fieldErrors: { responsableId: ["Actualisez."] } };
    }
    if (parentId) {
      const ok = await prisma.groupe.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!ok) return { success: false, message: "Parent introuvable.", fieldErrors: { parentId: ["Actualisez."] } };
    }
    if (depId) {
      const ok = await prisma.departement.findUnique({ where: { id: depId }, select: { id: true } });
      if (!ok) return { success: false, message: "Département introuvable.", fieldErrors: { departementId: ["Actualisez."] } };
    }
    const ex = await membresOk(bureau);
    if (ex.length !== bureau.length) {
      return { success: false, message: "Membre du bureau introuvable.", fieldErrors: { bureauIds: ["Actualisez."] } };
    }
    if (d.id) {
      const id = d.id;
      await prisma.$transaction(async (tx) => {
        await tx.groupe.update({
          where: { id },
          data: { nom: d.nom, description: d.description, aUnBureau: d.aUnBureau, estSousGroupe: d.estSousGroupe, parentId, departementId: depId, responsableId: resp },
        });
        await tx.groupeMembre.deleteMany({ where: { groupeId: id, role: "RESPONSABLE" } });
        if (resp) {
          await tx.groupeMembre.upsert({
            where: { groupeId_membreId: { groupeId: id, membreId: resp } },
            update: { role: "RESPONSABLE" },
            create: { groupeId: id, membreId: resp, role: "RESPONSABLE" },
          });
        }
        await tx.groupeMembre.deleteMany({ where: { groupeId: id, role: "MEMBRE_BUREAU" } });
        if (bureau.length > 0) {
          await tx.groupeMembre.createMany({
            data: bureau.map((membreId) => ({ groupeId: id, membreId, role: "MEMBRE_BUREAU" as const })),
          });
        }
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const c = await tx.groupe.create({
          data: { nom: d.nom, description: d.description, aUnBureau: d.aUnBureau, estSousGroupe: d.estSousGroupe, parentId, departementId: depId, responsableId: resp },
        });
        if (resp) await tx.groupeMembre.create({ data: { groupeId: c.id, membreId: resp, role: "RESPONSABLE" } });
        if (bureau.length > 0) {
          await tx.groupeMembre.createMany({
            data: bureau.map((membreId) => ({ groupeId: c.id, membreId, role: "MEMBRE_BUREAU" as const })),
          });
        }
      });
    }
    revalOrg();
    return { success: true, message: d.id ? "Groupe mis à jour." : "Groupe créé.", fieldErrors: {} };
  } catch (e) {
    return srvErr("enregistrerGroupe", e);
  }
}
