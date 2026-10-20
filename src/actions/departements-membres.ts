"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAccesChemin } from "@/lib/garde-actions";
import type { OrganisationFormState, RoleOrganisation } from "@/types/organisation";
import { echec, identifiantSchema, lireTexte, revalOrg, srvErr } from "@/lib/organisation-utils";
import { membresOk } from "./organisation";
const roleSchema = z.enum(["RESPONSABLE", "MEMBRE_BUREAU", "MEMBRE"]);
export async function supprimerDepartement(_p: OrganisationFormState, fd: FormData): Promise<OrganisationFormState> {
  const garde = await exigerAccesChemin("/organisation");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const a = z.object({ departementId: identifiantSchema }).safeParse({ departementId: lireTexte(fd.get("departementId")) });
  if (!a.success) return echec(a.error);
  try {
    await prisma.departement.delete({ where: { id: a.data.departementId } });
    revalOrg();
    return { success: true, message: "Département supprimé.", fieldErrors: {} };
  } catch (e) {
    return srvErr("supprimerDepartement", e);
  }
}
export async function affecterMembresDepartement(_p: OrganisationFormState, fd: FormData): Promise<OrganisationFormState> {
  const garde = await exigerAccesChemin("/organisation");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const a = z
    .object({ departementId: identifiantSchema, membreIds: z.array(identifiantSchema).max(500), roles: z.array(roleSchema) })
    .safeParse({
      departementId: lireTexte(fd.get("departementId")),
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
    const dep = await prisma.departement.findUnique({ where: { id: a.data.departementId }, select: { id: true } });
    if (!dep) return { success: false, message: "Introuvable.", fieldErrors: { _form: ["Actualisez."] } };
    const ex = await membresOk([...uniques.keys()]);
    if (ex.length !== uniques.size) return { success: false, message: "Membre introuvable.", fieldErrors: { _form: ["Actualisez."] } };
    const nr = resps[0] ?? null;
    await prisma.$transaction(async (tx) => {
      await tx.departement.update({ where: { id: dep.id }, data: { responsableId: nr } });
      await tx.departementMembre.deleteMany({ where: { departementId: dep.id } });
      if (uniques.size > 0) {
        await tx.departementMembre.createMany({
          data: [...uniques.entries()].map(([membreId, role]) => ({ departementId: dep.id, membreId, role })),
        });
      }
    });
    revalOrg();
    return { success: true, message: "Membres affectés.", fieldErrors: {} };
  } catch (e) {
    return srvErr("affecterMembresDepartement", e);
  }
}
