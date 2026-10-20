/**
 * Types & état initial du formulaire des paramètres d'église.
 *
 * ⚠️ Ce fichier ne porte VOLONTAIREMENT PAS la directive "use server" :
 * un fichier "use server" ne doit exporter QUE des fonctions asynchrones.
 * `initialParametresFormState` étant une constante (passée à `useActionState`),
 * elle vit ici, dans un module classique sans directive serveur.
 */
export type ParametresFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

export const initialParametresFormState: ParametresFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};