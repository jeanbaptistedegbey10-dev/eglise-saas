"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAccesChemin } from "@/lib/garde-actions";
import type { OrganisationFormState, RoleOrganisation } from "@/types/organisation";
import { echec, identifiantSchema, lireTexte, revalOrg, srvErr } from "@/lib/organisation-utils";
import { membresOk } from "./organisation";
const roleSchema = z.enum(["RESPONSABLE", "MEMBRE_BUREAU", "MEMBRE"]);
export async function supprimerGroupe(_p: OrganisationFormState, fd: FormData): Promise<OrganisationFormState> {
  const garde = await exigerAccesChemin("/organisation");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const a = z.object({ groupeId: identifiantSchema }).safeParse({ groupeId: lireTexte(fd.get("groupeId")) });
  if (!a.success) return echec(a.error);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.groupe.updateMany({ where: { parentId: a.data.groupeId }, data: { parentId: null, estSousGroupe: false } });
      await tx.groupe.delete({ where: { id: a.data.groupeId } });
    });
    revalOrg();
    return { success: true, message: "Groupe supprimé.", fieldErrors: {} };
  } catch (e) {
    return srvErr("supprimerGroupe", e);
  }
}
export async function affecterMembresGroupe(_p: OrganisationFormState, fd: FormData): Promise<OrganisationFormState> {
  const garde = await exigerAccesChemin("/organisation");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const a = z
    .object({ groupeId: identifiantSchema, membreIds: z.array(identifiantSchema).max(500), roles: z.array(roleSchema) })
    .safeParse({
      groupeId: lireTexte(fd.get("groupeId")),
      membreIds: fd.getAll("membreId").map((v) => lireTexte(v)),
      roles: fd.getAll("role").map((v) => lireTexte(v)),
    });
  if (!a.success) return echec(a.error);
  if (a.data.membreIds.length !== a.data.roles.length) {
    return { success: false, message: "Rôles incohérents.", fieldErrors: { _form: ["Rôle manquant."] } };
  }
  const uniques = new Map<string, RoleOrganisation>();
  a.data.membreIds.forEach((id, i) => uniques.set(id, a.data.roles[i] as RoleOrganisation));
  const resps = [...uniques.entries()].filter(([, r]) => r === "RESPONSABLE").map(([id]) => id);
  if (resps.length > 1) return { success: false, message: "Un seul responsable.", fieldErrors: { role: ["Un seul responsable."] } };
  try {
    const g = await prisma.groupe.findUnique({ where: { id: a.data.groupeId }, select: { id: true } });
    if (!g) return { success: false, message: "Introuvable.", fieldErrors: { _form: ["Actualisez."] } };
    const ex = await membresOk([...uniques.keys()]);
    if (ex.length !== uniques.size) return { success: false, message: "Membre introuvable.", fieldErrors: { _form: ["Actualisez."] } };
    const nr = resps[0] ?? null;
    await prisma.$transaction(async (tx) => {
      await tx.groupe.update({ where: { id: g.id }, data: { responsableId: nr } });
      await tx.groupeMembre.deleteMany({ where: { groupeId: g.id } });
      if (uniques.size > 0) {
        await tx.groupeMembre.createMany({
          data: [...uniques.entries()].map(([membreId, role]) => ({ groupeId: g.id, membreId, role })),
        });
      }
    });
    revalOrg();
    return { success: true, message: "Membres affectés.", fieldErrors: {} };
  } catch (e) {
    return srvErr("affecterMembresGroupe", e);
  }
}
