"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { consignerAudit } from "@/lib/audit";
import { exigerAdmin } from "@/lib/garde-actions";
import { hacherMotDePasse } from "@/lib/mot-de-passe";
import { prisma } from "@/lib/prisma";
import {
  LIBELLES_ROLE,
  ROLES_UTILISATEUR,
  type RoleUtilisateurValeur,
} from "@/lib/utilisateur";
import type {
  DonneesCreationUtilisateur,
  UtilisateurFormState,
} from "@/types/utilisateur";

// ---------------------------------------------------------------------------
// Schémas Zod
// ---------------------------------------------------------------------------

const LONGUEUR_MOT_DE_PASSE = 8;

const identifiantSchema = z
  .string()
  .trim()
  .min(1, "Identifiant de compte manquant.");

const roleSchema = z.enum(ROLES_UTILISATEUR, { message: "Rôle invalide." });

const creerUtilisateurSchema = z.object({
  nomComplet: z
    .string()
    .trim()
    .min(2, "Le nom complet doit contenir au moins 2 caractères.")
    .max(120, "120 caractères maximum."),
  email: z.email("Adresse e-mail invalide."),
  telephone: z.string().trim().max(30, "30 caractères maximum.").nullish(),
  role: roleSchema,
  motDePasse: z
    .string()
    .min(
      LONGUEUR_MOT_DE_PASSE,
      `Le mot de passe temporaire doit contenir au moins ${LONGUEUR_MOT_DE_PASSE} caractères.`,
    )
    .max(128, "128 caractères maximum.")
    .refine(
      (valeur) => /[A-Za-z]/.test(valeur) && /\d/.test(valeur),
      "Le mot de passe doit contenir au moins une lettre et un chiffre.",
    ),
});

// Le hachage scrypt est mutualisé avec l'authentification NextAuth :
// voir src/lib/mot-de-passe.ts (format « scrypt$sel$empreinte »).

// ---------------------------------------------------------------------------
// Aides de retour
// ---------------------------------------------------------------------------

function echec(message: string, champ = "_form"): UtilisateurFormState {
  return {
    success: false,
    message,
    fieldErrors: { [champ]: [message] },
    utilisateurId: null,
  };
}

function succes(
  message: string,
  utilisateurId: string | null,
): UtilisateurFormState {
  return { success: true, message, fieldErrors: {}, utilisateurId };
}

/** Page rafraîchie après chaque modification (tableau toujours à jour). */
const CHEMIN_COMPTES = "/administration/utilisateurs";

/** Garde-fou : nombre de comptes administrateur actuellement actifs. */
async function nombreAdministrateursActifs(): Promise<number> {
  return prisma.utilisateur.count({
    where: { role: "ADMINISTRATEUR", actif: true },
  });
}

/**
 * Crée un compte utilisateur : mot de passe temporaire haché (scrypt) et rôle
 * attribué. Chaque création est tracée dans le journal d'audit.
 */
export async function creerUtilisateur(
  data: DonneesCreationUtilisateur,
): Promise<UtilisateurFormState> {
  const garde = await exigerAdmin();
  if (!garde.ok) return echec(garde.message);
  const brut = {
    nomComplet: data.nomComplet ?? "",
    email: data.email ?? "",
    telephone: data.telephone?.trim() || null,
    role: data.role,
    motDePasse: data.motDePasse ?? "",
  };

  const analyse = creerUtilisateurSchema.safeParse(brut);
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return {
      success: false,
      message:
        "Le formulaire contient des erreurs. Vérifiez les champs signalés.",
      fieldErrors,
      utilisateurId: null,
    };
  }

  const donnees = analyse.data;
  const email = donnees.email.trim().toLowerCase();

  try {
    const existant = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existant) {
      return echec("Un compte existe déjà avec cette adresse e-mail.", "email");
    }

    const motDePasseHash = await hacherMotDePasse(donnees.motDePasse);
    const utilisateur = await prisma.utilisateur.create({
      data: {
        nomComplet: donnees.nomComplet,
        email,
        telephone: donnees.telephone || null,
        role: donnees.role,
        motDePasseHash,
        motDePasseTemporaire: true,
        actif: true,
      },
    });

    await consignerAudit({
      action: "CREATION",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      details: `Création du compte « ${utilisateur.nomComplet} » (${LIBELLES_ROLE[utilisateur.role]}) avec mot de passe temporaire.`,
    });

    revalidatePath(CHEMIN_COMPTES);

    return succes(
      `Le compte de ${utilisateur.nomComplet} a été créé (rôle ${LIBELLES_ROLE[utilisateur.role]}).`,
      utilisateur.id,
    );
  } catch (erreur) {
    console.error("Erreur serveur (création de compte) :", erreur);
    return echec(
      "Impossible de créer le compte. Vérifiez la connexion à la base de données.",
    );
  }
}

/**
 * Change le rôle — donc les privilèges d'accès — d'un compte existant.
 * Tracé obligatoire dans le journal d'audit.
 */
