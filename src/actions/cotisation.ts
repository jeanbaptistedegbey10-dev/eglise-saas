"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  CibleCotisation,
  FrequenceCotisation,
  ModePaiement,
  TypeCotisation,
} from "@/generated/prisma/enums";
import {
  determinerCible,
  formatMontant,
  libelleCible,
  periodesParMois,
  selectionnerBareme,
  typeAvecBarème,
} from "@/lib/cotisation";
import { parseDonneesEcclesiastiques } from "@/lib/membre";
import { libelleMoisClef, moisExercice, normaliserMoisCoches } from "@/lib/mois";
import { prisma } from "@/lib/prisma";
import { consignerAudit } from "@/lib/audit";
import { exigerTresorierOuAdmin } from "@/lib/garde-actions";
import { arrondir2, repartitionMontant } from "@/lib/versement-cotisation";
import type { CotisationFormState } from "@/types/cotisation";

// ---------------------------------------------------------------------------
// Schémas Zod
// ---------------------------------------------------------------------------

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Montant accepté sous forme de nombre OU de chaîne numérique (« 1000 »,
 * « 1000,50 »). La valeur 0 est autorisée (ex. 0 FCFA pour la classe Enfants).
 */
const montantSchema = z.preprocess(
  (valeur) => {
    if (typeof valeur === "string") {
      const texte = valeur.trim();
      return texte === "" ? Number.NaN : Number(texte.replace(",", "."));
    }
    if (typeof valeur === "number") {
      return Number.isFinite(valeur) ? valeur : Number.NaN;
    }
    return Number.NaN;
  },
  z.coerce
    .number({
      message:
        "Montant invalide : utilisez uniquement des chiffres, avec au plus 2 décimales (ex. 1000 ou 1000.50).",
    })
    .min(0, "Le montant doit être supérieur ou égal à 0.")
    .max(1_000_000_000, "Le montant ne peut pas dépasser 1 000 000 000.")
    .transform((valeur) => arrondir2(valeur)),
);

/** Montant facultatif : chaîne vide → null (champ laissé vide par le user). */
const montantOptionnelSchema = z.preprocess(
  (valeur) => {
    if (valeur === null || valeur === undefined) return null;
    if (typeof valeur === "string") {
      const texte = valeur.trim();
      return texte === "" ? null : Number(texte.replace(",", "."));
    }
    if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : null;
    return null;
  },
  z
    .number({ message: "Montant invalide." })
    .min(0, "Le montant doit être supérieur ou égal à 0.")
    .max(1_000_000_000, "Le montant ne peut pas dépasser 1 000 000 000.")
    .nullable(),
);

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

const dateSchema = z.preprocess(
  (valeur) =>
    typeof valeur === "string" && valeur.trim() === "" ? null : valeur,
  z
    .string()
    .trim()
    .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
    .refine((valeur) => !Number.isNaN(Date.parse(valeur)), "Date invalide.")
    .nullable(),
);

/**
 * Fréquence tolérante : une chaîne vide (champ non affiché pour les natures
 * non récurrentes) ou une valeur absente retombe sur `PONCTUEL`. Seules les
 * cotisations récurrentes envoient réellement `MENSUEL` / `HEBDOMADAIRE`.
 */
const frequenceSchema = z.preprocess(
  (valeur) =>
    valeur === "" || valeur === null || valeur === undefined ? "PONCTUEL" : valeur,
  z.enum(
    Object.values(FrequenceCotisation) as [FrequenceCotisation, ...FrequenceCotisation[]],
    { message: "Fréquence inconnue." },
  ),
);

const cibleSchema = z.enum(
  Object.values(CibleCotisation) as [CibleCotisation, ...CibleCotisation[]],
  { message: "Cible de barème inconnue." },
);

const modePaiementSchema = z.enum(
  Object.values(ModePaiement) as [ModePaiement, ...ModePaiement[]],
  { message: "Mode de paiement inconnu." },
);

const typeCotisationSchema = z.enum(
  Object.values(TypeCotisation) as [TypeCotisation, ...TypeCotisation[]],
  { message: "Type de cotisation inconnu." },
);

/**
 * Création / modification d'une cotisation avec sa grille de barèmes, en un
 * seul envoi. `baremes` est un tableau { cible, montant } transmis en JSON.
 */
