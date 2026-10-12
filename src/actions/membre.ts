"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { MembreFormState } from "@/types/membre";

// ---------------------------------------------------------------------------
// Schéma Zod
// ---------------------------------------------------------------------------

/** National ou international : chiffres, espaces, points, tirets, parenthèses. */
const TELEPHONE_REGEX = /^\+?[0-9][0-9\s.\-()]{6,19}$/;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const membreSchema = z.object({
  id: z.string().min(1).optional(),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  prenoms: z.string().min(2, "Les prénoms doivent contenir au moins 2 caractères."),
  telephone: z
    .string()
    .regex(TELEPHONE_REGEX, "Numéro de téléphone invalide (chiffres requis, + et espaces acceptés)."),
  email: z.email("Adresse e-mail invalide.").nullish(),
  adresse: z.string().max(500, "L'adresse ne peut pas dépasser 500 caractères.").nullish(),
  profession: z.string().max(120, "La profession ne peut pas dépasser 120 caractères.").nullish(),
  bapteme: z.boolean(),
  dateBapteme: z
    .string()
    .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
    .refine((valeur) => !Number.isNaN(Date.parse(valeur)), "Date invalide.")
    .nullish(),
  fonctions: z.array(z.string().min(1)).max(20, "20 fonctions maximum."),
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

/** Détecte une violation de contrainte d'unicité Prisma (code P2002). */
function champEnConflit(erreur: unknown): "telephone" | "email" | null {
  if (typeof erreur !== "object" || erreur === null) return null;
  if ((erreur as { code?: unknown }).code !== "P2002") return null;

  const cible = (erreur as { meta?: { target?: unknown } }).meta?.target;
  const cibles = Array.isArray(cible)
    ? cible.map(String)
    : typeof cible === "string"
      ? cible.split(/,\s*/)
      : [];

  if (cibles.includes("telephone")) return "telephone";
  if (cibles.includes("email")) return "email";
  return null;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Valide (Zod) puis enregistre un membre — création si aucun `id`, sinon
 * mise à jour. Retourne un état exploitable par `useActionState` côté client.
 */
export async function enregistrerMembre(
  _precedentEtat: MembreFormState,
  formData: FormData,
): Promise<MembreFormState> {
  const brut = {
    id: lireTexte(formData.get("id")) || undefined,
    nom: lireTexte(formData.get("nom")),
    prenoms: lireTexte(formData.get("prenoms")),
    telephone: lireTexte(formData.get("telephone")),
    email: lireTexteOptionnel(formData.get("email")),
    adresse: lireTexteOptionnel(formData.get("adresse")),
    profession: lireTexteOptionnel(formData.get("profession")),
    bapteme: formData.get("bapteme") === "on",
    dateBapteme: lireTexteOptionnel(formData.get("dateBapteme")),
    fonctions: lireTexte(formData.get("fonctions"))
      .split(",")
      .map((fonction) => fonction.trim())
      .filter((fonction) => fonction.length > 0),
  };

  const analyse = membreSchema.safeParse(brut);
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }

    return {
      success: false,
      message: "Le formulaire contient des erreurs. Vérifiez les champs signalés.",
      fieldErrors,
      membreId: null,
    };
  }

  const donnees = analyse.data;

  // Le champ JSON n'est renseigné qu'au moins une donnée ecclésiastique saisie.
  // Prisma impose `Prisma.JsonNull` (et non `null`) pour un champ Json nullable.
  const donneesEcclesiastiques: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
    donnees.bapteme || donnees.dateBapteme || donnees.fonctions.length > 0
      ? {
          bapteme: donnees.bapteme,
          ...(donnees.dateBapteme ? { dateBapteme: donnees.dateBapteme } : {}),
          ...(donnees.fonctions.length > 0 ? { fonctions: donnees.fonctions } : {}),
        }
      : Prisma.JsonNull;

  const commun = {
    nom: donnees.nom,
    prenoms: donnees.prenoms,
    telephone: donnees.telephone,
    email: donnees.email,
    adresse: donnees.adresse,
    profession: donnees.profession,
    donneesEcclesiastiques,
  };

  try {
    const membre = donnees.id
      ? await prisma.membre.update({ where: { id: donnees.id }, data: commun })
      : await prisma.membre.create({ data: commun });

    revalidatePath("/membres");
    revalidatePath(`/membres/${membre.id}`);

    return {
      success: true,
      message: donnees.id
        ? "La fiche du membre a été mise à jour."
        : "Le membre a été ajouté au répertoire.",
      fieldErrors: {},
      membreId: membre.id,
    };
  } catch (erreur) {
    const champ = champEnConflit(erreur);
    if (champ) {
      return {
        success: false,
        message:
          champ === "telephone"
            ? "Un membre possède déjà ce numéro de téléphone."
            : "Un membre possède déjà cette adresse e-mail.",
        fieldErrors: {
          [champ]: [
            champ === "telephone"
              ? "Ce numéro est déjà utilisé par un autre membre."
              : "Cet e-mail est déjà utilisé par un autre membre.",
          ],
        },
        membreId: null,
      };
    }

    console.error("Erreur Prisma lors de l'enregistrement d'un membre :", erreur);
    return {
      success: false,
      message: "Impossible d'enregistrer le membre. Vérifiez la connexion à la base de données.",
      fieldErrors: { _form: ["Erreur serveur lors de l'enregistrement."] },
      membreId: null,
    };
  }
}

