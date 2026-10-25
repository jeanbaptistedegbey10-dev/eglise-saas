/**
 * Server Actions — Tâches d'événement (module Cultes & Événements).
 *
 * - créer une tâche rattachée à un événement,
 * - changer son statut (Démarrer → EN_COURS / Clôturer → CLOTUREE / Rouvrir),
 * - l'assigner à un membre (Sonorisation, Accueil, Prédication…).
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { exigerAccesChemin } from "@/lib/garde-actions";
import type { CulteFormState } from "@/types/culte";

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

const remarqueSchema = z.object({
  tacheId: identifiantSchema,
  remarque: z.string().trim().max(1000, "La remarque ne peut pas dépasser 1000 caractères.").nullish(),
});

const typeTacheSchema = z.object({
  libelle: z.string().trim().min(2, "Le libellé doit contenir au moins 2 caractères.").max(80, "Le libellé ne peut pas dépasser 80 caractères."),
  couleur: z.string().trim().optional(),
  estParDefaut: z.boolean().optional(),
});

const tacheSchema = z.object({
  culteId: identifiantSchema,
  titre: z
    .string()
    .trim()
    .min(2, "Le titre doit contenir au moins 2 caractères.")
    .max(120, "Le titre ne peut pas dépasser 120 caractères."),
  description: z.string().trim().max(500, "Description trop longue (500 max).").nullish(),
  responsableMembreId: identifiantSchema.nullish(),
  typeTacheId: identifiantSchema.nullish(),
});

const statutSchema = z.object({
  tacheId: identifiantSchema,
  statut: z.enum(["A_FAIRE", "EN_COURS", "CLOTUREE"], {
    message: "Statut invalide.",
  }),
});

function lireTexte(valeur: FormDataEntryValue | null): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function echec(message: string): CulteFormState {
  return { success: false, message, fieldErrors: { _form: [message] } };
}

function revalider(): void {
  revalidatePath("/cultes");
  revalidatePath("/dashboard");
}

/** Accès tolérant si la migration TacheEvenement n'est pas encore appliquée. */
function db(): any {
  return prisma as any;
}

/** Crée une tâche pour un événement, avec responsable optionnel, type et équipe. */
export async function creerTacheEvenement(
  _etat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) return echec(garde.message);
  const brut = {
    culteId: lireTexte(formData.get("culteId")),
    titre: lireTexte(formData.get("titre")),
    description: lireTexte(formData.get("description")) || undefined,
    responsableMembreId: lireTexte(formData.get("responsableMembreId")) || undefined,
    typeTacheId: lireTexte(formData.get("typeTacheId")) || undefined,
    membresEquipe: formData.getAll("membresEquipe").filter((v): v is string => typeof v === "string" && v.length > 0),
  };
  const analyse = tacheSchema.safeParse(brut);
  if (!analyse.success) {
    return { success: false, message: "Tâche invalide.", fieldErrors: {} };
  }
  try {
    await db().tacheEvenement.create({
      data: {
        culteId: analyse.data.culteId,
        titre: analyse.data.titre,
        description: analyse.data.description ?? null,
        responsableMembreId: analyse.data.responsableMembreId ?? null,
        typeTacheId: analyse.data.typeTacheId ?? null,
        membresEquipe: analyse.data.membresEquipe ?? [],
        statut: "A_FAIRE",
      },
    });
    revalider();
    return { success: true, message: "Tâche créée.", fieldErrors: {} };
  } catch (e) {
    console.error("creerTacheEvenement :", e);
    return echec("Création impossible. Appliquez la migration Prisma (TacheEvenement).");
  }
}

/** Change le statut d'une tâche (Démarrer / Clôturer / Rouvrir). */
export async function changerStatutTache(
  _etat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) return echec(garde.message);
  const analyse = statutSchema.safeParse({
    tacheId: lireTexte(formData.get("tacheId")),
    statut: lireTexte(formData.get("statut")),
  });
  if (!analyse.success) return echec("Statut invalide.");
  try {
    await db().tacheEvenement.update({
      where: { id: analyse.data.tacheId },
      data: { statut: analyse.data.statut },
    });
    revalider();
    const lib =
      analyse.data.statut === "CLOTUREE"
        ? "clôturée"
        : analyse.data.statut === "EN_COURS"
          ? "démarrée"
          : "rouverte";
    return { success: true, message: `Tâche ${lib}.`, fieldErrors: {} };
  } catch (e) {
    console.error("changerStatutTache :", e);
    return echec("Mise à jour impossible.");
  }
}

