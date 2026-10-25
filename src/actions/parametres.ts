"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { consignerAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import {
  ecrireConfiguration,
  lireConfiguration,
} from "@/lib/configuration-eglise";
import { aAccesAuChemin } from "@/lib/permissions";
import type { ParametresFormState } from "@/lib/parametres-types";

// NOTE : `ParametresFormState` et `initialParametresFormState` sont hébergés
// dans src/lib/parametres-types.ts — un fichier "use server" ne doit exporter
// QUE des fonctions asynchrones. Une constante d'état de formulaire n'en est
// pas une : Next.js refuserait le build avec « Server Actions must be async ».

const parametresSchema = z.object({
  // Onglet « Identité & Légal ».
  nomOfficiel: z.string().trim().min(2, "Nom de l'église requis (2 caractères min.).").max(150),
  mission: z.string().trim().max(500, "500 caractères maximum.").optional().default(""),
  numeroEnregistrement: z.string().trim().max(80, "80 caractères maximum.").optional().default(""),
  numeroIfu: z.string().trim().max(80, "80 caractères maximum.").optional().default(""),
  rib: z.string().trim().max(80, "80 caractères maximum.").optional().default(""),
  adresseSiege: z.string().trim().max(250).optional().default(""),
  ville: z.string().trim().max(120, "120 caractères maximum.").optional().default(""),
  localisationGps: z.string().trim().max(80, "80 caractères maximum.").optional().default(""),
  // Onglet « Coordonnées & Responsables ».
  emailContact: z.email("E-mail de contact invalide.").or(z.literal("")),
  telephones: z.array(z.string().trim().max(30, "30 caractères maximum par numéro.")).default([""]),
  pasteurPrincipal: z.string().trim().max(120, "120 caractères maximum.").optional().default(""),
  secretariat: z.string().trim().max(150, "150 caractères maximum.").optional().default(""),
  // Onglet « Devise & Exercice ».
  devise: z.enum(["XOF", "XAF", "EUR", "USD"], "Devise invalide."),
  symboleDevise: z.string().trim().min(1, "Symbole requis.").max(6),
  moisDebutExercice: z.coerce
    .number({ message: "Le mois de début doit être un nombre entre 1 et 12." })
    .int("Le mois de début doit être un entier.")
    .min(1, "Le mois va de 1 (janvier) à 12 (décembre).")
    .max(12, "Le mois va de 1 (janvier) à 12 (décembre).")
    .optional()
    .default(1),
  // Logo officiel (upload) : data URL validée côté serveur (format + taille).
  logoDataUrl: z
    .string()
    .trim()
    .max(2_500_000, "Logo trop volumineux (2 Mo maximum après encodage).")
    .optional()
    .default("")
    .refine(
      (valeur) =>
        valeur === "" ||
        /^data:image\/(png|jpe?g|svg\+xml|webp);base64,/i.test(valeur),
      "Format de logo non autorisé (PNG, JPG, SVG ou WEBP).",
    ),
});

/**
 * Server Action `enregistrerParametres(formData)` :
 * enregistre l'identité légale (nom officiel, n° d'enregistrement/décret,
 * IFU/SIRET, RIB, siège, GPS/ville), les coordonnées & responsables
 * (e-mail, téléphone, pasteur, secrétariat), la devise, le mois de début
 * d'exercice et le logo officiel (data URL) dans la configuration globale
 * (`data/configuration-eglise.json`).
 *
 * ⚠️ Aucune clé Brevo/SMTP n'est lue ni écrite ici : ces secrets vivent
 * uniquement dans le `.env` du serveur (voir `src/lib/email.ts`).
 *
 * Réservée à l'ADMINISTRATEUR (redirigée sinon par le middleware).
 */
export async function enregistrerParametres(
  _precedent: ParametresFormState,
  formData: FormData,
): Promise<ParametresFormState> {
  const session = await auth().catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role ?? null;
  if (!session?.user || !aAccesAuChemin(role, "/parametres")) {
    return {
      success: false,
      message: "Accès réservé à l'administrateur.",
      fieldErrors: {},
    };
  }

  // Numéros de téléphone : plusieurs champs telephone_0, telephone_1, …
  const telephonesBrut: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    const valeur = formData.get(`telephone_${i}`);
    if (valeur !== null && String(valeur).trim() !== "") {
      telephonesBrut.push(String(valeur).trim());
    }
  }
  if (telephonesBrut.length === 0) {
    telephonesBrut.push("");
  }

  const analyse = parametresSchema.safeParse({
    nomOfficiel: formData.get("nomOfficiel"),
    mission: formData.get("mission") ?? "",
    numeroEnregistrement: formData.get("numeroEnregistrement") ?? "",
    numeroIfu: formData.get("numeroIfu") ?? "",
    rib: formData.get("rib") ?? "",
    adresseSiege: formData.get("adresseSiege") ?? "",
    ville: formData.get("ville") ?? "",
    localisationGps: formData.get("localisationGps") ?? "",
    emailContact: formData.get("emailContact"),
    telephones: telephonesBrut,
    pasteurPrincipal: formData.get("pasteurPrincipal") ?? "",
    secretariat: formData.get("secretariat") ?? "",
    devise: formData.get("devise"),
    symboleDevise: formData.get("symboleDevise"),
    moisDebutExercice: formData.get("moisDebutExercice") ?? "",
    logoDataUrl: formData.get("logoDataUrl") ?? "",
  });

  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return { success: false, message: "Vérifiez les champs signalés.", fieldErrors };
  }

  const precedent = await lireConfiguration().catch(() => null);

  await ecrireConfiguration({
    nomOfficiel: analyse.data.nomOfficiel.trim(),
    mission: analyse.data.mission.trim(),
    numeroEnregistrement: analyse.data.numeroEnregistrement.trim(),
    numeroIfu: analyse.data.numeroIfu.trim(),
    rib: analyse.data.rib.trim(),
    adresseSiege: (analyse.data.adresseSiege ?? "").trim(),
    ville: analyse.data.ville.trim(),
    localisationGps: analyse.data.localisationGps.trim(),
    emailContact: analyse.data.emailContact.trim(),
    telephones: analyse.data.telephones,
    pasteurPrincipal: analyse.data.pasteurPrincipal.trim(),
    secretariat: analyse.data.secretariat.trim(),
    devise: analyse.data.devise,
    symboleDevise: analyse.data.symboleDevise.trim(),
    moisDebutExercice: analyse.data.moisDebutExercice,
    logoDataUrl: analyse.data.logoDataUrl,
    logoUrl: analyse.data.logoDataUrl || null,
  });

  await consignerAudit({
    action: "PARAMETRES_MISE_A_JOUR",
    entite: "ConfigurationEglise",
    auteurNom: session.user.name ?? session.user.email ?? "Administrateur",
    details: `Paramètres mis à jour : « ${analyse.data.nomOfficiel.trim()} » (devise ${analyse.data.devise}). Ancien nom : « ${precedent?.nomOfficiel || "—"} ».`,
  });

  revalidatePath("/parametres");
  return { success: true, message: "Paramètres enregistrés avec succès.", fieldErrors: {} };
}
