"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { exigerEcritureMembres } from "@/lib/garde-actions";
import { validerPhotoDataUrl } from "@/lib/photo";
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
  nomPere: z.string().max(160, "160 caractères maximum.").nullish(),
  nomMere: z.string().max(160, "160 caractères maximum.").nullish(),
  dateNaissance: z
    .string()
    .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide.")
    .nullish(),
  sexe: z.enum(["Masculin", "Féminin"], { message: "Sélectionnez le sexe." }),
  etatCivil: z.string().max(60, "60 caractères maximum.").nullish(),
  telephone: z
    .string()
    .superRefine((valeur, ctx) => {
      const nettoye = valeur.trim();
      // Champ vide ou uniquement l'indicatif (ex. « +228 » sans chiffres derrière)
      // → message explicite invitant à saisir un numéro valide.
      if (nettoye === "" || /^\+?\s*\d{1,3}$/.test(nettoye)) {
        ctx.addIssue("Veuillez renseigner un numéro de téléphone valide.");
        return;
      }
      if (!TELEPHONE_REGEX.test(nettoye)) {
        ctx.addIssue(
          "Numéro de téléphone invalide (chiffres requis, + et espaces acceptés).",
        );
      }
    }),
  telephoneFixe: z
    .string()
    .regex(TELEPHONE_REGEX, "Numéro fixe invalide.")
    .nullish(),
  email: z.email("Adresse e-mail invalide.").nullish(),
  adresse: z.string().max(500, "L'adresse ne peut pas dépasser 500 caractères.").nullish(),
  adresseLatitude: z.coerce.number().min(-90).max(90).nullish(),
  adresseLongitude: z.coerce.number().min(-180).max(180).nullish(),
  profession: z.string().max(120, "La profession ne peut pas dépasser 120 caractères.").nullish(),
  lieuTravail: z.string().max(200, "200 caractères maximum.").nullish(),
  adresseProfessionnelle: z.string().max(300, "300 caractères maximum.").nullish(),
  telephoneProfessionnel: z
    .string()
    .regex(TELEPHONE_REGEX, "Numéro professionnel invalide.")
    .nullish(),
  classificationSociale: z.string().max(120, "120 caractères maximum.").nullish(),
  statutMembre: z.string().max(120, "120 caractères maximum.").nullish(),
  typePersonne: z.string().min(1, "Le type de personne est obligatoire."),
  membreDepuis: z
    .string()
    .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide.")
    .nullish(),
  dateConversion: z
    .string()
    .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide.")
    .nullish(),
  egliseConversion: z.string().max(200, "200 caractères maximum.").nullish(),
  eglisePrecedente: z.string().max(200, "200 caractères maximum.").nullish(),
  bapteme: z.boolean(),
  dateBapteme: z
    .string()
    .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
    .refine((valeur) => !Number.isNaN(Date.parse(valeur)), "Date invalide.")
    .nullish(),
  fonctions: z.array(z.string().min(1)).max(20, "20 fonctions maximum."),
  // Photo du membre : data URL (« data:image/jpeg;base64, … »). Le champ est
  // vide si l'utilisateur n'a pas choisi de nouvelle photo ; `photoModifiee`
  // indique alors que la photo existante doit être conservée telle quelle.
  photoDataUrl: z
    .string()
    .trim()
    .max(1_500_000, "Photo trop volumineuse (1,5 Mo maximum après encodage).")
    .optional()
    .default(""),
  photoModifiee: z.boolean().default(false),
  photoSupprimee: z.boolean().default(false),
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

