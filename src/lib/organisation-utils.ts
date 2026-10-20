/**
 * Utilitaires partagés du module Organisation.
 *
 * ⚠️ Ce fichier ne porte VOLONTAIREMENT PAS la directive "use server".
 * Il n'exporte que des constantes et des fonctions utilitaires synchrones.
 * Exporter de telles valeurs depuis un fichier "use server" provoque l'erreur
 * de build Next.js « Server Actions must be async functions ».
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { OrganisationFormState } from "@/types/organisation";

export const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

export function lireTexte(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export function lireOpt(v: FormDataEntryValue | null): string | null {
  const t = lireTexte(v);
  return t === "" ? null : t;
}

export function lireBool(v: FormDataEntryValue | null): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "on" || s === "true" || s === "1";
}

export function versErreurs(e: z.ZodError): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  for (const i of e.issues) {
    const c = i.path.length > 0 ? String(i.path[0]) : "_form";
    (r[c] ??= []).push(i.message);
  }
  return r;
}

export function echec(e: z.ZodError): OrganisationFormState {
  return { success: false, message: "Le formulaire contient des erreurs.", fieldErrors: versErreurs(e) };
}

export function srvErr(ctx: string, e: unknown): OrganisationFormState {
  console.error(`Erreur serveur (${ctx}) :`, e);
  return { success: false, message: "Erreur serveur. Vérifiez la connexion.", fieldErrors: { _form: ["Erreur serveur."] } };
}

export function revalOrg(): void {
  revalidatePath("/organisation/departements");
  revalidatePath("/organisation/groupes");
  revalidatePath("/organisation");
}

export function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids.map((x) => x.trim()).filter((x) => x.length > 0)));
}
