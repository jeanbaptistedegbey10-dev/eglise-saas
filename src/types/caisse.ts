/**
 * États de formulaires — Server Actions du module Caisses.
 * Fichier SANS `"use server"` : peut exporter types et constantes.
 */

export type CaisseFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[]>;
};

/** État initial transmis à `useActionState`. */
export const initialCaisseFormState: CaisseFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};