function lireNombreOptionnel(valeur: FormDataEntryValue | null): number | null {
  if (typeof valeur !== "string") return null;
  const t = valeur.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
/**
 * Détecte une violation de contrainte d'unicité Prisma (code P2002) et
 * renvoie le nom du champ en conflit — « telephone », « email » ou tout
 * autre champ unique —, ou `null` s'il ne s'agit pas d'une telle erreur.
 *
 * Selon le connecteur, `meta.target` contient soit le nom du champ
 * (« telephone », « email ») soit celui de la contrainte d'unicité
 * (« Membre_telephone_key », « Membre_email_key »).
 */
function champEnConflit(erreur: unknown): string | null {
  if (typeof erreur !== "object" || erreur === null) return null;
  if (!(erreur instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (erreur.code !== "P2002") return null;

  const cible = erreur.meta?.target;
  const cibles = Array.isArray(cible)
    ? cible.map(String)
    : typeof cible === "string"
      ? cible.split(/,\s*/)
      : [];

  // On teste la présence du mot-clé dans chaque cible pour couvrir à la
  // fois le nom du champ et celui de la contrainte d'unicité.
  const correspond = (motCle: string) =>
    cibles.some((c) => c === motCle || c.toLowerCase().includes(motCle));

  if (correspond("telephone")) return "telephone";
  if (correspond("email")) return "email";

  // Tout autre champ unique : on renvoie son nom (nettoyé du préfixe de
  // contrainte) afin de produire un message explicite côté client.
  if (cibles.length > 0) return nettoyerNomContrainte(cibles[0]);
  return null;
}

/**
 * Extrait un nom de champ lisible depuis une cible Prisma :
 * « Membre_telephone_key » → « telephone » ; « telephone » → « telephone ».
 */
function nettoyerNomContrainte(brut: string): string {
  const nettoye = brut
    .replace(/^[A-Za-z][A-Za-z0-9]*_/, "") // retire le préfixe « <Table>_ »
    .replace(/_key$/i, "") // retire le suffixe « _key »
    .trim();
  return nettoye.length > 0 ? nettoye : brut;
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
  const garde = await exigerEcritureMembres();
  if (!garde.ok) {
    return {
      success: false,
      message: garde.message,
      fieldErrors: { _form: [garde.message] },
      membreId: null,
    };
  }
  const brut = {
    id: lireTexte(formData.get("id")) || undefined,
    nom: lireTexte(formData.get("nom")),
    prenoms: lireTexte(formData.get("prenoms")),
    nomPere: lireTexteOptionnel(formData.get("nomPere")),
    nomMere: lireTexteOptionnel(formData.get("nomMere")),
    dateNaissance: lireTexteOptionnel(formData.get("dateNaissance")),
    sexe: lireTexte(formData.get("sexe")),
    etatCivil: lireTexteOptionnel(formData.get("etatCivil")),
    telephone: lireTexte(formData.get("telephone")),
    telephoneFixe: lireTexteOptionnel(formData.get("telephoneFixe")),
    email: lireTexteOptionnel(formData.get("email")),
    adresse: lireTexteOptionnel(formData.get("adresse")),
    adresseLatitude: lireNombreOptionnel(formData.get("adresseLatitude")),
    adresseLongitude: lireNombreOptionnel(formData.get("adresseLongitude")),
    profession: lireTexteOptionnel(formData.get("profession")),
    lieuTravail: lireTexteOptionnel(formData.get("lieuTravail")),
    adresseProfessionnelle: lireTexteOptionnel(formData.get("adresseProfessionnelle")),
    telephoneProfessionnel: lireTexteOptionnel(formData.get("telephoneProfessionnel")),
    classificationSociale: lireTexteOptionnel(formData.get("classificationSociale")),
    statutMembre: lireTexteOptionnel(formData.get("statutMembre")),
    typePersonne: lireTexte(formData.get("typePersonne")),
    membreDepuis: lireTexteOptionnel(formData.get("membreDepuis")),
    dateConversion: lireTexteOptionnel(formData.get("dateConversion")),
    egliseConversion: lireTexteOptionnel(formData.get("egliseConversion")),
    eglisePrecedente: lireTexteOptionnel(formData.get("eglisePrecedente")),
    bapteme: formData.get("bapteme") === "on",
    dateBapteme: lireTexteOptionnel(formData.get("dateBapteme")),
    fonctions: lireTexte(formData.get("fonctions"))
      .split(",")
      .map((fonction) => fonction.trim())
      .filter((fonction) => fonction.length > 0),
    photoDataUrl: lireTexte(formData.get("photoDataUrl")),
    photoModifiee: formData.get("photoModifiee") === "on",
    photoSupprimee: formData.get("photoSupprimee") === "on",
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

  // --- Photo -------------------------------------------------------------
  // Le format et la taille de la data URL sont re-contrôlés côté serveur :
  // la validation du client ne suffit jamais (requête forgée, ancien
  // navigateur…). `photoModifiee` distingue « nouvelle photo » de « photo
  // inchangée » — sans ce drapeau, la photo existante serait écrasée par
  // une chaîne vide à chaque enregistrement.
  let photoACopier: string | null | undefined;
  if (donnees.photoSupprimee) {
    photoACopier = null;
  } else if (donnees.photoModifiee) {
    // Une « modification » sans data URL ne peut pas venir du formulaire
    // (qui n'envoie le champ qu Accompagné de `photoModifiee`) : on la
    // traite comme une suppression plutôt que d'écraser la photo par "".
    if (donnees.photoDataUrl === "") {
      photoACopier = null;
    } else {
      const erreurPhoto = validerPhotoDataUrl(donnees.photoDataUrl);
      if (erreurPhoto) {
        return {
          success: false,
          message: erreurPhoto,
          fieldErrors: { photoDataUrl: [erreurPhoto] },
          membreId: null,
        };
      }
      photoACopier = donnees.photoDataUrl;
    }
  }

  // Le champ JSON n'est renseigné qu'au moins une donnée ecclésiastique saisie.
  // Prisma impose `Prisma.JsonNull` (et non `null`) pour un champ Json nullable.
  const donneesEcclesiastiques: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
    donnees.bapteme ||
    donnees.dateBapteme ||
    donnees.fonctions.length > 0 ||
    donnees.nomPere ||
    donnees.nomMere ||
    donnees.dateNaissance ||
    donnees.sexe ||
    donnees.etatCivil ||
    donnees.telephoneFixe ||
    donnees.lieuTravail ||
    donnees.adresseProfessionnelle ||
    donnees.telephoneProfessionnel ||
    donnees.classificationSociale ||
    donnees.statutMembre ||
    donnees.typePersonne ||
    donnees.membreDepuis ||
    donnees.dateConversion ||
    donnees.egliseConversion ||
    donnees.eglisePrecedente ||
    donnees.adresseLatitude != null ||
    donnees.adresseLongitude != null
      ? {
          bapteme: donnees.bapteme,
          ...(donnees.dateBapteme ? { dateBapteme: donnees.dateBapteme } : {}),
          ...(donnees.fonctions.length > 0 ? { fonctions: donnees.fonctions } : {}),
          ...(donnees.nomPere ? { nomPere: donnees.nomPere } : {}),
          ...(donnees.nomMere ? { nomMere: donnees.nomMere } : {}),
          ...(donnees.dateNaissance ? { dateNaissance: donnees.dateNaissance } : {}),
          ...(donnees.sexe ? { sexe: donnees.sexe } : {}),
          ...(donnees.etatCivil ? { etatCivil: donnees.etatCivil } : {}),
          ...(donnees.telephoneFixe ? { telephoneFixe: donnees.telephoneFixe } : {}),
          ...(donnees.lieuTravail ? { lieuTravail: donnees.lieuTravail } : {}),
          ...(donnees.adresseProfessionnelle ? { adresseProfessionnelle: donnees.adresseProfessionnelle } : {}),
          ...(donnees.telephoneProfessionnel ? { telephoneProfessionnel: donnees.telephoneProfessionnel } : {}),
          ...(donnees.classificationSociale ? { classificationSociale: donnees.classificationSociale } : {}),
          ...(donnees.statutMembre ? { statutMembre: donnees.statutMembre } : {}),
          ...(donnees.typePersonne ? { typePersonne: donnees.typePersonne } : {}),
          ...(donnees.membreDepuis ? { membreDepuis: donnees.membreDepuis } : {}),
          ...(donnees.dateConversion ? { dateConversion: donnees.dateConversion } : {}),
          ...(donnees.egliseConversion ? { egliseConversion: donnees.egliseConversion } : {}),
          ...(donnees.eglisePrecedente ? { eglisePrecedente: donnees.eglisePrecedente } : {}),
          ...(donnees.adresseLatitude != null ? { adresseLatitude: donnees.adresseLatitude } : {}),
          ...(donnees.adresseLongitude != null ? { adresseLongitude: donnees.adresseLongitude } : {}),
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
    // `undefined` = ne pas toucher à la photo existante ; `null` = la
    // supprimer ; une chaîne = la remplacer par la nouvelle data URL.
    ...(photoACopier !== undefined ? { photoDataUrl: photoACopier } : {}),
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
    // --- Contrainte d'unicité Prisma (P2002) : messages explicites, jamais
    //     le message générique « Vérifiez la connexion à la base ». ---
    const champ = champEnConflit(erreur);
    if (champ) {
      if (champ === "telephone") {
        return {
          success: false,
          message: "Ce numéro de téléphone est déjà utilisé par un autre membre.",
          fieldErrors: {
            telephone: ["Ce numéro de téléphone est déjà enregistré."],
          },
          membreId: null,
        };
      }

      if (champ === "email") {
        return {
          success: false,
          message: "Cette adresse e-mail est déjà utilisée par un autre membre.",
          fieldErrors: {
            email: ["Cette adresse e-mail est déjà enregistrée."],
          },
          membreId: null,
        };
      }

      // Tout autre champ unique : message explicite citant le champ en doublon.
      return {
        success: false,
        message: `La valeur du champ « ${champ} » est déjà utilisée par un autre membre.`,
        fieldErrors: {
          [champ]: [`Ce champ « ${champ} » est déjà enregistré.`],
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

