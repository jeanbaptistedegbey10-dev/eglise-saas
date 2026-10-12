"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { CulteFormState } from "@/types/culte";

// ---------------------------------------------------------------------------
// Schémas Zod
// ---------------------------------------------------------------------------

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Montant de quête : 0 accepté (culte sans quête), 2 décimales max. */
const montantQueteSchema = z
  .string()
  .trim()
  .regex(
    /^\d+([.,]\d{1,2})?$/,
    "Montant invalide : chiffres uniquement, 2 décimales max (ex. 25000).",
  )
  .transform((valeur) => Number(valeur.replace(",", ".")))
  .refine(
    (valeur) => valeur >= 0 && valeur <= 1_000_000_000,
    "Le montant doit être compris entre 0 et 1 000 000 000.",
  );

const dateSchema = z
  .string()
  .trim()
  .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
  .refine((valeur) => !Number.isNaN(Date.parse(valeur)), "Date invalide.");

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

const culteSchema = z.object({
  id: identifiantSchema.optional(),
  date: dateSchema,
  intitule: z
    .string()
    .trim()
    .min(2, "L'intitulé doit contenir au moins 2 caractères.")
    .max(120, "L'intitulé ne peut pas dépasser 120 caractères."),
  totalQueteAnonyme: montantQueteSchema.nullish(),
});

const queteRapideSchema = z.object({
  culteId: identifiantSchema,
  montant: montantQueteSchema,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lireTexte(valeur: FormDataEntryValue | null): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function versFieldErrors(erreur: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of erreur.issues) {
    const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (fieldErrors[cle] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function echecValidation(erreur: z.ZodError): CulteFormState {
  return {
    success: false,
    message: "Le formulaire contient des erreurs. Vérifiez les champs signalés.",
    fieldErrors: versFieldErrors(erreur),
  };
}

/** Midi locale : évite le décalage d'un jour lié au fuseau UTC. */
function resoudreDate(valeur: string): Date {
  return new Date(`${valeur}T12:00:00`);
}

function erreurServeur(contexte: string, erreur: unknown): CulteFormState {
  console.error(`Erreur serveur (${contexte}) :`, erreur);
  return {
    success: false,
    message: "Une erreur est survenue. Vérifiez la connexion à la base.",
    fieldErrors: { _form: ["Erreur serveur lors de l'enregistrement."] },
  };
}

function revaliderCultes(): void {
  revalidatePath("/cultes");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/** Crée ou met à jour un culte (date unique, intitulé, quête initiale). */
export async function enregistrerCulte(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const totalBrut = lireTexte(formData.get("totalQueteAnonyme"));
  const analyse = culteSchema.safeParse({
    id: lireTexte(formData.get("id")) || undefined,
    date: lireTexte(formData.get("date")),
    intitule: lireTexte(formData.get("intitule")),
    totalQueteAnonyme: totalBrut === "" ? undefined : totalBrut,
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { id, date, intitule, totalQueteAnonyme } = analyse.data;
  const dateCulte = resoudreDate(date);
  const queteInitiale = totalQueteAnonyme ?? undefined;

  try {
    if (id) {
      await prisma.culte.update({
        where: { id },
        data: {
          date: dateCulte,
          intitule,
          ...(queteInitiale !== undefined ? { totalQueteAnonyme: queteInitiale } : {}),
        },
      });
    } else {
      await prisma.culte.create({
        data: {
          date: dateCulte,
          intitule,
          totalQueteAnonyme: totalQueteAnonyme ?? 0,
        },
      });
    }
    revaliderCultes();
    return {
      success: true,
      message: id ? "Le culte a été mis à jour." : "Le culte a été planifié.",
      fieldErrors: {},
    };
  } catch (erreur) {
    if (
      typeof erreur === "object" &&
      erreur !== null &&
      (erreur as { code?: unknown }).code === "P2002"
    ) {
      return {
        success: false,
        message: "Un culte est déjà planifié à cette date.",
        fieldErrors: { date: ["Un culte existe déjà à cette date."] },
      };
    }
    return erreurServeur("enregistrerCulte", erreur);
  }
}

/** Saisie rapide : remplace le total de la quête anonyme d'un culte. */
export async function enregistrerQueteCulte(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const analyse = queteRapideSchema.safeParse({
    culteId: lireTexte(formData.get("culteId")),
    montant: lireTexte(formData.get("montant")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  try {
    await prisma.culte.update({
      where: { id: analyse.data.culteId },
      data: { totalQueteAnonyme: analyse.data.montant },
    });
    revaliderCultes();
    return {
      success: true,
      message: "Le montant de la quête a été enregistré.",
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("enregistrerQueteCulte", erreur);
  }
}

/** Supprime un culte planifié (la quête associée disparaît avec lui). */
export async function supprimerCulte(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const analyse = z.object({ culteId: identifiantSchema }).safeParse({
    culteId: lireTexte(formData.get("culteId")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  try {
    await prisma.culte.delete({ where: { id: analyse.data.culteId } });
    revaliderCultes();
    return { success: true, message: "Le culte a été supprimé.", fieldErrors: {} };
  } catch (erreur) {
    return erreurServeur("supprimerCulte", erreur);
  }
}
