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

const tacheSchema = z.object({
  culteId: identifiantSchema,
  titre: z
    .string()
    .trim()
    .min(2, "Le titre doit contenir au moins 2 caractères.")
    .max(120, "Le titre ne peut pas dépasser 120 caractères."),
  description: z.string().trim().max(500, "Description trop longue (500 max).").nullish(),
  responsableMembreId: identifiantSchema.nullish(),
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

/** Crée une tâche pour un événement, avec responsable optionnel. */
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
