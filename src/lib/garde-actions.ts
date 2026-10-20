/**
 * Gardes RBAC centralisées pour les Server Actions — edge-safe côté appel
 * (runtime Node via `auth()`), sans dépendance Prisma.
 *
 * Principe : chaque Server Action sensible DOIT appeler une de ces gardes
 * en première instruction. Le middleware (`src/lib/auth.config.ts`) protège
 * les routes, mais une Server Action peut être invoquée directement via son
 * identifiant : la vérification serveur est donc obligatoire (défense en
 * profondeur).
 */
import { auth } from "@/lib/auth";
import { aAccesAuChemin, normaliserRole } from "@/lib/permissions";

export type GardeEchec = { ok: false; message: string };
export type GardeSucces = { ok: true; role: string; nom: string };
export type ResultatGarde = GardeEchec | GardeSucces;

function echec(message: string): GardeEchec {
  return { ok: false, message };
}

/** Exige une session valide (tout rôle authentifié). */
export async function exigerSession(): Promise<ResultatGarde> {
  const session = await auth().catch(() => null);
  const roleBrut = (session?.user as { role?: string } | undefined)?.role ?? null;
  const role = normaliserRole(roleBrut);
  if (!session?.user || !role) {
    return echec("Session requise. Veuillez vous reconnecter.");
  }
  const nom =
    (session.user as { name?: string | null; email?: string | null }).name ??
    (session.user as { email?: string | null }).email ??
    "Utilisateur";
  return { ok: true, role, nom };
}

/** Exige le rôle ADMINISTRATEUR. */
export async function exigerAdmin(): Promise<ResultatGarde> {
  const base = await exigerSession();
  if (!base.ok) return base;
  if (base.role !== "ADMINISTRATEUR") {
    return echec("Accès réservé aux administrateurs.");
  }
  return base;
}

/** Exige TRESORIER ou ADMINISTRATEUR (module /finances). */
export async function exigerTresorierOuAdmin(): Promise<ResultatGarde> {
  const base = await exigerSession();
  if (!base.ok) return base;
  if (base.role !== "ADMINISTRATEUR" && base.role !== "TRESORIER") {
    return echec("Action réservée aux rôles Trésorier / Administrateur.");
  }
  if (!aAccesAuChemin(base.role, "/finances/caisses")) {
    return echec("Action réservée aux rôles Trésorier / Administrateur.");
  }
  return base;
}

/** Exige un droit d'écriture sur le module Membres (refuse la lecture seule). */
export async function exigerEcritureMembres(): Promise<ResultatGarde> {
  const base = await exigerSession();
  if (!base.ok) return base;
  if (!aAccesAuChemin(base.role, "/membres")) {
    return echec("Accès réservé aux rôles autorisés sur les membres.");
  }
  if (base.role === "MEMBRE_CONSULTATION") {
    return echec("Consultation seule : écriture interdite pour ce rôle.");
  }
  return base;
}

/** Exige un accès au chemin donné (matrice `src/lib/permissions.ts`). */
export async function exigerAccesChemin(chemin: string): Promise<ResultatGarde> {
  const base = await exigerSession();
  if (!base.ok) return base;
  if (!aAccesAuChemin(base.role, chemin)) {
    return echec(`Accès interdit à « ${chemin} » pour votre rôle.`);
  }
  return base;
}
