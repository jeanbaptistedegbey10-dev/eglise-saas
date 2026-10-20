"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { exigerTresorierOuAdmin } from "@/lib/garde-actions";
import type { ClotureFormState, StatistiquesExercice } from "@/types/rapport";

// ---------------------------------------------------------------------------
// Schémas Zod — Clôture d'exercice
// ---------------------------------------------------------------------------

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

const clotureSchema = z.object({
  exerciceId: identifiantSchema,
  confirmation: z
    .string()
    .trim()
    .refine((valeur) => valeur.toUpperCase() === "CLOTURER", {
      message: 'Tapez « CLOTURER » pour confirmer.',
    }),
  creerSuivant: z.boolean(),
  recopierBaremes: z.boolean(),
  anneeSuivante: z.coerce
    .number({ message: "L'année doit être un nombre." })
    .int("L'année doit être un entier.")
    .min(2000, "L'année doit être supérieure ou égale à 2000.")
    .max(2100, "L'année doit être inférieure ou égale à 2100.")
    .nullish(),
  libelleSuivant: z
    .string()
    .trim()
    .max(80, "Le libellé ne peut pas dépasser 80 caractères.")
    .nullish(),
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

function estConflitUnicite(erreur: unknown): boolean {
  return (
    typeof erreur === "object" &&
    erreur !== null &&
    (erreur as { code?: unknown }).code === "P2002"
  );
}

/**
 * Extrait les statistiques d'un exercice, éventuellement restreintes à un
 * type de cotisation : totaux, nombre de versements, contributeurs distincts,
 * part anonyme et ventilation par type de cotisation.
 */
export async function extraireStatistiquesExercice(
  exerciceId: string,
  typeCotisationId?: string,
): Promise<StatistiquesExercice | null> {
  const exercice = await prisma.exercice.findUnique({
    where: { id: exerciceId },
  });
  if (!exercice) return null;

  const filtre = {
    exerciceId,
    ...(typeCotisationId ? { typeCotisationId } : {}),
  };

  const [paiements, parType, contributeurs] = await Promise.all([
    prisma.paiement.findMany({
      where: filtre,
      select: { montant: true, membreId: true },
    }),
    prisma.categorieCotisation.findMany({
      orderBy: { libelle: "asc" },
      select: {
        id: true,
        libelle: true,
        paiements: {
          where: { exerciceId },
          select: { montant: true },
        },
      },
    }),
    prisma.paiement.groupBy({
      by: ["membreId"],
      where: { ...filtre, membreId: { not: null } },
    }),
  ]);

  let totalGeneral = 0;
  let totalAnonyme = 0;
  for (const paiement of paiements) {
    const montant = Number(paiement.montant);
    totalGeneral += montant;
    if (paiement.membreId === null) totalAnonyme += montant;
  }

  return {
    exercice: {
      id: exercice.id,
      annee: exercice.annee,
      libelle: exercice.libelle,
      moisDebut: exercice.moisDebut,
      moisFin: exercice.moisFin,
      cloture: exercice.cloture,
    },
    totalGeneral,
    nombrePaiements: paiements.length,
    nombreContributeurs: contributeurs.length,
    totalAnonyme,
    parType: parType.map((type) => ({
      typeId: type.id,
      libelle: type.libelle,
      total: type.paiements.reduce(
        (somme, paiement) => somme + Number(paiement.montant),
        0,
      ),
      nombrePaiements: type.paiements.length,
    })),
  };
}

/**
 * Clôture définitive d'un exercice comptable.
 *
 * Règles métier : passage à `cloture: true` (les Server Actions finances
 * refusent déjà tout versement ou barème sur un exercice clôturé),
 * abandon des impayés sans report de dette (le nouvel exercice repart de
 * zéro), et création optionnelle de l'exercice suivant (année + 1) avec
 * recopie des barèmes — le tout dans une seule transaction atomique.
 */
export async function cloturerExercice(
  _precedentEtat: ClotureFormState,
  formData: FormData,
): Promise<ClotureFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return {
      success: false,
      message: garde.message,
      fieldErrors: { _form: [garde.message] },
      exerciceSuivantId: null,
    };
  }
  const analyse = clotureSchema.safeParse({
    exerciceId: lireTexte(formData.get("exerciceId")),
    confirmation: lireTexte(formData.get("confirmation")),
    creerSuivant: formData.get("creerSuivant") === "on",
    recopierBaremes: formData.get("recopierBaremes") === "on",
    anneeSuivante: lireTexte(formData.get("anneeSuivante")) || null,
    libelleSuivant: lireTexte(formData.get("libelleSuivant")) || null,
  });

  if (!analyse.success) {
    return {
      success: false,
      message: "La clôture est incomplète. Vérifiez les champs signalés.",
      fieldErrors: versFieldErrors(analyse.error),
      exerciceSuivantId: null,
    };
  }

  const donnees = analyse.data;

  if (donnees.creerSuivant && !donnees.anneeSuivante) {
    return {
      success: false,
      message: "Indiquez l'année du nouvel exercice à créer.",
      fieldErrors: { anneeSuivante: ["L'année du nouvel exercice est obligatoire."] },
      exerciceSuivantId: null,
    };
  }

  try {
    const exercice = await prisma.exercice.findUnique({
      where: { id: donnees.exerciceId },
    });

    if (!exercice) {
      return {
        success: false,
        message: "Exercice introuvable.",
        fieldErrors: { _form: ["Exercice introuvable."] },
        exerciceSuivantId: null,
      };
    }
    if (exercice.cloture) {
      return {
        success: false,
        message: `L'exercice ${exercice.annee} est déjà clôturé.`,
        fieldErrors: { _form: ["Exercice déjà clôturé."] },
        exerciceSuivantId: null,
      };
    }

    let exerciceSuivantId: string | null = null;
    let classesRecopiees = 0;

    await prisma.$transaction(async (transaction) => {
      if (donnees.creerSuivant && donnees.anneeSuivante) {
        const libelle =
          donnees.libelleSuivant && donnees.libelleSuivant.length >= 2
            ? donnees.libelleSuivant
            : `Exercice ${donnees.anneeSuivante}`;

        const suivant = await transaction.exercice.create({
          data: { annee: donnees.anneeSuivante, libelle },
        });
        exerciceSuivantId = suivant.id;

        if (donnees.recopierBaremes) {
          const paliers = await transaction.paliereBareme.findMany({
            where: { exerciceId: exercice.id },
          });
          if (paliers.length > 0) {
            await transaction.paliereBareme.createMany({
              data: paliers.map((palier) => ({
                typeCotisationId: palier.typeCotisationId,
                libelleClasse: palier.libelleClasse,
                montant: palier.montant,
                exerciceId: suivant.id,
              })),
            });
            classesRecopiees = paliers.length;
          }
        }
      }

      await transaction.exercice.update({
        where: { id: exercice.id },
        data: { cloture: true },
      });
    });

    revalidatePath("/rapports");
    revalidatePath("/finances");
    revalidatePath("/finances/baremes");
    revalidatePath("/finances/saisie-rapide");

    return {
      success: true,
      message:
        `L'exercice ${exercice.annee} est clôturé : les impayés sont abandonnés, ` +
        `sans report sur l'exercice suivant.` +
        (exerciceSuivantId
          ? ` Nouvel exercice créé` +
            (classesRecopiees > 0
              ? ` (${classesRecopiees} classe${classesRecopiees > 1 ? "s" : ""} recopiée${classesRecopiees > 1 ? "s" : ""}).`
              : ".")
          : ""),
      fieldErrors: {},
      exerciceSuivantId,
    };
  } catch (erreur) {
    if (estConflitUnicite(erreur)) {
      return {
        success: false,
        message: `Un exercice existe déjà pour l'année ${donnees.anneeSuivante} : la clôture n'a pas été appliquée.`,
        fieldErrors: { anneeSuivante: ["Cette année est déjà utilisée."] },
        exerciceSuivantId: null,
      };
    }
    console.error("Erreur serveur (cloturerExercice) :", erreur);
    return {
      success: false,
      message: "Une erreur est survenue lors de la clôture. Vérifiez la connexion à la base.",
      fieldErrors: { _form: ["Erreur serveur lors de la clôture."] },
      exerciceSuivantId: null,
    };
  }
}