const cotisationSchema = z.object({
  id: identifiantSchema.nullish(),
  exerciceId: identifiantSchema,
  nom: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
  description: z
    .string()
    .trim()
    .max(300, "La description ne peut pas dépasser 300 caractères.")
    .nullish(),
  type: typeCotisationSchema,
  frequence: frequenceSchema,
  dateDebut: dateSchema.nullish(),
  dateFin: dateSchema.nullish(),
  autoriserSurplus: z.boolean(),
  montantCible: montantOptionnelSchema,
  departementId: identifiantSchema.nullish(),
  groupeId: identifiantSchema.nullish(),
  // Grille de barèmes : facultative au niveau du schéma (tableau vide autorisé
  // pour Travaux / Quêtes). L'obligation « au moins un barème » pour les natures
  // à barème est contrôlée métier plus bas dans `enregistrerCotisation`.
  baremes: z
    .array(
      z.object({
        cible: cibleSchema,
        montant: montantSchema,
      }),
    )
    .max(6, "Six cibles maximum par cotisation.")
    .optional()
    .default([]),
});

/** Versement : identique pour les 3 natures, la logique varie côté serveur. */
const versementSchema = z.object({
  cotisationId: identifiantSchema,
  membreId: identifiantSchema.nullish(),
  montant: montantSchema,
  modePaiement: modePaiementSchema,
  dateEffective: dateSchema.nullish(),
  moisCoches: z.array(z.string()).max(12, "12 mois maximum par versement."),
  estAnonyme: z.boolean(),
  /**
   * Récurrentes uniquement : exonère les mois antérieurs à l'arrivée du membre
   * (nouveau membre en cours d'année). Quand actif, l'ordre chronologique
   * strict n'est plus imposé : le membre peut régler le mois courant sans avoir
   * soldé les mois précédents.
   */
  exonererAnterieurs: z.boolean().optional().default(false),
  commentaire: z
    .string()
    .trim()
    .max(300, "Le commentaire ne peut pas dépasser 300 caractères.")
    .nullish(),
});

const suppressionSchema = z.object({
  cotisationId: identifiantSchema,
  confirmation: z
    .string()
    .trim()
    .refine((valeur) => valeur.toUpperCase() === "SUPPRIMER", {
      message: "Tapez « SUPPRIMER » pour confirmer.",
    }),
});

const clotureSchema = z.object({ cotisationId: identifiantSchema });

