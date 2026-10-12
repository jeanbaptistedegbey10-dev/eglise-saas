"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { VALEURS_MODE_PAIEMENT, VALEURS_TYPE_COTISATION } from "@/lib/finance";
import type {
  FinancesFormState,
  PaiementsRapidesFormState,
} from "@/types/finance";

// ---------------------------------------------------------------------------
// Schémas Zod
// ---------------------------------------------------------------------------

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Montant strictement positif, 2 décimales max, séparateur « . » ou « , ». */
const montantSchema = z
  .string()
  .trim()
  .regex(
    /^\d+([.,]\d{1,2})?$/,
    "Montant invalide : utilisez uniquement des chiffres, avec au plus 2 décimales (ex. 25000 ou 25000.50).",
  )
  .transform((valeur) => Number(valeur.replace(",", ".")))
  .refine(
    (valeur) => valeur > 0 && valeur <= 1_000_000_000,
    "Le montant doit être compris entre 0 (exclus) et 1 000 000 000.",
  );

const dateSchema = z
  .string()
  .trim()
  .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
  .refine((valeur) => !Number.isNaN(Date.parse(valeur)), "Date invalide.");

const modePaiementSchema = z.enum(VALEURS_MODE_PAIEMENT, {
  message: "Mode de paiement inconnu.",
});

const typeCotisationSchema = z.enum(VALEURS_TYPE_COTISATION, {
  message: "Type de cotisation inconnu.",
});

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

/** Exercice : année plausible et libellé court. */
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
});

const typeCotisationEditionSchema = z.object({
  id: identifiantSchema.optional(),
  libelle: z
    .string()
    .trim()
    .min(2, "Le libellé doit contenir au moins 2 caractères.")
    .max(120, "Le libellé ne peut pas dépasser 120 caractères."),
  description: z
    .string()
    .trim()
    .max(300, "La description ne peut pas dépasser 300 caractères.")
    .nullish(),
  type: typeCotisationSchema,
});

/** Une ligne de barème soumise depuis la modale de configuration. */
const ligneBaremeSchema = z.object({
  id: identifiantSchema.nullish(),
  libelleClasse: z
    .string()
    .trim()
    .min(1, "Le nom de la classe est obligatoire.")
    .max(60, "Le nom de la classe ne peut pas dépasser 60 caractères."),
  montant: z.union([z.number(), montantSchema]),
});

const baremeSchema = z.object({
  exerciceId: identifiantSchema,
  typeCotisationId: identifiantSchema,
  lignes: z
    .array(ligneBaremeSchema)
    .min(1, "Ajoutez au moins une classe au barème.")
    .max(50, "50 classes maximum par barème."),
});

const paiementAnonymeSchema = z.object({
  exerciceId: identifiantSchema,
  typeCotisationId: identifiantSchema,
  montant: montantSchema,
  modePaiement: modePaiementSchema,
  datePaiement: dateSchema.nullish(),
  commentaire: z
    .string()
    .trim()
    .max(300, "Le commentaire ne peut pas dépasser 300 caractères.")
    .nullish(),
});

