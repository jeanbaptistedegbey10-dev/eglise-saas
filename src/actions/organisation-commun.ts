"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { OrganisationFormState } from "@/types/organisation";

export const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

export function lireTexte(valeur: FormDataEntryValue | null): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

export function lireTexteOptionnel(valeur: FormDataEntryValue | null): string | null {
  const texte = lireTexte(valeur);
  return texte === "" ? null : texte;
}

export function lireBooleen(valeur: FormDataEntryValue | null): boolean {
  if (typeof valeur !== "string") return false;
  const v = valeur.trim().toLowerCase();
  return v === "on" || v === "true" || v === "1";
}

export function versFieldErrors(erreur: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of erreur.issues) {
    const cle = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (fieldErrors[cle] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export function echecValidation(erreur: z.ZodError): OrganisationFormState {
  return {
    success: false,
    message: "Le formulaire contient des erreurs. Vérifiez les champs signalés.",
    fieldErrors: versFieldErrors(erreur),
  };
}

export function erreurServeur(contexte: string, erreur: unknown): OrganisationFormState {
  console.error(`Erreur serveur (${contexte}) :`, erreur);
  return {
    success: false,
    message: "Une erreur est survenue. Vérifiez la connexion à la base.",
    fieldErrors: { _form: ["Erreur serveur lors de l'enregistrement."] },
  };
}

export function revaliderOrganisation(): void {
  revalidatePath("/organisation/departements");
  revalidatePath("/organisation/departements/creer");
  revalidatePath("/organisation/groupes");
  revalidatePath("/organisation/groupes/creer");
  revalidatePath("/organisation");
}

export function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)));
}

export async function membresExistent(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const lignes = await prisma.membre.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  return lignes.map((l) => l.id);
}