/** Annulation / suppression d'un versement erroné (par son identifiant). */
const annulationVersementSchema = z.object({
  versementId: identifiantSchema,
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

/** Champ identifier facultatif : chaîne vide → undefined (option Zod). */
function lireIdentifiantOptionnel(valeur: FormDataEntryValue | null): string | undefined {
  const texte = lireTexte(valeur);
  return texte === "" ? undefined : texte;
}

/** Rattachement optionnel (département / groupe) : "" ou "AUCUN" → null. */
function normaliserRattachement(valeur: FormDataEntryValue | null): string | null {
  const texte = lireTexte(valeur);
  if (texte === "" || texte.toUpperCase() === "AUCUN") return null;
  return texte;
}

/** Parse un tableau JSON transmis par un champ masqué ([] si vide/illisible). */
function lireListeJSON(valeur: string): unknown[] | null {
  if (valeur === "") return [];
  try {
    const analyse = JSON.parse(valeur);
    return Array.isArray(analyse) ? analyse : null;
  } catch {
    return null;
  }
}

function versFieldErrors(erreur: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of erreur.issues) {
    // Chemin complet (ex. « baremes.0.montant ») pour cibler le champ fautif.
    const cle = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[cle] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function echecValidation(erreur: z.ZodError): CotisationFormState {
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

function erreurServeur(contexte: string, erreur: unknown): CotisationFormState {
  console.error(`Erreur serveur (${contexte}) :`, erreur);
  return {
    success: false,
    message:
      "Une erreur est survenue lors de l'enregistrement. Vérifiez la connexion à la base de données.",
    fieldErrors: { _form: ["Erreur serveur lors de l'enregistrement."] },
  };
}

function echec(message: string, champ = "_form"): CotisationFormState {
  return { success: false, message, fieldErrors: { [champ]: [message] } };
}

/** Date fournie par le formulaire ou aujourd'hui (côté serveur). */
function resoudreDate(valeur: string | null | undefined): Date {
  return valeur ? new Date(`${valeur}T12:00:00`) : new Date();
}

function revaliderCotisations(): void {
  revalidatePath("/finances/cotisations");
  revalidatePath("/finances");
  revalidatePath("/rapports");
}

/** Vrai si la date est bien comprise dans la campagne [début … fin]. */
function horsCampagne(date: Date, debut: Date | null, fin: Date | null): boolean {
  if (debut && date < debut) return true;
  if (fin && date > fin) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Server Actions — cotisations
// ---------------------------------------------------------------------------

/**
 * Crée OU met à jour une cotisation avec sa grille de barèmes, en une seule
 * transaction : soit tout est enregistré, soit rien ne l'est.
 *
 * Les champs obligatoires dépendent de la nature saisie :
 *  • RECURRENTE_CLASSE    → grille de barèmes par classe (au moins 1) ;
 *  • PONCTUELLE_EVENEMENT → montant plancher obligatoire (+ surplus optionnel) ;
 *  • ANONYME_PROJET       → cible globale facultative (montant libre).
 */
export async function enregistrerCotisation(
  _precedentEtat: CotisationFormState,
  formData: FormData,
): Promise<CotisationFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const baremesJSON = lireListeJSON(lireTexte(formData.get("baremes")));
  if (baremesJSON === null) {
    return echec("La grille des barèmes est illisible.", "baremes");
  }

  const analyse = cotisationSchema.safeParse({
    id: lireIdentifiantOptionnel(formData.get("id")),
    exerciceId: lireTexte(formData.get("exerciceId")),
    nom: lireTexte(formData.get("nom")),
    description: lireTexteOptionnel(formData.get("description")),
    type: lireTexte(formData.get("type")),
    frequence: lireTexte(formData.get("frequence")),
    dateDebut: lireTexteOptionnel(formData.get("dateDebut")),
    dateFin: lireTexteOptionnel(formData.get("dateFin")),
    autoriserSurplus: formData.get("autoriserSurplus") === "on",
    montantCible: lireTexte(formData.get("montantCible")),
    departementId: normaliserRattachement(formData.get("departementId")),
    groupeId: normaliserRattachement(formData.get("groupeId")),
    baremes: baremesJSON,
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const {
    id,
    exerciceId,
    nom,
    description,
    type,
    frequence,
    dateDebut,
    dateFin,
    autoriserSurplus,
    montantCible,
    departementId,
    groupeId,
    baremes: lignes,
  } = analyse.data;

  // Fréquence normalisée : seules les cotisations récurrentes sont
  // mensuelles / hebdomadaires, les autres sont « ponctuelles ».
  const frequenceFinale: FrequenceCotisation =
    type === "RECURRENTE_CLASSE" ? frequence : "PONCTUEL";

  // Champs propres à une nature : remis à null ailleurs.
  const surplusFinal = type === "PONCTUELLE_EVENEMENT" && autoriserSurplus;
  const cibleFinale = type === "ANONYME_PROJET" ? montantCible : null;

  if (dateDebut && dateFin && dateDebut > dateFin) {
    return echec("La date limite doit être postérieure à la date de début.", "dateFin");
  }

  // Natures à barème (récurrente + ponctuelle) : la grille est obligatoire et
  // ses montants servent de dû (récurrente) ou de plancher par classe (ponctuelle).
  if (typeAvecBarème(type)) {
    if (lignes.length === 0) {
      return echec(
        "Définissez au moins un montant pour la grille des barèmes (Adultes, Jeunes…).",
        "baremes",
      );
    }
    const ciblesVues = new Set<string>();
    for (const ligne of lignes) {
      if (ciblesVues.has(ligne.cible)) {
        return echec(
          `La classe « ${libelleCible(ligne.cible)} » apparaît plusieurs fois dans la grille.`,
          "baremes",
        );
      }
      ciblesVues.add(ligne.cible);
    }
  }

  // Pour une ponctuelle, le plancher global affiché (rapports, résumés) est la
  // valeur maximale de la grille ; le plancher réellement appliqué à un membre
  // est le barème de sa classe, résolu au moment du versement.
  const plancherFinal =
    type === "PONCTUELLE_EVENEMENT" && lignes.length > 0
      ? Math.max(...lignes.map((ligne) => arrondir2(Number(ligne.montant))))
      : null;

  if (type === "PONCTUELLE_EVENEMENT" && (plancherFinal === null || plancherFinal <= 0)) {
    return echec(
      "Définissez au moins un montant plancher dans la grille (ex. Adultes 5 000 FCFA).",
      "baremes",
    );
  }

  try {
    const exercice = await prisma.exercice.findUnique({ where: { id: exerciceId } });
    if (!exercice) return echec("Exercice introuvable.", "exerciceId");
    if (exercice.cloture) {
      return echec(
        `L'exercice ${exercice.libelle} est clôturé : aucune cotisation ne peut y être modifiée.`,
      );
    }
    if (departementId) {
      const departement = await prisma.departement.findUnique({ where: { id: departementId } });
      if (!departement) return echec("Département de rattachement introuvable.", "departementId");
    }
    if (groupeId) {
      const groupe = await prisma.groupe.findUnique({ where: { id: groupeId } });
      if (!groupe) return echec("Groupe de rattachement introuvable.", "groupeId");
    }

    const donnees = {
      nom,
      description,
      type,
      frequence: frequenceFinale,
      dateDebut: dateDebut ? new Date(`${dateDebut}T12:00:00`) : null,
      dateFin: dateFin ? new Date(`${dateFin}T12:00:00`) : null,
      montantPlancher: plancherFinal,
      autoriserSurplus: surplusFinal,
      montantCible: cibleFinale,
      departementId: departementId ?? null,
      groupeId: groupeId ?? null,
    };

    if (id) {
      const existante = await prisma.cotisation.findUnique({ where: { id } });
      if (!existante) return echec("Cotisation introuvable.", "id");
      if (existante.exerciceId !== exerciceId) {
        return echec("Cette cotisation appartient à un autre exercice.", "exerciceId");
      }

      await prisma.$transaction(async (transaction) => {
        await transaction.cotisation.update({ where: { id }, data: donnees });
        // La grille est remplacée en bloc : les classes retirées disparaissent.
        await transaction.baremeCotisation.deleteMany({ where: { cotisationId: id } });
        if (lignes.length > 0) {
          await transaction.baremeCotisation.createMany({
            data: lignes.map((ligne) => ({
              cotisationId: id,
              cible: ligne.cible,
              montant: arrondir2(ligne.montant),
            })),
          });
        }
      });

      revaliderCotisations();
      return {
        success: true,
        message: `La cotisation « ${nom} » a été mise à jour.`,
        fieldErrors: {},
      };
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.cotisation.create({
        data: {
          exerciceId,
          ...donnees,
          baremes: {
            create: lignes.map((ligne) => ({
              cible: ligne.cible,
              montant: arrondir2(ligne.montant),
            })),
          },
        },
      });
    });

    revaliderCotisations();
    return {
      success: true,
      message: `La cotisation « ${nom} » a été enregistrée.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    if (estConflitUnicite(erreur)) {
      return echec(`Une cotisation nommée « ${nom} » existe déjà pour cet exercice.`, "nom");
    }
    return erreurServeur("enregistrerCotisation", erreur);
  }
}

/**
 * Supprime une cotisation — et en cascade ses barèmes et ses versements —
 * après confirmation explicite « SUPPRIMER ».
 */
export async function supprimerCotisation(
  _precedentEtat: CotisationFormState,
  formData: FormData,
): Promise<CotisationFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = suppressionSchema.safeParse({
    cotisationId: lireTexte(formData.get("cotisationId")),
    confirmation: lireTexte(formData.get("confirmation")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { cotisationId } = analyse.data;

  try {
    const cotisation = await prisma.cotisation.findUnique({
      where: { id: cotisationId },
      include: { exercice: { select: { libelle: true, cloture: true } } },
    });
    if (!cotisation) return echec("Cotisation introuvable.");
    if (cotisation.exercice.cloture) {
      return echec(
        `L'exercice ${cotisation.exercice.libelle} est clôturé : suppression impossible.`,
      );
    }

    // Protection : une cotisation ayant des écritures financières ne peut
    // pas être supprimée (défense en profondeur, complétée côté client).
    const totalVersements = await prisma.versementCotisation.count({
      where: { cotisationId },
    });
    if (totalVersements > 0) {
      return echec(
        `Impossible de supprimer cette cotisation : ${totalVersements} versement(s) y sont rattaché(s). Veuillez d'abord supprimer ou annuler ces versements.`,
      );
    }

    const totalDepenses = await prisma.depense.count({
      where: { cotisationId },
    });
    if (totalDepenses > 0) {
      return echec(
        `Impossible de supprimer cette cotisation : ${totalDepenses} dépense(s) y sont imputée(s).`,
      );
    }

    await prisma.cotisation.delete({ where: { id: cotisationId } });
    await consignerAudit({
      action: "SUPPRESSION",
      entite: "Cotisation",
      entiteId: cotisationId,
      details: `La cotisation « ${cotisation.nom} » (exercice ${cotisation.exercice.libelle}) a été supprimée avec ses barèmes et versements.`,
    });

    revaliderCotisations();
    return {
      success: true,
      message: `La cotisation « ${cotisation.nom} », ses barèmes et ses versements ont été supprimés.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("supprimerCotisation", erreur);
  }
}

/**
 * Clôture ou rouvre une cotisation : une cotisation clôturée n'accepte plus
 * aucun versement (l'action est réversible : « Rouvrir »).
 */
export async function basculerClotureCotisation(
  _precedentEtat: CotisationFormState,
  formData: FormData,
): Promise<CotisationFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = clotureSchema.safeParse({
    cotisationId: lireTexte(formData.get("cotisationId")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { cotisationId } = analyse.data;

  try {
    const cotisation = await prisma.cotisation.findUnique({
      where: { id: cotisationId },
      include: { exercice: { select: { libelle: true, cloture: true } } },
    });
    if (!cotisation) return echec("Cotisation introuvable.");
    if (cotisation.exercice.cloture) {
      return echec(
        `L'exercice ${cotisation.exercice.libelle} est clôturé : aucune modification possible.`,
      );
    }

    const cloturee = !cotisation.estCloture;
    await prisma.cotisation.update({
      where: { id: cotisationId },
      data: { estCloture: cloturee },
    });

    revaliderCotisations();
    return {
      success: true,
      message: cloturee
        ? `La cotisation « ${cotisation.nom} » est clôturée.`
        : `La cotisation « ${cotisation.nom} » a été rouverte.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("basculerClotureCotisation", erreur);
  }
}

/**
 * Enregistre un versement de cotisation — les 3 natures sont gérées par une
 * seule action, la logique étant branchée sur `cotisation.type` lue en base :
 *
 *  • RECURRENTE_CLASSE    → mois cochés, montant calculé automatiquement à
 *                           partir du barème de la classe du membre ;
 *  • PONCTUELLE_EVENEMENT → montant total remis, découpé en part obligatoire
 *                           (plancher) + surplus volontaire ;
 *  • ANONYME_PROJET       → montant libre, donateur facultatif / anonyme.
 */
export async function enregistrerVersementCotisation(
  _precedentEtat: CotisationFormState,
  formData: FormData,
): Promise<CotisationFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const moisJSON = lireListeJSON(lireTexte(formData.get("moisCoches")));
  if (moisJSON === null) return echec("La liste des mois est illisible.", "moisCoches");

  const analyse = versementSchema.safeParse({
    cotisationId: lireTexte(formData.get("cotisationId")),
    membreId: lireIdentifiantOptionnel(formData.get("membreId")),
    montant: lireTexte(formData.get("montant")),
    modePaiement: lireTexte(formData.get("modePaiement")),
    dateEffective: lireTexteOptionnel(formData.get("dateEffective")),
    moisCoches: moisJSON,
    estAnonyme: formData.get("estAnonyme") === "on",
    exonererAnterieurs: formData.get("exonererAnterieurs") === "on",
    commentaire: lireTexteOptionnel(formData.get("commentaire")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const donnees = analyse.data;
  const membreId: string | null = donnees.membreId ?? null;

  try {
    const cotisation = await prisma.cotisation.findUnique({
      where: { id: donnees.cotisationId },
      include: {
        exercice: {
          select: { libelle: true, cloture: true, moisDebut: true, moisFin: true },
        },
        baremes: true,
      },
    });
    if (!cotisation) return echec("Cotisation introuvable.", "cotisationId");
    if (cotisation.exercice.cloture) {
      return echec(
        `L'exercice ${cotisation.exercice.libelle} est clôturé : aucun versement ne peut être enregistré.`,
      );
    }
    if (cotisation.estCloture) {
      return echec(
        `La cotisation « ${cotisation.nom} » est clôturée : rouvrez-la avant d'enregistrer un versement.`,
      );
    }

    // Date effective de paiement : contrôlée par les dates de campagne.
    const dateEffective = resoudreDate(donnees.dateEffective);
    if (horsCampagne(dateEffective, cotisation.dateDebut, cotisation.dateFin)) {
      return echec(
        "La date effective est en dehors de la période de campagne (date de début / date limite).",
        "dateEffective",
      );
    }

    let moisCoches: string[] = [];
    let montantBase = 0;
    let surplus = 0;
    let montantFinal = donnees.montant;

    if (cotisation.type === "RECURRENTE_CLASSE") {
      // --- Récurrente : grille des mois, tarif déduit du barème de la classe.
      if (!membreId) return echec("Sélectionnez le membre.", "membreId");

      const membre = await prisma.membre.findUnique({
        where: { id: membreId },
        // Seul le profil ecclésiastique est utilisé pour la grille ; on évite
        // de charger la photo (data URL volumineuse).
        select: { id: true, donneesEcclesiastiques: true },
      });
      if (!membre) return echec("Membre introuvable.", "membreId");

      const selectionnes = normaliserMoisCoches(donnees.moisCoches);
      if (selectionnes.length === 0) {
        return echec("Cochez au moins un mois dans la grille.", "moisCoches");
      }

      const moisValides = new Set(
        moisExercice(cotisation.exercice.moisDebut, cotisation.exercice.moisFin).map(
          (mois) => mois.cle,
        ),
      );
      for (const cle of selectionnes) {
        if (!moisValides.has(cle)) {
          return echec(
            `Le mois « ${libelleMoisClef(cle)} » n'appartient pas à cet exercice.`,
            "moisCoches",
          );
        }
      }

      // Aucun mois ne peut être payé deux fois pour le même membre.
      const anterieurs = await prisma.versementCotisation.findMany({
        where: { cotisationId: cotisation.id, membreId },
        select: { moisCoches: true },
      });
      const dejaPayes = new Set(
        anterieurs.flatMap((versement) => normaliserMoisCoches(versement.moisCoches)),
      );
      const enConflit = selectionnes.find((cle) => dejaPayes.has(cle));
      if (enConflit) {
        return echec(
          `Le mois « ${libelleMoisClef(enConflit)} » est déjà réglé pour ce membre.`,
          "moisCoches",
        );
      }

      // Ordre chronologique obligatoire : interdit de sauter des mois non payés.
      // Un mois N n'est accepté que si tous les mois précédents de l'exercice
      // sont déjà réglés ou inclus dans la sélection actuelle.
      //
      // EXCEPTION — « Exonérer les mois antérieurs à l'arrivée » : un membre
      // arrivé en cours d'année n'est redevable qu'à partir du mois courant (ou
      // de son inscription). Quand l'exonération est active, on n'impose plus
      // l'ordre chronologique : il peut régler le mois courant sans solder les
      // arriérés des mois précédents. Le contrôle « mois déjà réglé » (doublon)
      // ci-dessus reste pleinement actif.
      if (!donnees.exonererAnterieurs) {
        const ordreExercice = moisExercice(
          cotisation.exercice.moisDebut,
          cotisation.exercice.moisFin,
        ).map((mois) => mois.cle);
        const selectionSet = new Set(selectionnes);
        for (const cle of selectionnes) {
          const index = ordreExercice.indexOf(cle);
          if (index === -1) continue;
          for (const anterieur of ordreExercice.slice(0, index)) {
            if (!dejaPayes.has(anterieur) && !selectionSet.has(anterieur)) {
              return echec(
                `Le mois « ${libelleMoisClef(cle)} » ne peut pas être réglé avant le mois « ${libelleMoisClef(anterieur)} » : réglez les mois dans l'ordre chronologique, sans sauter d'arriéré.`,
                "moisCoches",
              );
            }
          }
        }
      }

      const profil = parseDonneesEcclesiastiques(membre.donneesEcclesiastiques);
      const cible = determinerCible(profil);
      const grille = cotisation.baremes.map((bareme) => ({
        cible: bareme.cible,
        montant: Number(bareme.montant),
      }));
      const bareme = selectionnerBareme(grille, cible);
      if (!bareme) {
        return echec(
          `Aucun barème n'est défini pour la classe « ${libelleCible(cible)} ».`,
          "moisCoches",
        );
      }

      // Montant calculé automatiquement : aucune saisie manuelle côté client.
      const attenduMensuel = arrondir2(bareme.montant * periodesParMois(cotisation.frequence));
      montantBase = arrondir2(attenduMensuel * selectionnes.length);
      montantFinal = montantBase;
      moisCoches = selectionnes;
    } else if (cotisation.type === "PONCTUELLE_EVENEMENT") {
      // --- Ponctuelle : plancher obligatoire selon la classe du membre.
      if (!membreId) {
        return echec("Sélectionnez le membre concerné par l'aide.", "membreId");
      }
      const membre = await prisma.membre.findUnique({
        where: { id: membreId },
        // Seul le profil ecclésiastique est utilisé pour le plancher ; on évite
        // de charger la photo (data URL volumineuse).
        select: { id: true, donneesEcclesiastiques: true },
      });
      if (!membre) return echec("Membre introuvable.", "membreId");

      // Le plancher est le barème de la classe du membre (ex. Adulte 5 000).
      const profil = parseDonneesEcclesiastiques(membre.donneesEcclesiastiques);
      const cible = determinerCible(profil);
      const grille = cotisation.baremes.map((bareme) => ({
        cible: bareme.cible,
        montant: Number(bareme.montant),
      }));
      const baremeMembre = selectionnerBareme(grille, cible);
      // Repli : plancher global stocké (données antérieures à la grille par classe).
      const plancher = baremeMembre
        ? arrondir2(baremeMembre.montant)
        : cotisation.montantPlancher
          ? Number(cotisation.montantPlancher)
          : 0;
      if (plancher <= 0) {
        return echec(
          `Aucun montant plancher n'est défini pour la classe « ${libelleCible(cible)} ».`,
          "montantPlancher",
        );
      }
      // --- Paiement unique (ponctuelle) : un membre ne peut régler qu'UNE FOIS
      // cette cotisation. On refuse tout second versement, même partiel,
      // même d'un montant différent, tant qu'un versement existe déjà pour ce
      // membre sur cette cotisation. (Une annulation (voir
      // `annulerVersementCotisation`) libère le membre pour un nouveau versement.)
      const versementsExistants = await prisma.versementCotisation.count({
        where: { cotisationId: cotisation.id, membreId },
      });
      if (versementsExistants > 0) {
        return echec(
          "Ce membre a déjà réglé cette cotisation ponctuelle. Un seul paiement est autorisé : annulez l'existant pour corriger l'erreur.",
          "membreId",
        );
      }
      if (donnees.montant < plancher) {
        return echec(
          `Le montant remis doit être au moins égal au plancher de ${formatMontant(plancher)} FCFA.`,
          "montant",
        );
      }
      if (!cotisation.autoriserSurplus && donnees.montant > plancher) {
        return echec(
          "Cette action n'autorise pas le surplus volontaire : le montant doit correspondre au plancher.",
          "montant",
        );
      }

      const repartition = repartitionMontant(donnees.montant, plancher);
      montantBase = repartition.base;
      surplus = repartition.surplus;
    } else {
      // --- Anonyme / travaux / quête : montant libre, donateur facultatif.
      if (donnees.montant <= 0) {
        return echec("Saisissez un montant supérieur à 0.", "montant");
      }
      const repartition = repartitionMontant(donnees.montant, null);
      montantBase = repartition.base;
      surplus = repartition.surplus;
    }

    await prisma.versementCotisation.create({
      data: {
        cotisationId: cotisation.id,
        membreId,
        montant: montantFinal,
        montantBase,
        surplusVolontaire: surplus,
        moisCoches,
        estAnonyme: donnees.estAnonyme,
        dateEffective,
        dateVersement: dateEffective,
        modePaiement: donnees.modePaiement,
        commentaire: donnees.commentaire,
      },
    });

    revaliderCotisations();

    const detail =
      surplus > 0
        ? `dont ${formatMontant(surplus)} FCFA de don additionnel`
        : moisCoches.length > 0
          ? `pour ${moisCoches.length} mois`
          : "encaissé";
    return {
      success: true,
      message: `Versement de ${formatMontant(montantFinal)} FCFA enregistré (${detail}).`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("enregistrerVersementCotisation", erreur);
  }
}

/**
 * Annule (supprime) un versement de cotisation erroné. Utilisé pour corriger un
 * double paiement ou une saisie fautive : la suppression libère immédiatement le
 * membre (pour une ponctuelle) ou le mois concerné (pour une récurrente).
 */
export async function annulerVersementCotisation(
  _precedentEtat: CotisationFormState,
  formData: FormData,
): Promise<CotisationFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = annulationVersementSchema.safeParse({
    versementId: lireTexte(formData.get("versementId")),
  });
  if (!analyse.success) return echecValidation(analyse.error);
  const { versementId } = analyse.data;

  try {
    const versement = await prisma.versementCotisation.findUnique({
      where: { id: versementId },
      select: {
        id: true,
        montant: true,
        cotisation: { select: { id: true, nom: true, estCloture: true, exercice: { select: { cloture: true } } } },
      },
    });
    if (!versement) return echec("Versement introuvable ou déjà annulé.");
    if (versement.cotisation.estCloture || versement.cotisation.exercice.cloture) {
      return echec(
        `La cotisation « ${versement.cotisation.nom} » est clôturée : annulation du versement impossible.`,
      );
    }

    await prisma.versementCotisation.delete({ where: { id: versement.id } });

    revaliderCotisations();
    return {
      success: true,
      message: `Le versement de ${formatMontant(Number(versement.montant))} FCFA sur « ${versement.cotisation.nom} » a été annulé.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("annulerVersementCotisation", erreur);
  }
}

// ---------------------------------------------------------------------------
// Server Action — lien public de relevé annuel
// ---------------------------------------------------------------------------

/** Retour de `obtenirLienReleveMembre` (lien public /releve/[token]). */
export type LienReleveMembre = {
  success: boolean;
  message: string;
  /** Chemin relatif `/releve/{tokenConsultation}`, null si indisponible. */
  url: string | null;
  /** URL complète (protocole + hôte) prête à être partagée. */
  urlAbsolu: string | null;
};

/**
 * Renvoie l'URL publique du relevé annuel d'un membre à partir de son jeton
 * unique de consultation (`Membre.tokenConsultation`). Le jeton n'est jamais
 * retourné seul : seul le chemin de la page publique est partagé.
 */
export async function obtenirLienReleveMembre(
  membreId: string,
): Promise<LienReleveMembre> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, url: null, urlAbsolu: null };
  }
  const analyse = identifiantSchema.safeParse(membreId);
  if (!analyse.success) {
    return {
      success: false,
      message: "Identifiant de membre invalide.",
      url: null,
      urlAbsolu: null,
    };
  }

  try {
    const membre = await prisma.membre.findUnique({
      where: { id: analyse.data },
      select: { id: true, tokenConsultation: true },
    });
    if (!membre) {
      return {
        success: false,
        message: "Membre introuvable : lien de relevé indisponible.",
        url: null,
        urlAbsolu: null,
      };
    }

    // Migration sans perte : les membres créés avant le backfill peuvent
    // avoir un `tokenConsultation` nul — on le génère alors à la volée.
    let jeton = membre.tokenConsultation;
    if (!jeton) {
      jeton = randomUUID();
      await prisma.membre.update({
        where: { id: membre.id },
        data: { tokenConsultation: jeton },
      });
    }

    const url = `/releve/${jeton}`;

    // URL absolue : hôte lu sur la requête courante (copier-coller du lien).
    const entetes = await headers();
    const hote = entetes.get("x-forwarded-host") ?? entetes.get("host");
    const protocole = entetes.get("x-forwarded-proto") ?? "http";

    return {
      success: true,
      message: "Lien du relevé annuel prêt.",
      url,
      urlAbsolu: hote ? `${protocole}://${hote}${url}` : null,
    };
  } catch (erreur) {
    console.error("Erreur serveur (obtenirLienReleveMembre) :", erreur);
    return {
      success: false,
      message: "Impossible de générer le lien du relevé pour le moment.",
      url: null,
      urlAbsolu: null,
    };
  }
}