const paiementsRapidesSchema = z.object({
  exerciceId: identifiantSchema,
  typeCotisationId: identifiantSchema,
  palierId: identifiantSchema,
  modePaiement: modePaiementSchema,
  datePaiement: dateSchema.nullish(),
  membreIds: z.array(identifiantSchema).min(1, "Cochez au moins un membre."),
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

/** Convertit les erreurs Zod en `fieldErrors` (clé = nom du champ). */
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

/** Date de paiement : fournie par le formulaire ou aujourd'hui. */
function resoudreDate(valeur: string | null | undefined): Date {
  return valeur ? new Date(`${valeur}T12:00:00`) : new Date();
}

/** Détecte une violation de contrainte d'unicité Prisma (code P2002). */
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
      "Une erreur est survenue lors de l'enregistrement. Vérifiez la connexion à la base de données.",
    fieldErrors: { _form: ["Erreur serveur lors de l'enregistrement."] },
  };
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Crée un exercice comptable (ex. « Exercice 2026 »). Un exercice unique par
 * année (contrainte `@unique` du modèle `Exercice`).
 */
export async function creerExercice(
  _precedentEtat: FinancesFormState,
  formData: FormData,
): Promise<FinancesFormState> {
  const analyse = exerciceSchema.safeParse({
    annee: lireTexte(formData.get("annee")),
    libelle: lireTexte(formData.get("libelle")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  try {
    await prisma.exercice.create({ data: analyse.data });
    revalidatePath("/finances");
    revalidatePath("/finances/baremes");
    revalidatePath("/finances/saisie-rapide");
    return {
      success: true,
      message: `L'exercice ${analyse.data.annee} a été créé.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    if (estConflitUnicite(erreur)) {
      return {
        success: false,
        message: `Un exercice existe déjà pour l'année ${analyse.data.annee}.`,
        fieldErrors: { annee: ["Cette année est déjà utilisée."] },
      };
    }
    return erreurServeur("creerExercice", erreur);
  }
}

/**
 * Crée ou met à jour un type de cotisation (obligatoire, volontaire ou quête).
 */
export async function enregistrerTypeCotisation(
  _precedentEtat: FinancesFormState,
  formData: FormData,
): Promise<FinancesFormState> {
  const analyse = typeCotisationEditionSchema.safeParse({
    id: lireTexte(formData.get("id")) || undefined,
    libelle: lireTexte(formData.get("libelle")),
    description: lireTexteOptionnel(formData.get("description")),
    type: lireTexte(formData.get("type")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { id, ...donnees } = analyse.data;

  try {
    if (id) {
      await prisma.typeCotisation.update({ where: { id }, data: donnees });
    } else {
      await prisma.typeCotisation.create({ data: donnees });
    }

    revalidatePath("/finances");
    revalidatePath("/finances/baremes");
    revalidatePath("/finances/saisie-rapide");
    return {
      success: true,
      message: id
        ? "Le type de cotisation a été mis à jour."
        : "Le type de cotisation a été créé.",
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("enregistrerTypeCotisation", erreur);
  }
}

/**
 * Enregistre le barème (classes + montants) d'un type de cotisation pour un
 * exercice donné.
 *
 * Les paliers sont attachés à l'exercice : modifier un montant en cours
 * d'année n'altère pas l'historique, puisque chaque paiement conserve son
 * propre montant (photographie au moment du versement).
 *
 * Les lignes soumises avec un `id` sont mises à jour, les lignes sans `id`
 * sont créées, et les paliers de l'exercice absents de la soumission sont
 * supprimés (transaction atomique).
 */
export async function enregistrerBaremes(
  _precedentEtat: FinancesFormState,
  formData: FormData,
): Promise<FinancesFormState> {
  // Les champs dynamiques arrivent en tableaux parallèles (lignes ajoutées
  // côté client via le bouton « Ajouter une classe »).
  const ids = formData.getAll("palierId");
  const libelles = formData.getAll("libelleClasse");
  const montants = formData.getAll("montant");

  const lignes = libelles.map((libelle, index) => ({
    id: lireTexte(ids[index] ?? null) || undefined,
    libelleClasse: lireTexte(libelle),
    montant: lireTexte(montants[index] ?? null),
  }));

  const analyse = baremeSchema.safeParse({
    exerciceId: lireTexte(formData.get("exerciceId")),
    typeCotisationId: lireTexte(formData.get("typeCotisationId")),
    lignes,
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { exerciceId, typeCotisationId, lignes: lignesValides } = analyse.data;

  // Un même nom de classe ne peut pas apparaître deux fois dans le barème.
  const libellesVus = new Set<string>();
  for (const ligne of lignesValides) {
    const cle = ligne.libelleClasse.toLowerCase();
    if (libellesVus.has(cle)) {
      return {
        success: false,
        message: `La classe « ${ligne.libelleClasse} » apparaît plusieurs fois.`,
        fieldErrors: {
          lignes: ["Chaque classe doit être unique dans un barème."],
        },
      };
    }
    libellesVus.add(cle);
  }

  try {
    const [exercice, typeCotisation] = await Promise.all([
      prisma.exercice.findUnique({ where: { id: exerciceId } }),
      prisma.typeCotisation.findUnique({ where: { id: typeCotisationId } }),
    ]);

    if (!exercice) {
      return {
        success: false,
        message: "Exercice introuvable.",
        fieldErrors: { exerciceId: ["Exercice introuvable."] },
      };
    }
    if (exercice.cloture) {
      return {
        success: false,
        message: `L'exercice ${exercice.annee} est clôturé : son barème n'est plus modifiable.`,
        fieldErrors: { _form: ["Exercice clôturé."] },
      };
    }
    if (!typeCotisation) {
      return {
        success: false,
        message: "Type de cotisation introuvable.",
        fieldErrors: { typeCotisationId: ["Type de cotisation introuvable."] },
      };
    }

    const existants = await prisma.paliereBareme.findMany({
      where: { exerciceId, typeCotisationId },
    });
    const existantsParId = new Map(
      existants.map((palier) => [palier.id, palier]),
    );

    // Les lignes portant un id inconnu (barème modifié ailleurs) sont rejetées.
    for (const ligne of lignesValides) {
      if (ligne.id && !existantsParId.has(ligne.id)) {
        return {
          success: false,
          message:
            "Le barème a été modifié dans une autre session. Rechargez la page puis réessayez.",
          fieldErrors: { _form: ["Barème obsolète."] },
        };
      }
    }

    const idsSoumis = new Set(
      lignesValides
        .map((ligne) => ligne.id)
        .filter((id): id is string => Boolean(id)),
    );
    const idsASupprimer = existants
      .filter((palier) => !idsSoumis.has(palier.id))
      .map((palier) => palier.id);

    await prisma.$transaction(async (transaction) => {
      if (idsASupprimer.length > 0) {
        await transaction.paliereBareme.deleteMany({
          where: { id: { in: idsASupprimer } },
        });
      }

      for (const ligne of lignesValides) {
        const montant = Math.round(ligne.montant * 100) / 100;
        if (ligne.id) {
          await transaction.paliereBareme.update({
            where: { id: ligne.id },
            data: { libelleClasse: ligne.libelleClasse, montant },
          });
        } else {
          await transaction.paliereBareme.create({
            data: {
              exerciceId,
              typeCotisationId,
              libelleClasse: ligne.libelleClasse,
              montant,
            },
          });
        }
      }
    });

    revalidatePath("/finances");
    revalidatePath("/finances/baremes");
    revalidatePath("/finances/saisie-rapide");
    return {
      success: true,
      message: `Barème « ${typeCotisation.libelle} ${exercice.annee} » enregistré (${lignesValides.length} classe${lignesValides.length > 1 ? "s" : ""}).`,
      fieldErrors: {},
    };
  } catch (erreur) {
    if (estConflitUnicite(erreur)) {
      return {
        success: false,
        message:
          "Une classe portant ce nom existe déjà pour ce barème et cet exercice.",
        fieldErrors: { lignes: ["Classe déjà présente dans le barème."] },
      };
    }
    return erreurServeur("enregistrerBaremes", erreur);
  }
}

/**
 * Enregistre un versement anonyme (quête de culte ou don sans identification) :
 * `membreId` reste null, conformément au modèle `Paiement`.
 */
export async function enregistrerPaiementAnonyme(
  _precedentEtat: FinancesFormState,
  formData: FormData,
): Promise<FinancesFormState> {
  const analyse = paiementAnonymeSchema.safeParse({
    exerciceId: lireTexte(formData.get("exerciceId")),
    typeCotisationId: lireTexte(formData.get("typeCotisationId")),
    montant: lireTexte(formData.get("montant")),
    modePaiement: lireTexte(formData.get("modePaiement")),
    datePaiement: lireTexteOptionnel(formData.get("datePaiement")),
    commentaire: lireTexteOptionnel(formData.get("commentaire")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const donnees = analyse.data;

  try {
    const [exercice, typeCotisation] = await Promise.all([
      prisma.exercice.findUnique({ where: { id: donnees.exerciceId } }),
      prisma.typeCotisation.findUnique({
        where: { id: donnees.typeCotisationId },
      }),
    ]);

    if (!exercice || !typeCotisation) {
      return {
        success: false,
        message: "Exercice ou type de cotisation introuvable.",
        fieldErrors: { _form: ["Référentiel introuvable."] },
      };
    }
    if (exercice.cloture) {
      return {
        success: false,
        message: `L'exercice ${exercice.annee} est clôturé.`,
        fieldErrors: { _form: ["Exercice clôturé."] },
      };
    }
    if (
      typeCotisation.type !== "QUETE_ANONYME" &&
      typeCotisation.type !== "VOLONTAIRE_CAMPAGNE"
    ) {
      return {
        success: false,
        message:
          "Un versement anonyme n'est possible que pour une quête ou une cotisation volontaire.",
        fieldErrors: {
          typeCotisationId: ["Choisissez une quête ou une campagne volontaire."],
        },
      };
    }

    await prisma.paiement.create({
      data: {
        montant: donnees.montant,
        modePaiement: donnees.modePaiement,
        datePaiement: resoudreDate(donnees.datePaiement),
        commentaire: donnees.commentaire,
        // Anonymat du donneur : aucune référence de membre.
        membreId: null,
        typeCotisationId: donnees.typeCotisationId,
        exerciceId: donnees.exerciceId,
      },
    });

    revalidatePath("/finances");
    revalidatePath("/finances/saisie-rapide");
    return {
      success: true,
      message: `Versement anonyme de ${donnees.montant.toLocaleString("fr-FR")} enregistré (donneur non identifié).`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("enregistrerPaiementAnonyme", erreur);
  }
}

/**
 * Grille de saisie rapide : enregistre en une seule action les versements des
 * membres coché·es pour une cotisation obligatoire (montant du palier choisi).
 *
 * Les membres déjà à jour (total versé >= montant du palier) sont ignorés et
 * comptabilisés séparément — jamais de double paiement par mégarde.
 */
export async function enregistrerPaiementsRapides(
  _precedentEtat: PaiementsRapidesFormState,
  formData: FormData,
): Promise<PaiementsRapidesFormState> {
  const analyse = paiementsRapidesSchema.safeParse({
    exerciceId: lireTexte(formData.get("exerciceId")),
    typeCotisationId: lireTexte(formData.get("typeCotisationId")),
    palierId: lireTexte(formData.get("palierId")),
    modePaiement: lireTexte(formData.get("modePaiement")),
    datePaiement: lireTexteOptionnel(formData.get("datePaiement")),
    membreIds: formData
      .getAll("membreIds")
      .map((valeur) => lireTexte(valeur))
      .filter((valeur) => valeur.length > 0),
  });
  if (!analyse.success) {
    return {
      ...echecValidation(analyse.error),
      nombreEnregistres: 0,
      nombreDejaVerses: 0,
    };
  }

  const donnees = analyse.data;
  // Déduplique : une coche par membre, quoi que contienne le formulaire.
  const membresIds = Array.from(new Set(donnees.membreIds));

  try {
    const [exercice, typeCotisation, palier] = await Promise.all([
      prisma.exercice.findUnique({ where: { id: donnees.exerciceId } }),
      prisma.typeCotisation.findUnique({ where: { id: donnees.typeCotisationId } }),
      prisma.paliereBareme.findUnique({ where: { id: donnees.palierId } }),
    ]);

    if (!exercice || !typeCotisation || !palier) {
      return {
        success: false,
        message: "Exercice, cotisation ou barème introuvable.",
        fieldErrors: { _form: ["Référentiel introuvable."] },
        nombreEnregistres: 0,
        nombreDejaVerses: 0,
      };
    }
    if (
      palier.exerciceId !== exercice.id ||
      palier.typeCotisationId !== typeCotisation.id
    ) {
      return {
        success: false,
        message: "Le barème sélectionné ne correspond pas à la cotisation choisie.",
        fieldErrors: { _form: ["Barème incohérent."] },
        nombreEnregistres: 0,
        nombreDejaVerses: 0,
      };
    }
    if (typeCotisation.type !== "OBLIGATOIRE_BAREME") {
      return {
        success: false,
        message:
          "La saisie rapide ne concerne que les cotisations obligatoires à barème.",
        fieldErrors: { _form: ["Type de cotisation non obligatoire."] },
        nombreEnregistres: 0,
        nombreDejaVerses: 0,
      };
    }
    if (exercice.cloture) {
      return {
        success: false,
        message: `L'exercice ${exercice.annee} est clôturé.`,
        fieldErrors: { _form: ["Exercice clôturé."] },
        nombreEnregistres: 0,
        nombreDejaVerses: 0,
      };
    }

    const montantPalier = Number(palier.montant);
    const datePaiement = resoudreDate(donnees.datePaiement);

    // Totaux déjà versés par les membres coché·es pour cette cotisation.
    const totaux = await prisma.paiement.groupBy({
      by: ["membreId"],
      where: {
        exerciceId: exercice.id,
        typeCotisationId: typeCotisation.id,
        membreId: { in: membresIds },
      },
      _sum: { montant: true },
    });
    const totalParMembre = new Map<string, number>(
      totaux.map((ligne) => [
        ligne.membreId as string,
        Number(ligne._sum.montant ?? 0),
      ]),
    );

    const membresIdsValid: string[] = [];
    let nombreDejaVerses = 0;

    for (const membreId of membresIds) {
      const totalVerse = totalParMembre.get(membreId) ?? 0;
      if (totalVerse + 0.001 >= montantPalier) {
        nombreDejaVerses += 1;
      } else {
        membresIdsValid.push(membreId);
      }
    }

    if (membresIdsValid.length === 0) {
      return {
        success: false,
        message:
          nombreDejaVerses > 0
            ? `Aucun versement à enregistrer : les ${nombreDejaVerses} membre${nombreDejaVerses > 1 ? "s" : ""} coché·e${nombreDejaVerses > 1 ? "s" : ""} sont déjà à jour.`
            : "Aucun membre à enregistrer.",
        fieldErrors: {},
        nombreEnregistres: 0,
        nombreDejaVerses,
      };
    }

    // Vérifie l'existence des membres (évite des échecs FK obscurs).
    const membresExistants = await prisma.membre.findMany({
      where: { id: { in: membresIdsValid } },
      select: { id: true },
    });
    const existantsSet = new Set(membresExistants.map((membre) => membre.id));
    const membresConnus = membresIdsValid.filter((id) => existantsSet.has(id));
    const membresInconnus = membresIdsValid.length - membresConnus.length;

    if (membresConnus.length === 0) {
      return {
        success: false,
        message: "Aucun des membres sélectionnés n'existe.",
        fieldErrors: { _form: ["Membres introuvables."] },
        nombreEnregistres: 0,
        nombreDejaVerses,
      };
    }

    await prisma.$transaction(
      membresConnus.map((membreId) =>
        prisma.paiement.create({
          data: {
            montant: palier.montant,
            modePaiement: donnees.modePaiement,
            datePaiement,
            membreId,
            typeCotisationId: typeCotisation.id,
            exerciceId: exercice.id,
            commentaire: `Saisie rapide — ${palier.libelleClasse}`,
          },
        }),
      ),
    );

    revalidatePath("/finances");
    revalidatePath("/finances/saisie-rapide");
    revalidatePath("/membres");

    const details = [
      `${membresConnus.length} versement${membresConnus.length > 1 ? "s" : ""} enregistré${membresConnus.length > 1 ? "s" : ""}`,
      nombreDejaVerses > 0
        ? `${nombreDejaVerses} membre${nombreDejaVerses > 1 ? "s" : ""} déjà à jour ignoré${nombreDejaVerses > 1 ? "s" : ""}`
        : null,
      membresInconnus > 0
        ? `${membresInconnus} membre${membresInconnus > 1 ? "s" : ""} introuvable${membresInconnus > 1 ? "s" : ""}`
        : null,
    ].filter(Boolean);

    return {
      success: true,
      message: `${details.join(" · ")}.`,
      fieldErrors: {},
      nombreEnregistres: membresConnus.length,
      nombreDejaVerses,
    };
  } catch (erreur) {
    const etat = erreurServeur("enregistrerPaiementsRapides", erreur);
    return { ...etat, nombreEnregistres: 0, nombreDejaVerses: 0 };
  }
}
