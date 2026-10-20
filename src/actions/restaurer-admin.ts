"use server";

import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { exigerSession } from "@/lib/garde-actions";
import { prisma } from "@/lib/prisma";

/**
 * ACTION DE SECOURS TEMPORAIRE — restauration du compte principal.
 *
 * `forcerRoleAdmin(email)` force le rôle "ADMINISTRATEUR" pour l'adresse
 * e-mail fournie. Réservée au compte principal :
 * jeanbaptistedegbey10@gmail.com
 */
const EMAIL_ADMIN_PRINCIPAL = "jeanbaptistedegbey10@gmail.com";

export async function forcerRoleAdmin(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  // ACTION DE SECOURS DÉSACTIVÉE EN PRODUCTION : exige une session valide et
  // refuse toute élévation hors compte principal (anti-escalade de privilèges).
  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      message: "Action de secours désactivée en production.",
    };
  }
  const garde = await exigerSession();
  if (!garde.ok) {
    return { success: false, message: garde.message };
  }
  const adresse = email.trim().toLowerCase();
  if (!adresse || !adresse.includes("@")) {
    return { success: false, message: "Adresse e-mail invalide." };
  }
  if (adresse !== EMAIL_ADMIN_PRINCIPAL) {
    return {
      success: false,
      message: "Restauration réservée au compte principal.",
    };
  }

  try {
    const existant = await prisma.utilisateur.findUnique({
      where: { email: adresse },
      select: { id: true, role: true, email: true, nomComplet: true },
    });
    if (!existant) {
      return { success: false, message: `Aucun compte trouvé pour ${adresse}.` };
    }
    if (existant.role === "ADMINISTRATEUR") {
      return {
        success: true,
        message: `Le compte ${adresse} est déjà ADMINISTRATEUR.`,
      };
    }
    await prisma.utilisateur.update({
      where: { id: existant.id },
      data: { role: "ADMINISTRATEUR" },
    });
    return {
      success: true,
      message: `Rôle restauré : ${existant.nomComplet} (${adresse}) est désormais ADMINISTRATEUR.`,
    };
  } catch (erreur) {
    console.error("Erreur restaurer-admin :", erreur);
    return {
      success: false,
      message: "Impossible de restaurer le rôle administrateur. Réessayez.",
    };
  }
}

/**
 * Vérification appelée au chargement : si la session connectée correspond
 * au compte principal mais que son rôle en base n'est pas ADMINISTRATEUR,
 * le rôle est restauré automatiquement (filet de sécurité).
 * Met à jour `jeanbaptistedegbey10@gmail.com` avec le rôle exact
 * `"ADMINISTRATEUR"` et renvoie un statut de validation.
 */
export async function verifierEtRestaurerAdminPrincipal(
  sessionEnCours?: Session | null,
): Promise<{
  success: boolean;
  message: string;
  role?: string;
  restaure?: boolean;
}> {
  try {
    const session = sessionEnCours ?? (await auth().catch(() => null));
    const emailSession = (
      (session?.user as { email?: string } | undefined)?.email ?? ""
    )
      .trim()
      .toLowerCase();
    if (emailSession !== EMAIL_ADMIN_PRINCIPAL)
      return { success: false, message: "Session hors compte principal." };

    const compte = await prisma.utilisateur.findUnique({
      where: { email: EMAIL_ADMIN_PRINCIPAL },
      select: { id: true, role: true },
    });
    if (!compte) {
      return {
        success: false,
        message: `Aucun compte trouvé pour ${EMAIL_ADMIN_PRINCIPAL}.`,
      };
    }
    if (compte.role === "ADMINISTRATEUR") {
      return {
        success: true,
        message: `Le compte ${EMAIL_ADMIN_PRINCIPAL} est déjà ADMINISTRATEUR.`,
        role: compte.role,
        restaure: false,
      };
    }
    const misAJour = await prisma.utilisateur.update({
      where: { id: compte.id },
      data: { role: "ADMINISTRATEUR" },
      select: { role: true },
    });
    console.log(
      `[restaurer-admin] Rôle ADMINISTRATEUR restauré pour ${EMAIL_ADMIN_PRINCIPAL}.`,
    );
    return {
      success: true,
      message: `Rôle restauré : ${EMAIL_ADMIN_PRINCIPAL} est désormais ADMINISTRATEUR.`,
      role: misAJour.role,
      restaure: true,
    };
  } catch (erreur) {
    console.error("[restaurer-admin] Vérification impossible :", erreur);
    return {
      success: false,
      message: "Impossible de vérifier/restaurer le rôle administrateur.",
    };
  }
}
