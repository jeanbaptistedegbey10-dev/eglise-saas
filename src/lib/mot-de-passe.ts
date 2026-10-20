import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Hachage du mot de passe (scrypt natif — aucune dépendance externe)
// ---------------------------------------------------------------------------

/** Longueur du sel aléatoire (octets) généré pour chaque hachage. */
const LONGUEUR_SEL = 16;
/** Longueur de la dérivation scrypt (octets) — 64 octets = 512 bits. */
const LONGUEUR_CLE = 64;

/**
 * Hache un mot de passe avec `scrypt` (Node.js) et un sel aléatoire.
 * Format stocké : `scrypt$<sel hex>$<empreinte hex>` — le mot de passe en
 * clair n'est jamais enregistré en base.
 *
 * Source unique de vérité : utilisée par la création de compte
 * (src/actions/utilisateurs.ts) et par le provider Credentials de NextAuth
 * (src/lib/auth.ts).
 */
export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return new Promise((resolution, rejet) => {
    const sel = randomBytes(LONGUEUR_SEL);
    scrypt(motDePasse, sel, LONGUEUR_CLE, (erreur, empreinte) => {
      if (erreur) {
        rejet(erreur);
        return;
      }
      resolution(`scrypt$${sel.toString("hex")}$${empreinte.toString("hex")}`);
    });
  });
}

/**
 * Vérifie un mot de passe en clair contre un hachage `scrypt$sel$empreinte`.
 * La comparaison utilise `timingSafeEqual` (temps constant) pour éviter les
 * fuites par timing attack.
 */
export async function verifierMotDePasse(
  motDePasse: string,
  hash: string,
): Promise<boolean> {
  const parties = hash.split("$");
  if (parties.length !== 3 || parties[0] !== "scrypt") {
    return false;
  }

  const sel = Buffer.from(parties[1], "hex");
  const empreinteAttendue = Buffer.from(parties[2], "hex");
  if (sel.length === 0 || empreinteAttendue.length !== LONGUEUR_CLE) {
    return false;
  }

  try {
    const empreinte = await new Promise<Buffer>((resolution, rejet) => {
      scrypt(motDePasse, sel, LONGUEUR_CLE, (erreur, cle) => {
        if (erreur) {
          rejet(erreur);
          return;
        }
        resolution(cle);
      });
    });
    return (
      empreinte.length === empreinteAttendue.length &&
      timingSafeEqual(empreinte, empreinteAttendue)
    );
  } catch {
    return false;
  }
}