/** Assigne (ou réassigne) une tâche à un membre. */
export async function assignerTacheEvenement(
  _etat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) return echec(garde.message);
  const analyse = z
    .object({ tacheId: identifiantSchema, responsableMembreId: identifiantSchema.nullish() })
    .safeParse({
      tacheId: lireTexte(formData.get("tacheId")),
      responsableMembreId: lireTexte(formData.get("responsableMembreId")) || undefined,
    });
  if (!analyse.success) return echec("Assignation invalide.");
  try {
    await db().tacheEvenement.update({
      where: { id: analyse.data.tacheId },
      data: { responsableMembreId: analyse.data.responsableMembreId ?? null },
    });
    revalider();
    return { success: true, message: "Responsable assigné.", fieldErrors: {} };
  } catch (e) {
    console.error("assignerTacheEvenement :", e);
    return echec("Assignation impossible.");
  }
}

/** Met à jour le libellé / la remarque d'une tâche. */
export async function mettreAJourRemarqueTache(
  _etat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) return echec(garde.message);
  const analyse = remarqueSchema.safeParse({
    tacheId: lireTexte(formData.get("tacheId")),
    remarque: lireTexte(formData.get("remarque")) || undefined,
  });
  if (!analyse.success) return echec("Remarque invalide.");
  try {
    await db().tacheEvenement.update({
      where: { id: analyse.data.tacheId },
      data: { description: analyse.data.remarque ?? null },
    });
    revalider();
    return { success: true, message: "Remarque enregistrée.", fieldErrors: {} };
  } catch (e) {
    console.error("mettreAJourRemarqueTache :", e);
    return echec("Enregistrement impossible.");
  }
}

/** Supprime une tâche d'événement. */
export async function supprimerTacheEvenement(
  _etat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) return echec(garde.message);
  const tacheId = lireTexte(formData.get("tacheId"));
  if (!tacheId) return echec("Identifiant manquant.");
  try {
    await db().tacheEvenement.delete({ where: { id: tacheId } });
    revalider();
    return { success: true, message: "Tâche supprimée.", fieldErrors: {} };
  } catch (e) {
    console.error("supprimerTacheEvenement :", e);
    return echec("Suppression impossible.");
  }
}

/** Liste tous les types de tâches configurés. */
export async function listerTypesTache(): Promise<TypeTacheResume[]> {
  try {
    const rows = await db().typeTache.findMany({
      orderBy: [{ estParDefaut: "desc" }, { libelle: "asc" }],
      select: { id: true, libelle: true, couleur: true, estParDefaut: true },
    });
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      libelle: r.libelle,
      couleur: r.couleur ?? null,
      estParDefaut: r.estParDefaut,
    }));
  } catch (e) {
    console.error("listerTypesTache :", e);
    return [];
  }
}

/** Crée un nouveau type de tâche. */
export async function creerTypeTache(
  _etat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) return echec(garde.message);
  const analyse = typeTacheSchema.safeParse({
    libelle: lireTexte(formData.get("libelle")),
    couleur: lireTexte(formData.get("couleur")) || undefined,
    estParDefaut: formData.get("estParDefaut") === "true",
  });
  if (!analyse.success) return echec("Type de tâche invalide.");
  try {
    await db().typeTache.create({
      data: {
        libelle: analyse.data.libelle,
        couleur: analyse.data.couleur ?? null,
        estParDefaut: analyse.data.estParDefaut ?? false,
      },
    });
    revalider();
    return { success: true, message: "Type de tâche créé.", fieldErrors: {} };
  } catch (e) {
    console.error("creerTypeTache :", e);
    return echec("Création impossible du type de tâche.");
  }
}

/** Supprime un type de tâche (seulement s'il n'est pas utilisé par une tâche). */
export async function supprimerTypeTache(
  _etat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) return echec(garde.message);
  const typeTacheId = lireTexte(formData.get("typeTacheId"));
  if (!typeTacheId) return echec("Identifiant manquant.");
  try {
    await db().typeTache.delete({ where: { id: typeTacheId } });
    revalider();
    return { success: true, message: "Type de tâche supprimé.", fieldErrors: {} };
  } catch (e) {
    console.error("supprimerTypeTache :", e);
    return echec("Suppression impossible (type encore utilisé ?).");
  }
}

/** Met à jour le type et l'équipe d'une tâche existante. */
export async function mettreAJourTacheEvenement(
  _etat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) return echec(garde.message);
  const tacheId = lireTexte(formData.get("tacheId"));
  if (!tacheId) return echec("Identifiant de tâche manquant.");
  const typeTacheId = lireTexte(formData.get("typeTacheId")) || undefined;
  const membresEquipe = formData.getAll("membresEquipe").filter((v): v is string => typeof v === "string" && v.length > 0);
  try {
    await db().tacheEvenement.update({
      where: { id: tacheId },
      data: {
        typeTacheId: typeTacheId ?? null,
        membresEquipe: membresEquipe,
      },
    });
    revalider();
    return { success: true, message: "Tâche mise à jour.", fieldErrors: {} };
  } catch (e) {
    console.error("mettreAJourTacheEvenement :", e);
    return echec("Mise à jour impossible.");
  }
}
