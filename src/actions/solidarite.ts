"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { exigerAccesChemin } from "@/lib/garde-actions";
import type { SolidariteFormState } from "@/types/solidarite";

// ---------------------------------------------------------------------------
// Schémas Zod
// ---------------------------------------------------------------------------

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dateSchema = z
  .string()
  .trim()
  .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
  .refine((valeur) => !Number.isNaN(Date.parse(valeur)), "Date invalide.");

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

const aideSchema = z.object({
  id: identifiantSchema.optional(),
  /** Membre bénéficiaire — vide = aide externe / anonyme. */
  beneficiaireMembreId: identifiantSchema.nullish(),
  montantOuNature: z
    .string()
    .trim()
    .min(2, "Précisez le montant ou la nature (2 caractères minimum).")
    .max(200, "Le montant ou la nature ne peut pas dépasser 200 caractères."),
  motif: z
    .string()
    .trim()
    .min(2, "Le motif doit contenir au moins 2 caractères.")
    .max(200, "Le motif ne peut pas dépasser 200 caractères."),
  dateDistribution: dateSchema.nullish(),
  notesConflictuelles: z
    .string()
    .trim()
    .max(500, "Les notes ne peuvent pas dépasser 500 caractères.")
    .nullish(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lireTexte(valeur: FormDataEntryValue | null): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function lireTexteOptionnel(valeur: FormDataEntryValue | null): string | null {
  const texte = lireTexte(valeur);
  return texte === "" ? null : texte;
}

function versFieldErrors(erreur: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of erreur.issues) {
    const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (fieldErrors[cle] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function echecValidation(erreur: z.ZodError): SolidariteFormState {
  return {
    success: false,
    message: "Le formulaire contient des erreurs. Vérifiez les champs signalés.",
    fieldErrors: versFieldErrors(erreur),
  };
}

function erreurServeur(contexte: string, erreur: unknown): SolidariteFormState {
  console.error(`Erreur serveur (${contexte}) :`, erreur);
  return {
    success: false,
    message: "Une erreur est survenue. Vérifiez la connexion à la base.",
    fieldErrors: { _form: ["Erreur serveur lors de l'enregistrement."] },
  };
}

function revaliderSolidarite(membreId: string | null): void {
  revalidatePath("/solidarite");
  if (membreId) revalidatePath(`/membres/${membreId}`);
  revalidatePath("/membres");
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/** Enregistre une aide (membre optionnel, montant ou nature, motif, date). */
export async function enregistrerAide(
  _precedentEtat: SolidariteFormState,
  formData: FormData,
): Promise<SolidariteFormState> {
  const garde = await exigerAccesChemin("/solidarite");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const beneficiaireBrut = lireTexte(formData.get("beneficiaireMembreId"));
  const dateBrute = lireTexte(formData.get("dateDistribution"));
  const analyse = aideSchema.safeParse({
    id: lireTexte(formData.get("id")) || undefined,
    beneficiaireMembreId: beneficiaireBrut === "" ? null : beneficiaireBrut,
    montantOuNature: lireTexte(formData.get("montantOuNature")),
    motif: lireTexte(formData.get("motif")),
    dateDistribution: dateBrute === "" ? null : dateBrute,
    notesConflictuelles: lireTexteOptionnel(formData.get("notesConflictuelles")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { id, beneficiaireMembreId, ...champs } = analyse.data;

  try {
    if (beneficiaireMembreId) {
      const membre = await prisma.membre.findUnique({
        where: { id: beneficiaireMembreId },
        select: { id: true },
      });
      if (!membre) {
        return {
          success: false,
          message: "Le membre bénéficiaire sélectionné n'existe pas.",
          fieldErrors: {
            beneficiaireMembreId: ["Membre introuvable. Actualisez la page."],
          },
        };
      }
    }

    const dateDistribution = champs.dateDistribution
      ? new Date(`${champs.dateDistribution}T12:00:00`)
      : undefined;

    if (id) {
      const aide = await prisma.aideDistribution.update({
        where: { id },
        data: {
          beneficiaireMembreId,
          montantOuNature: champs.montantOuNature,
          motif: champs.motif,
          ...(dateDistribution ? { dateDistribution } : {}),
          notesConflictuelles: champs.notesConflictuelles,
        },
      });
      revaliderSolidarite(aide.beneficiaireMembreId);
      return { success: true, message: "L'aide a été mise à jour.", fieldErrors: {} };
    }

    const aide = await prisma.aideDistribution.create({
      data: {
        beneficiaireMembreId,
        montantOuNature: champs.montantOuNature,
        motif: champs.motif,
        ...(dateDistribution ? { dateDistribution } : {}),
        notesConflictuelles: champs.notesConflictuelles,
      },
    });
    revaliderSolidarite(aide.beneficiaireMembreId);
    return {
      success: true,
      message: "L'aide a été enregistrée dans le suivi confidentiel.",
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("enregistrerAide", erreur);
  }
}

/** Supprime une aide du suivi confidentiel (action réservée). */
export async function supprimerAide(
  _precedentEtat: SolidariteFormState,
  formData: FormData,
): Promise<SolidariteFormState> {
  const garde = await exigerAccesChemin("/solidarite");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = z.object({ aideId: identifiantSchema }).safeParse({
    aideId: lireTexte(formData.get("aideId")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  try {
    const aide = await prisma.aideDistribution.delete({
      where: { id: analyse.data.aideId },
    });
    revaliderSolidarite(aide.beneficiaireMembreId);
    return { success: true, message: "L'aide a été supprimée.", fieldErrors: {} };
  } catch (erreur) {
    return erreurServeur("supprimerAide", erreur);
  }
}
