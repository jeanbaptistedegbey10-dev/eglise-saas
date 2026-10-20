"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { consignerAudit } from "@/lib/audit";
import { exigerTresorierOuAdmin } from "@/lib/garde-actions";
import type { FinancesFormState } from "@/types/finance";

// ---------------------------------------------------------------------------
// Schémas Zod
// ---------------------------------------------------------------------------

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

/** Mois d'exercice : entier de 1 (janvier) à 12 (décembre). */
const moisSchema = z.coerce
  .number({ message: "Le mois doit être un nombre entre 1 et 12." })
  .int("Le mois doit être un entier.")
  .min(1, "Le mois va de 1 (janvier) à 12 (décembre).")
  .max(12, "Le mois va de 1 (janvier) à 12 (décembre).");

/** Exercice : année plausible, libellé court et période (mois début / fin). */
const exerciceSchema = z.object({
  annee: z.coerce
    .number({ message: "L'année doit être un nombre." })
    .int("L'année doit être un entier.")
    .min(2000, "L'année doit être supérieure ou égale à 2000.")
    .max(2100, "L'année doit être inférieure ou égale à 2100."),
  libelle: z
    .string()
    .trim()
    .min(2, "Le libellé doit contenir au moins 2 caractères.")
    .max(80, "Le libellé ne peut pas dépasser 80 caractères."),
  moisDebut: moisSchema,
  moisFin: moisSchema,
  reprendreSoldes: z.boolean().default(true),
});

