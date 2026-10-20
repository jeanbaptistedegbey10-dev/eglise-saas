import { createHmac, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Jetons signés (HMAC-SHA256) — étatless, sans table supplémentaire en base.
// Utilisés pour la confirmation d'adresse e-mail et la réinitialisation de
// mot de passe. Le secret de signature est AUTH_SECRET (partagé avec NextAuth).
// Format : <charge base64url>.<signature hex>
// ---------------------------------------------------------------------------

/** Durée de validité du jeton de vérification d'e-mail (48 heures). */
export const DUREE_JETON_VERIFICATION_MS = 48 * 60 * 60 * 1000;
/** Durée de validité du jeton de réinitialisation (1 heure). */
export const DUREE_JETON_REINITIALISATION_MS = 60 * 60 * 1000;

/** Secret de signature — repli en développement uniquement. */
function secret(): string {
  const valeur = process.env.AUTH_SECRET;
  if (valeur) {
    return valeur;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET manquant : renseignez-le dans .env pour signer les jetons.",
    );
  }
  return "secret-developpement-eglise-saas";
}

/** Charge utile encodée dans le jeton. */
type ChargeJeton = {
  objet: "verification" | "reinitialisation";
  email: string;
  exp: number;
};

/** Signe une charge encodée en base64url. */
function signer(contenu: string): string {
  return createHmac("sha256", secret()).update(contenu).digest("hex");
}

/** Fabrique un jeton signé pour l'objet demandé. */
function genererJeton(
  objet: ChargeJeton["objet"],
  email: string,
  dureeMs: number,
): string {
  const charge: ChargeJeton = {
    objet,
    email: email.trim().toLowerCase(),
    exp: Date.now() + dureeMs,
  };
  const brut = Buffer.from(JSON.stringify(charge)).toString("base64url");
  return `${brut}.${signer(brut)}`;
}

/** Analyse et vérifie un jeton ; retourne la charge si le jeton est valide. */
function analyserJeton(
  jeton: string | null | undefined,
  objet: ChargeJeton["objet"],
): ChargeJeton | null {
  if (!jeton) {
    return null;
  }
  const [brut, signature] = jeton.split(".");
  if (!brut || !signature) {
    return null;
  }

  const attendue = signer(brut);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(attendue, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const charge = JSON.parse(
      Buffer.from(brut, "base64url").toString("utf8"),
    ) as ChargeJeton;
    if (
      charge.objet !== objet ||
      typeof charge.email !== "string" ||
      typeof charge.exp !== "number" ||
      charge.exp < Date.now()
    ) {
      return null;
    }
    return charge;
  } catch {
    return null;
  }
}

/**
 * Génère le jeton de confirmation d'adresse e-mail (valide 48 h), transmis
 * dans l'e-mail envoyé par `envoyerEmailVerification`.
 */
export function genererJetonVerification(email: string): string {
  return genererJeton("verification", email, DUREE_JETON_VERIFICATION_MS);
}

/**
 * Vérifie un jeton de confirmation d'e-mail et retourne l'adresse e-mail
 * associée, ou `null` si le jeton est absent, altéré ou expiré.
 */
export function verifierJetonVerification(
  jeton: string | null | undefined,
): string | null {
  return analyserJeton(jeton, "verification")?.email ?? null;
}

/**
 * Génère le jeton de réinitialisation de mot de passe (valide 1 h), transmis
 * dans l'e-mail envoyé par `envoyerLienReinitialisation`.
 */
export function genererJetonReinitialisation(email: string): string {
  return genererJeton("reinitialisation", email, DUREE_JETON_REINITIALISATION_MS);
}

/**
 * Vérifie un jeton de réinitialisation et retourne l'adresse e-mail du
 * compte concerné, ou `null` si le jeton est invalide ou expiré.
 */
export function verifierJetonReinitialisation(
  jeton: string | null | undefined,
): string | null {
  return analyserJeton(jeton, "reinitialisation")?.email ?? null;
}