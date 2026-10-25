/**
 * Configuration globale de l'église — stockage fichier (sans migration Prisma).
 *
 * Persistée dans `data/configuration-eglise.json` (créé à la première
 * écriture). Lue côté serveur uniquement (`node:fs`), jamais exposée en clair
 * côté client. Compatible mode sombre/clair (aucun style inline forcé).
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export type ConfigurationEglise = {
  nomOfficiel: string;
  mission: string;
  numeroEnregistrement: string;
  numeroIfu: string;
  rib: string;
  emailContact: string;
  telephones: string[];
  adresseSiege: string;
  ville: string;
  localisationGps: string;
  pasteurPrincipal: string;
  secretariat: string;
  devise: "XOF" | "XAF" | "EUR" | "USD";
  symboleDevise: string;
  moisDebutExercice: number;
  /**
   * Logo officiel en data URL (« data:image/…;base64, … »), issu de l'upload
   * du formulaire des paramètres. Chaîne vide quand aucun logo n'est défini.
   */
  logoDataUrl: string;
  /** URL publique du logo (data URL ou lien externe). Null quand aucun logo. */
  logoUrl: string | null;
  misAJourLe: string | null;
};

export const DEFAUT_CONFIGURATION: ConfigurationEglise = {
  nomOfficiel: "",
  mission: "",
  numeroEnregistrement: "",
  numeroIfu: "",
  rib: "",
  emailContact: "",
  telephones: [""],
  adresseSiege: "",
  ville: "",
  localisationGps: "",
  pasteurPrincipal: "",
  secretariat: "",
  devise: "XOF",
  symboleDevise: "FCFA",
  moisDebutExercice: 1,
  logoDataUrl: "",
  logoUrl: null,
  misAJourLe: null,
};

function cheminFichier(): string {
  return path.join(process.cwd(), "data", "configuration-eglise.json");
}

/** Lit la configuration globale (fusionnée avec les défauts). */
export async function lireConfiguration(): Promise<ConfigurationEglise> {
  try {
    const brut = await fs.readFile(cheminFichier(), "utf-8");
    const parsed = JSON.parse(brut) as Partial<ConfigurationEglise>;
    return { ...DEFAUT_CONFIGURATION, ...parsed };
  } catch {
    return { ...DEFAUT_CONFIGURATION };
  }
}

/** Enregistre la configuration globale (création du dossier `data/` si besoin). */
export async function ecrireConfiguration(
  config: Omit<ConfigurationEglise, "misAJourLe">,
): Promise<ConfigurationEglise> {
  const finale: ConfigurationEglise = {
    ...config,
    misAJourLe: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(cheminFichier()), { recursive: true });
  await fs.writeFile(cheminFichier(), JSON.stringify(finale, null, 2), "utf-8");
  return finale;
}
