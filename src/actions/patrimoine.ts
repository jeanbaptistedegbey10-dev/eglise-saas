"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { consignerAudit } from "@/lib/audit";
import { exigerAccesChemin } from "@/lib/garde-actions";

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

const categorieSchema = z.enum(["SONORISATION", "INSTRUMENT", "MOBILIER", "INFORMATIQUE", "IMMOBILIER", "AUTRE"]);
const etatSchema = z.enum(["NEUF", "BON_ETAT", "USAGE", "EN_PANNE", "HORS_SERVICE"]);

const bienSchema = z.object({
  id: identifiantSchema.optional(),
  designation: z.string().trim().min(2, "La designation doit contenir au moins 2 caracteres.").max(120),
  categorie: categorieSchema.default("MOBILIER"),
  quantite: z.coerce.number().int("La quantite doit etre un entier.").min(1, "La quantite doit etre superieure a 0.").max(100000),
  etat: etatSchema.default("BON_ETAT"),
  valeurEstimee: z.preprocess(
    (v) => (v === null || v === undefined || v === "" ? null : Number(v)),
    z.number().min(0, "La valeur estimee doit etre positive.").max(1_000_000_000).nullable(),
  ),
  lieuStockage: z.string().trim().max(120).nullish(),
  dateAcquisition: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().datetime({ message: "Date d'acquisition invalide." }).nullable(),
  ),
  remarques: z.string().trim().max(500).nullish(),
});

function echec(message: string, champ = "_form") {
  return { success: false, message, fieldErrors: { [champ]: [message] } };
}

function erreurServeur(contexte: string, erreur: unknown) {
  console.error(`Erreur serveur (${contexte}) :`, erreur);
  return { success: false, message: "Une erreur est survenue. Reessayez.", fieldErrors: { _form: ["Erreur serveur."] } };
}

export async function enregistrerBien(
  entree: FormData | {
    id?: string | null;
    designation: string;
    categorie?: string;
    quantite?: number;
    etat?: string;
    valeurEstimee?: number | null;
    lieuStockage?: string | null;
    dateAcquisition?: string | null;
    remarques?: string | null;
  },
): Promise<{ success: boolean; message: string; fieldErrors: Record<string, string[]>; id?: string }> {
  const garde = await exigerAccesChemin("/patrimoine");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const brut =
    entree instanceof FormData
      ? {
          id: String(entree.get("id") ?? "").trim() || undefined,
          designation: String(entree.get("designation") ?? "").trim(),
          categorie: String(entree.get("categorie") ?? "MOBILIER").trim(),
          quantite: entree.get("quantite"),
          etat: String(entree.get("etat") ?? "BON_ETAT").trim(),
          valeurEstimee: entree.get("valeurEstimee"),
          lieuStockage: String(entree.get("lieuStockage") ?? "").trim() || undefined,
          dateAcquisition: String(entree.get("dateAcquisition") ?? "").trim() || undefined,
          remarques: String(entree.get("remarques") ?? "").trim() || undefined,
        }
      : entree;

  const analyse = bienSchema.safeParse(brut);
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return { success: false, message: "Le formulaire contient des erreurs.", fieldErrors };
  }

  const donnees = analyse.data;
  const estCreation = !donnees.id;

  try {
    let bien;
    if (estCreation) {
      bien = await prisma.bienPatrimoine.create({
        data: {
          designation: donnees.designation,
          categorie: donnees.categorie,
          quantite: donnees.quantite,
          etat: donnees.etat,
          valeurEstimee: donnees.valeurEstimee,
          lieuStockage: donnees.lieuStockage,
          dateAcquisition: donnees.dateAcquisition ? new Date(donnees.dateAcquisition) : null,
          remarques: donnees.remarques,
        },
      });
      await consignerAudit({
        action: "CREATION",
        entite: "BienPatrimoine",
        entiteId: bien.id,
        details: `Creation du bien « ${bien.designation} » (categorie ${bien.categorie}, quantite ${bien.quantite}).`,
      });
    } else {
      const existant = await prisma.bienPatrimoine.findUnique({ where: { id: donnees.id } });
      if (!existant) {
        return echec("Bien introuvable.", "id");
      }
      bien = await prisma.bienPatrimoine.update({
        where: { id: donnees.id },
        data: {
          designation: donnees.designation,
          categorie: donnees.categorie,
          quantite: donnees.quantite,
          etat: donnees.etat,
          valeurEstimee: donnees.valeurEstimee,
          lieuStockage: donnees.lieuStockage,
          dateAcquisition: donnees.dateAcquisition ? new Date(donnees.dateAcquisition) : null,
          remarques: donnees.remarques,
        },
      });
      await consignerAudit({
        action: "MODIFICATION",
        entite: "BienPatrimoine",
        entiteId: bien.id,
        details: `Modification du bien « ${bien.designation} » (categorie ${bien.categorie}, etat ${bien.etat}).`,
      });
    }

    revalidatePath("/patrimoine");
    return {
      success: true,
      message: estCreation
        ? `Le bien « ${bien.designation} » a ete enregistre.`
        : `Le bien « ${bien.designation} » a ete mis a jour.`,
      fieldErrors: {},
      id: bien.id,
    };
  } catch (erreur) {
    return erreurServeur("enregistrerBien", erreur);
  }
}

export async function supprimerBien(id: string): Promise<{ success: boolean; message: string; fieldErrors: Record<string, string[]> }> {
  const garde = await exigerAccesChemin("/patrimoine");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = identifiantSchema.safeParse(id);
  if (!analyse.success) return echec("Identifiant de bien invalide.", "id");

  try {
    const bien = await prisma.bienPatrimoine.findUnique({ where: { id } });
    if (!bien) return echec("Bien introuvable.");

    await prisma.bienPatrimoine.delete({ where: { id } });
    await consignerAudit({
      action: "SUPPRESSION",
      entite: "BienPatrimoine",
      entiteId: id,
      details: `Suppression du bien « ${bien.designation} » (categorie ${bien.categorie}).`,
    });

    revalidatePath("/patrimoine");
    return { success: true, message: `Le bien « ${bien.designation} » a ete supprime.`, fieldErrors: {} };
  } catch (erreur) {
    return erreurServeur("supprimerBien", erreur);
  }
}

export async function changerEtatBien(id: string, nouvelEtat: string): Promise<{ success: boolean; message: string; fieldErrors: Record<string, string[]> }> {
  const garde = await exigerAccesChemin("/patrimoine");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const idOk = identifiantSchema.safeParse(id);
  if (!idOk.success) return echec("Identifiant de bien invalide.", "id");
  const etatOk = etatSchema.safeParse(nouvelEtat);
  if (!etatOk.success) return echec("Etat invalide.", "etat");

  try {
    const bien = await prisma.bienPatrimoine.findUnique({ where: { id } });
    if (!bien) return echec("Bien introuvable.");

    await prisma.bienPatrimoine.update({
      where: { id },
      data: { etat: etatOk.data },
    });
    await consignerAudit({
      action: "MODIFICATION",
      entite: "BienPatrimoine",
      entiteId: id,
      details: `Etat du bien « ${bien.designation} » passe de ${bien.etat} a ${etatOk.data}.`,
    });

    revalidatePath("/patrimoine");
    return {
      success: true,
      message: `L'etat du bien « ${bien.designation} » est maintenant ${etatOk.data}.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("changerEtatBien", erreur);
  }
}