/** Suppression d'un exercice : confirmation explicite attendue. */
const suppressionSchema = z.object({
  exerciceId: identifiantSchema,
  confirmation: z
    .string()
    .trim()
    .refine((valeur) => valeur.toUpperCase() === "SUPPRIMER", {
      message: "Tapez « SUPPRIMER » pour confirmer.",
    }),
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

function echecValidation(erreur: z.ZodError): FinancesFormState {
  return {
    success: false,
    message: "Le formulaire contient des erreurs. Vérifiez les champs signalés.",
    fieldErrors: versFieldErrors(erreur),
  };
}

function estConflitUnicite(erreur: unknown): boolean {
  return (
    typeof erreur === "object" &&
    erreur !== null &&
    (erreur as { code?: unknown }).code === "P2002"
  );
}

function erreurServeur(contexte: string, erreur: unknown): FinancesFormState {
  console.error(`Erreur serveur (${contexte}) :`, erreur);
  return {
    success: false,
    message:
      "Une erreur est survenue. Vérifiez la connexion à la base de données puis réessayez.",
    fieldErrors: { _form: ["Erreur serveur."] },
  };
}

/** Passe en revue les pages financières après une mutation d'exercice. */
function revaliderFinances(): void {
  revalidatePath("/finances");
  revalidatePath("/finances/cotisations");
  revalidatePath("/finances/baremes");
  revalidatePath("/finances/saisie-rapide");
  revalidatePath("/rapports");
}

/**
 * Clôture simple d'un exercice : passe `cloture: true`.
 * Sécurisée : vérifie l'existence avant mise à jour.
 */
export async function cloturerExercice(
  exerciceId: string,
): Promise<FinancesFormState> {
  const id = exerciceId?.trim();
  if (!id) {
    return {
      success: false,
      message: "Identifiant d'exercice manquant.",
      fieldErrors: { _form: ["Identifiant manquant."] },
    };
  }
  try {
    const exercice = await prisma.exercice.findUnique({ where: { id } });
    if (!exercice) {
      return {
        success: false,
        message: "Exercice introuvable.",
        fieldErrors: { _form: ["Exercice introuvable."] },
      };
    }
    await prisma.exercice.update({ where: { id }, data: { cloture: true } });
    await consignerAudit({
      action: "CLOTURE",
      entite: "Exercice",
      entiteId: id,
      details: `L'exercice « ${exercice.libelle} » a été clôturé (lecture seule).`,
    });
    revalidatePath("/rapports");
    revalidatePath("/finances");
    revalidatePath("/finances/cotisations");
    return {
      success: true,
      message: `L'exercice ${exercice.libelle} est clôturé (lecture seule).`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("cloturerExercice", erreur);
  }
}

/**
 * Réouverture d'un exercice clôturé : passe `cloture: false`
 * pour déverrouiller la saisie.
 */
export async function rouvrirExercice(
  exerciceId: string,
): Promise<FinancesFormState> {
  const id = exerciceId?.trim();
  if (!id) {
    return {
      success: false,
      message: "Identifiant d'exercice manquant.",
      fieldErrors: { _form: ["Identifiant manquant."] },
    };
  }
  try {
    const exercice = await prisma.exercice.findUnique({ where: { id } });
    if (!exercice) {
      return {
        success: false,
        message: "Exercice introuvable.",
        fieldErrors: { _form: ["Exercice introuvable."] },
      };
    }
    await prisma.exercice.update({ where: { id }, data: { cloture: false } });
    await consignerAudit({
      action: "ROUVERTURE",
      entite: "Exercice",
      entiteId: id,
      details: `L'exercice « ${exercice.libelle} » a été rouvert : la saisie est à nouveau possible.`,
    });
    revalidatePath("/rapports");
    revalidatePath("/finances");
    revalidatePath("/finances/cotisations");
    return {
      success: true,
      message: `L'exercice ${exercice.libelle} est rouvert : la saisie est à nouveau possible.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("rouvrirExercice", erreur);
  }
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Crée un exercice comptable : libellé (ex. « 2026 »), année unique, et
 * période comptable (mois de début / mois de fin de 1 à 12).
 */
export async function enregistrerExercice(
  _precedentEtat: FinancesFormState,
  formData: FormData,
): Promise<FinancesFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const brutReprendre = formData.get("reprendreSoldes");
  const analyse = exerciceSchema.safeParse({
    annee: lireTexte(formData.get("annee")),
    libelle: lireTexte(formData.get("libelle")),
    moisDebut: lireTexte(formData.get("moisDebut")),
    moisFin: lireTexte(formData.get("moisFin")),
    reprendreSoldes:
      brutReprendre === null
        ? true
        : brutReprendre === "on" || brutReprendre === "true" || brutReprendre === "1",
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const donnees = analyse.data;

  try {
    await prisma.exercice.create({
      data: {
        annee: donnees.annee,
        libelle: donnees.libelle,
        moisDebut: donnees.moisDebut,
        moisFin: donnees.moisFin,
      },
    });
    // Report des soldes : la continuité est assurée dans le modèle `Caisse`
    // (global, sans exerciceId) en alignant `soldeInitial` sur `soldeActuel`
    // de clôture, si la case est cochée (activée par défaut).
    if (donnees.reprendreSoldes) {
      const caisses = await prisma.caisse.findMany({
        select: { id: true, soldeActuel: true },
      });
      await Promise.all(
        caisses.map((caisse) =>
          prisma.caisse
            .update({
              where: { id: caisse.id },
              data: { soldeInitial: caisse.soldeActuel },
            })
            .catch(() => null),
        ),
      );
    }
    revaliderFinances();
    return {
      success: true,
      message: `L'exercice ${donnees.libelle} a été créé (mois ${donnees.moisDebut} → ${donnees.moisFin}).`,
      fieldErrors: {},
    };
  } catch (erreur) {
    if (estConflitUnicite(erreur)) {
      return {
        success: false,
        message: `Un exercice existe déjà pour l'année ${donnees.annee}.`,
        fieldErrors: { annee: ["Cette année est déjà utilisée."] },
      };
    }
    return erreurServeur("enregistrerExercice", erreur);
  }
}

/**
 * Supprime définitivement un exercice et nettoie en cascade toutes ses
 * données rattachées : paiements, paliers de barèmes, cotisations (et leurs
 * barèmes / versements internes).
 *
 * La suppression est protégée : l'utilisateur doit taper « SUPPRIMER » et
 * toute l'opération se déroule dans une seule transaction atomique.
 */
export async function supprimerExercice(
  _precedentEtat: FinancesFormState,
  formData: FormData,
): Promise<FinancesFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = suppressionSchema.safeParse({
    exerciceId: lireTexte(formData.get("exerciceId")),
    confirmation: lireTexte(formData.get("confirmation")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { exerciceId } = analyse.data;

  try {
    const exercice = await prisma.exercice.findUnique({ where: { id: exerciceId } });
    if (!exercice) {
      return {
        success: false,
        message: "Exercice introuvable.",
        fieldErrors: { _form: ["Exercice introuvable."] },
      };
    }

    await prisma.$transaction(async (transaction) => {
      // Ordre des suppressions : d'abord ce qui dépend d'entités conservées
      // (paiements → catégorie en Restrict), puis les paliers, puis les
      // cotisations (cascade interne : barèmes + versements), enfin l'exercice.
      await transaction.paiement.deleteMany({ where: { exerciceId } });
      await transaction.paliereBareme.deleteMany({ where: { exerciceId } });
      await transaction.cotisation.deleteMany({ where: { exerciceId } });
      await transaction.exercice.delete({ where: { id: exerciceId } });
    });

    revaliderFinances();
    return {
      success: true,
      message: `L'exercice ${exercice.libelle} et toutes ses données associées ont été supprimés.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("supprimerExercice", erreur);
  }
}
