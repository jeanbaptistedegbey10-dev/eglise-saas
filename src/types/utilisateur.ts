import type { RoleUtilisateurValeur } from "@/lib/utilisateur";

/**
 * Retour des Server Actions « comptes & accès ».
 * `fieldErrors` est alimenté par Zod (clé = nom du champ, "_form" pour une
 * erreur globale).
 */
export type UtilisateurFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
  /** Identifiant du compte créé / modifié, le cas échéant. */
  utilisateurId: string | null;
};

/** État initial transmis à `useActionState`. */
export const initialUtilisateurFormState: UtilisateurFormState = {
  success: false,
  message: "",
  fieldErrors: {},
  utilisateurId: null,
};

/** Payload de création d'un compte (partagé client → Server Action). */
export type DonneesCreationUtilisateur = {
  nomComplet: string;
  email: string;
  telephone?: string | null;
  role: RoleUtilisateurValeur;
  motDePasse: string;
};

/** Ligne de compte transmise par le serveur (dates sérialisées par RSC). */
export type UtilisateurLigne = {
  id: string;
  nomComplet: string;
  email: string;
  telephone: string | null;
  role: RoleUtilisateurValeur;
  motDePasseTemporaire: boolean;
  actif: boolean;
  derniereConnexion: Date | string | null;
  createdAt: Date | string;
};
