"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { exigerAccesChemin } from "@/lib/garde-actions";
import type { CulteFormState } from "@/types/culte";

// ---------------------------------------------------------------------------
// Schémas Zod — planification d'événements (AUCUN champ financier)
// ---------------------------------------------------------------------------

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dateSchema = z
  .string()
  .trim()
  .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
  .refine((valeur) => !Number.isNaN(Date.parse(valeur)), "Date invalide.");

const HEURE_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const heureSchema = z
  .string()
  .trim()
  .regex(HEURE_REGEX, "Heure invalide (format HH:MM).")
  .optional()
  .nullish();

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

const culteSchema = z.object({
  id: identifiantSchema.optional(),
  date: dateSchema,
  intitule: z
    .string()
    .trim()
    .min(2, "L'intitulé doit contenir au moins 2 caractères.")
    .max(120, "L'intitulé ne peut pas dépasser 120 caractères."),
  lieu: z.string().trim().max(120, "Le lieu ne peut pas dépasser 120 caractères.").nullish(),
  description: z.string().trim().max(1000, "Description trop longue (1000 max).").nullish(),
  theme: z.string().trim().max(200, "Le thème ne peut pas dépasser 200 caractères.").nullish(),
  descriptionTheme: z
    .string()
    .trim()
    .max(2000, "La description du thème est trop longue (2000 max).")
    .nullish(),
  type: z.enum(["OPTIONNEL", "RESPONSABILISE"], {
    message: "Type d'événement invalide.",
  }).default("OPTIONNEL"),
  statut: z.enum(["PLANIFIE", "TERMINE", "ANNULE"], {
    message: "Statut d'événement invalide.",
  }).default("PLANIFIE"),
  responsableMembreId: z.string().trim().nullish(),
  dateFin: dateSchema.nullish(),
  heureDebut: heureSchema.nullish(),
  heureFin: heureSchema.nullish(),
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
  revalidatePath("/dashboard");
}

/** Accès Prisma tolérant : le client généré peut précéder la migration. */
function clientSouple() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma as any;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/** Crée ou met à jour un événement (date unique, intitulé, lieu, description). */
export async function enregistrerCulte(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = culteSchema.safeParse({
    id: lireTexte(formData.get("id")) || undefined,
    date: lireTexte(formData.get("date")),
    intitule: lireTexte(formData.get("intitule")),
    lieu: lireTexte(formData.get("lieu")) || undefined,
    description: lireTexte(formData.get("description")) || undefined,
    theme: lireTexte(formData.get("theme")) || undefined,
    descriptionTheme:
      lireTexte(formData.get("descriptionTheme")) || undefined,
    type: lireTexte(formData.get("type")) || undefined,
    statut: lireTexte(formData.get("statut")) || undefined,
    responsableMembreId:
      lireTexte(formData.get("responsableMembreId")) || undefined,
    dateFin: lireTexte(formData.get("dateFin")) || undefined,
    heureDebut: lireTexte(formData.get("heureDebut")) || undefined,
    heureFin: lireTexte(formData.get("heureFin")) || undefined,
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const {
    id,
    date,
    intitule,
    lieu,
    description,
    theme,
    descriptionTheme,
    type,
    statut,
    responsableMembreId,
    dateFin,
    heureDebut,
    heureFin,
  } = analyse.data;
  const dateCulte = resoudreDate(date);
  const dateFinCulte = dateFin ? resoudreDate(dateFin) : null;
  const db = clientSouple();

  try {
    if (id) {
      await db.culte.update({
        where: { id },
        data: {
          date: dateCulte,
          dateFin: dateFinCulte,
          intitule,
          lieu: lieu ?? null,
          description: description ?? null,
          theme: theme ?? null,
          descriptionTheme: descriptionTheme ?? null,
          statut,
          type,
          responsableMembreId: responsableMembreId ?? null,
          heureDebut: heureDebut ?? null,
          heureFin: heureFin ?? null,
        },
      });
    } else {
      await db.culte.create({
        data: {
          date: dateCulte,
          dateFin: dateFinCulte,
          intitule,
          lieu: lieu ?? null,
          description: description ?? null,
          theme: theme ?? null,
          descriptionTheme: descriptionTheme ?? null,
          statut,
          type,
          responsableMembreId: responsableMembreId ?? null,
          heureDebut: heureDebut ?? null,
          heureFin: heureFin ?? null,
        },
      });
    }
    revaliderCultes();
    return {
      success: true,
      message: id ? "L'événement a été mis à jour." : "L'événement a été planifié.",
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
        message: "Un événement est déjà planifié à cette date.",
        fieldErrors: { date: ["Un événement existe déjà à cette date."] },
      };
    }
    return erreurServeur("enregistrerCulte", erreur);
  }
}

/** Marque un événement comme terminé (bouton « Marquer comme terminé »). */
export async function marquerCulteTermine(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = z.object({ culteId: identifiantSchema }).safeParse({
    culteId: lireTexte(formData.get("culteId")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  try {
    try {
      await clientSouple().culte.update({
        where: { id: analyse.data.culteId },
        data: { statut: "TERMINE" },
      });
    } catch {
      console.warn("marquerCulteTermine : colonne statut absente, migration Prisma requise.");
    }
    revaliderCultes();
    return { success: true, message: "L'événement a été marqué comme terminé.", fieldErrors: {} };
  } catch (erreur) {
    return erreurServeur("marquerCulteTermine", erreur);
  }
}

/** Supprime un événement planifié (ses tâches sont supprimées en cascade). */
export async function supprimerCulte(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = z.object({ culteId: identifiantSchema }).safeParse({
    culteId: lireTexte(formData.get("culteId")),
  });
  if (!analyse.success) return echecValidation(analyse.error);

  try {
    await clientSouple().culte.delete({ where: { id: analyse.data.culteId } });
    revaliderCultes();
    return { success: true, message: "L'événement a été supprimé.", fieldErrors: {} };
  } catch (erreur) {
    return erreurServeur("supprimerCulte", erreur);
  }
}

/** Crée ou met à jour une tâche d'événement (titre, responsable, type, horaires, équipe). */
export async function enregistrerTache(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const membresEquipe = formData
    .getAll("membresEquipe")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  const analyse = tacheSchema.safeParse({
    id: lireTexte(formData.get("id")) || undefined,
    culteId: lireTexte(formData.get("culteId")),
    titre: lireTexte(formData.get("titre")),
    description: lireTexte(formData.get("description")) || undefined,
    heureDebut: lireTexte(formData.get("heureDebut")) || undefined,
    heureFin: lireTexte(formData.get("heureFin")) || undefined,
    statut: lireTexte(formData.get("statut")) || undefined,
    typeTacheId: lireTexte(formData.get("typeTacheId")) || undefined,
    responsableId: lireTexte(formData.get("responsableId")) || undefined,
    dateTache: lireTexte(formData.get("dateTache")) || undefined,
    membresEquipe,
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const {
    id,
    culteId,
    titre,
    description,
    heureDebut,
    heureFin,
    statut,
    typeTacheId,
    responsableId,
    dateTache,
    membresEquipe: equipe,
  } = analyse.data;
  const db = clientSouple();
  const dateTacheDate = dateTache ? new Date(dateTache) : null;

  try {
    if (id) {
      await db.tacheEvenement.update({
        where: { id },
        data: {
          titre,
          description: description ?? null,
          heureDebut: heureDebut ?? null,
          heureFin: heureFin ?? null,
          statut: statut ?? "A_FAIRE",
          typeTacheId: typeTacheId ?? null,
          responsableMembreId: responsableId ?? null,
          dateTache: dateTacheDate,
          membresEquipe: { set: equipe },
        },
      });
    } else {
      await db.tacheEvenement.create({
        data: {
          culteId,
          titre,
          description: description ?? null,
          heureDebut: heureDebut ?? null,
          heureFin: heureFin ?? null,
          statut: statut ?? "A_FAIRE",
          typeTacheId: typeTacheId ?? null,
          responsableMembreId: responsableId ?? null,
          dateTache: dateTacheDate,
          membresEquipe: equipe,
        },
      });
    }
    revaliderCultes();
    return {
      success: true,
      message: id ? "La tâche a été mise à jour." : "La tâche a été créée.",
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("enregistrerTache", erreur);
  }
}

// ---------------------------------------------------------------------------
// Schémas Zod — tâches et types de tâches
// ---------------------------------------------------------------------------

const tacheSchema = z.object({
  id: identifiantSchema.optional(),
  culteId: identifiantSchema,
  titre: z
    .string()
    .trim()
    .min(2, "L'intitulé de la tâche doit contenir au moins 2 caractères.")
    .max(120, "L'intitulé ne peut pas dépasser 120 caractères."),
  description: z.string().trim().max(1000, "Description trop longue (1000 max).").nullish(),
  heureDebut: z.string().trim().optional().nullish(),
  heureFin: z.string().trim().optional().nullish(),
  statut: z.enum(["A_FAIRE", "EN_COURS", "CLOTUREE"]).default("A_FAIRE"),
  typeTacheId: z.string().trim().nullish(),
  responsableId: z.string().trim().nullish(),
  dateTache: z.string().optional().nullable(),
  membresEquipe: z.array(z.string()).default([]),
});

const typeTacheSchema = z.object({
  action: z.enum(["create", "update", "delete", "list"]),
  id: identifiantSchema.optional(),
  libelle: z
    .string()
    .trim()
    .min(2, "Le libellé doit contenir au moins 2 caractères.")
    .max(100, "Le libellé ne peut pas dépasser 100 caractères.")
    .optional(),
  couleur: z.string().trim().optional().nullish(),
  estParDefaut: z.boolean().optional(),
});


/** Met à jour une tâche d'événement existante (responsable, équipe, horaire). */
export async function modifierTache(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }

  const equipeMembreIds = formData.getAll("equipeMembreIds").filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  const analyse = tacheSchema.safeParse({
    id: lireTexte(formData.get("id")) || undefined,
    culteId: lireTexte(formData.get("culteId")),
    titre: lireTexte(formData.get("titre")),
    description: lireTexte(formData.get("description")) || undefined,
    heureDebut: lireTexte(formData.get("heureDebut")) || undefined,
    heureFin: lireTexte(formData.get("heureFin")) || undefined,
    statut: lireTexte(formData.get("statut")) || "A_FAIRE",
    typeTacheId: lireTexte(formData.get("typeTacheId")) || undefined,
    responsableId: lireTexte(formData.get("responsableId")) || undefined,
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { id, culteId, titre, description, heureDebut, heureFin, statut, typeTacheId, responsableId } =
    analyse.data;
  if (!id) {
    return { success: false, message: "Identifiant de tâche manquant.", fieldErrors: { _form: ["Identifiant de tâche manquant."] } };
  }
  const db = clientSouple();

  try {
    await db.tacheEvenement.update({
      where: { id },
      data: {
        culteId,
        titre,
        description: description ?? null,
        heureDebut: heureDebut ?? null,
        heureFin: heureFin ?? null,
        statut,
        membresEquipe: { set: equipeMembreIds },
        responsable: responsableId ? { connect: { id: responsableId } } : { set: null },
        typeTache: typeTacheId ? { connect: { id: typeTacheId } } : { set: null },
      },
    });
    revaliderCultes();
    return { success: true, message: "La tâche a été mise à jour.", fieldErrors: {} };
  } catch (erreur) {
    return erreurServeur("modifierTache", erreur);
  }
}

/** Bascule rapidement le statut d'une tâche (A_FAIRE / EN_COURS / CLOTUREE). */
export async function changerStatutTache(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<CulteFormState> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }

  const analyse = z
    .object({
      id: identifiantSchema,
      statut: z.enum(["A_FAIRE", "EN_COURS", "CLOTUREE"], {
        message: "Statut de tâche invalide.",
      }),
    })
    .safeParse({
      id: lireTexte(formData.get("id")),
      statut: lireTexte(formData.get("statut")),
    });
  if (!analyse.success) return echecValidation(analyse.error);

  const { id, statut } = analyse.data;
  const db = clientSouple();

  try {
    await db.tacheEvenement.update({
      where: { id },
      data: { statut },
    });
    revaliderCultes();
    return {
      success: true,
      message: `Statut de la tâche mis à jour (${statut}).`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("changerStatutTache", erreur);
  }
}

// ---------------------------------------------------------------------------
// Server Action — gestion des types de tâches personnalisés (CRUD)
// ---------------------------------------------------------------------------

type TypeTacheActionResult =
  | CulteFormState
  | {
      success: true;
      message: string;
      types: Array<{ id: string; libelle: string; couleur: string | null; estParDefaut: boolean }>;
      fieldErrors: {};
    };

/** Crée, lit, met à jour ou supprime un type de tâche personnalisé. */
export async function gererTypesTache(
  _precedentEtat: CulteFormState,
  formData: FormData,
): Promise<TypeTacheActionResult> {
  const garde = await exigerAccesChemin("/cultes");
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }

  const analyse = typeTacheSchema.safeParse({
    action: lireTexte(formData.get("action")) || "list",
    id: lireTexte(formData.get("id")) || undefined,
    libelle: lireTexte(formData.get("libelle")) || undefined,
    couleur: lireTexte(formData.get("couleur")) || undefined,
    estParDefaut: formData.get("estParDefaut") === "on" || formData.get("estParDefaut") === "true",
  });
  if (!analyse.success) return echecValidation(analyse.error);

  const { action, id, libelle, couleur, estParDefaut } = analyse.data;
  const db = clientSouple();

  try {
    switch (action) {
      case "create": {
        if (!libelle) {
          return {
            success: false,
            message: "Le libellé est requis pour créer un type de tâche.",
            fieldErrors: { libelle: ["Le libellé est requis."] },
          };
        }
        await db.typeTache.create({
          data: {
            libelle,
            couleur: couleur ?? null,
            estParDefaut: estParDefaut ?? false,
          },
        });
        revaliderCultes();
        return { success: true, message: "Type de tâche créé.", fieldErrors: {} };
      }

      case "update": {
        if (!id) {
          return {
            success: false,
            message: "Identifiant manquant pour la mise à jour.",
            fieldErrors: { _form: ["Identifiant manquant."] },
          };
        }
        await db.typeTache.update({
          where: { id },
          data: {
            ...(libelle ? { libelle } : {}),
            ...(couleur !== undefined ? { couleur } : {}),
            ...(estParDefaut !== undefined ? { estParDefaut } : {}),
          },
        });
        revaliderCultes();
        return { success: true, message: "Type de tâche mis à jour.", fieldErrors: {} };
      }

      case "delete": {
        if (!id) {
          return {
            success: false,
            message: "Identifiant manquant pour la suppression.",
            fieldErrors: { _form: ["Identifiant manquant."] },
          };
        }
        await db.typeTache.delete({ where: { id } });
        revaliderCultes();
        return { success: true, message: "Type de tâche supprimé.", fieldErrors: {} };
      }

      case "list": {
        const types = await db.typeTache.findMany({
          orderBy: [{ estParDefaut: "desc" }, { libelle: "asc" }],
        });
        return {
          success: true,
          message: "Types de tâches chargés.",
          types: types.map((t: any) => ({
            id: t.id,
            libelle: t.libelle,
            couleur: t.couleur,
            estParDefaut: t.estParDefaut,
          })),
          fieldErrors: {},
        };
      }

      default: {
        return {
          success: false,
          message: "Action non reconnue.",
          fieldErrors: { _form: ["Action non reconnue."] },
        };
      }
    }
  } catch (erreur) {
    return erreurServeur("gererTypesTache", erreur);
  }
}

/** Récupère la liste de tous les types de tâches. */
export async function listerTypesTache() {
  const db = clientSouple();
  const types = await db.typeTache.findMany({
    orderBy: [{ estParDefaut: "desc" }, { libelle: "asc" }],
  });
  return types.map((t: any) => ({
    id: t.id,
    libelle: t.libelle,
    couleur: t.couleur,
    estParDefaut: t.estParDefaut,
  }));
}

/** Récupère la liste des membres de l'église pour l'assignation des tâches. */
export async function listerMembres() {
  const db = clientSouple();
  const rows = await db.membre.findMany({
    orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
    select: { id: true, nom: true, prenoms: true },
  });
  return rows.map((m: any) => ({
    id: m.id,
    nomComplet: `${m.prenoms ?? ""} ${m.nom ?? ""}`.trim() || "Membre",
  }));
}
