/**
 * Retour des Server Actions d'authentification (inscription, connexion,
 * réinitialisation de mot de passe). Même convention que
 * `UtilisateurFormState` : `fieldErrors` est alimenté par Zod (clé = nom du
 * champ, "_form" global).
 */
export type AuthFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
  /** URL cible après une connexion réussie (server action de connexion). */
  redirectTo?: string;
};

/** État initial transmis à `useActionState`. */
export const initialAuthFormState: AuthFormState = {
  success: false,
  message: "",
  fieldErrors: {},
  redirectTo: undefined,
};