export async function modifierRole(
  userId: string,
  nouveauRole: RoleUtilisateurValeur,
): Promise<UtilisateurFormState> {
  const garde = await exigerAdmin();
  if (!garde.ok) return echec(garde.message);
  const idOk = identifiantSchema.safeParse(userId);
  if (!idOk.success) return echec("Identifiant de compte manquant.", "id");

  const roleOk = roleSchema.safeParse(nouveauRole);
  if (!roleOk.success) return echec("Rôle invalide.", "role");
  const role = roleOk.data;

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: idOk.data },
    });
    if (!utilisateur) {
      return echec("Ce compte n'existe plus. Actualisez la page.", "id");
    }

    if (utilisateur.role === role) {
      return succes(
        `« ${utilisateur.nomComplet} » possède déjà le rôle ${LIBELLES_ROLE[role]}.`,
        utilisateur.id,
      );
    }

    // Garde-fou : ne jamais retirer le rôle du dernier administrateur actif.
    if (
      utilisateur.role === "ADMINISTRATEUR" &&
      utilisateur.actif &&
      role !== "ADMINISTRATEUR" &&
      (await nombreAdministrateursActifs()) <= 1
    ) {
      return echec(
        "Impossible de retirer le rôle d'Administrateur au dernier compte administrateur actif.",
      );
    }

    const ancienRole = LIBELLES_ROLE[utilisateur.role];
    const roleLibelle = LIBELLES_ROLE[role];

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { role },
    });

    await consignerAudit({
      action: "MODIFICATION",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      details: `Changement de rôle de « ${utilisateur.nomComplet} » : ${ancienRole} → ${roleLibelle}.`,
    });

    revalidatePath(CHEMIN_COMPTES);

    return succes(
      `Rôle mis à jour : ${utilisateur.nomComplet} est désormais ${roleLibelle}.`,
      utilisateur.id,
    );
  } catch (erreur) {
    console.error("Erreur serveur (changement de rôle) :", erreur);
    return echec("Impossible de modifier le rôle. Réessayez.");
  }
}

/**
 * Suspend instantanément l'accès d'un compte (blocage réversible).
 * Tracé obligatoire dans le journal d'audit.
 */
export async function desactiverCompte(
  userId: string,
): Promise<UtilisateurFormState> {
  const garde = await exigerAdmin();
  if (!garde.ok) return echec(garde.message);
  const idOk = identifiantSchema.safeParse(userId);
  if (!idOk.success) return echec("Identifiant de compte manquant.", "id");

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: idOk.data },
    });
    if (!utilisateur) {
      return echec("Ce compte n'existe plus. Actualisez la page.", "id");
    }
    if (!utilisateur.actif) {
      return succes(
        `Le compte de ${utilisateur.nomComplet} est déjà suspendu.`,
        utilisateur.id,
      );
    }
    if (
      utilisateur.role === "ADMINISTRATEUR" &&
      (await nombreAdministrateursActifs()) <= 1
    ) {
      return echec(
        "Impossible de suspendre le dernier compte administrateur actif.",
      );
    }

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { actif: false },
    });

    await consignerAudit({
      action: "SUSPENSION",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      details: `Suspension du compte de « ${utilisateur.nomComplet} » (${LIBELLES_ROLE[utilisateur.role]}) — accès bloqué.`,
    });

    revalidatePath(CHEMIN_COMPTES);

    return succes(
      `L'accès de ${utilisateur.nomComplet} a été suspendu.`,
      utilisateur.id,
    );
  } catch (erreur) {
    console.error("Erreur serveur (suspension de compte) :", erreur);
    return echec("Impossible de suspendre ce compte. Réessayez.");
  }
}

/**
 * Rétablit l'accès d'un compte suspendu (déblocage instantané).
 * Tracé obligatoire dans le journal d'audit.
 */
export async function activerCompte(
  userId: string,
): Promise<UtilisateurFormState> {
  const garde = await exigerAdmin();
  if (!garde.ok) return echec(garde.message);
  const idOk = identifiantSchema.safeParse(userId);
  if (!idOk.success) return echec("Identifiant de compte manquant.", "id");

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: idOk.data },
    });
    if (!utilisateur) {
      return echec("Ce compte n'existe plus. Actualisez la page.", "id");
    }
    if (utilisateur.actif) {
      return succes(
        `Le compte de ${utilisateur.nomComplet} est déjà actif.`,
        utilisateur.id,
      );
    }

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { actif: true },
    });

    await consignerAudit({
      action: "REACTIVATION",
      entite: "Utilisateur",
      entiteId: utilisateur.id,
      details: `Réactivation du compte de « ${utilisateur.nomComplet} » (${LIBELLES_ROLE[utilisateur.role]}) — accès rétabli.`,
    });

    revalidatePath(CHEMIN_COMPTES);

    return succes(
      `L'accès de ${utilisateur.nomComplet} a été rétabli.`,
      utilisateur.id,
    );
  } catch (erreur) {
    console.error("Erreur serveur (réactivation de compte) :", erreur);
    return echec("Impossible de réactiver ce compte. Réessayez.");
  }
}
