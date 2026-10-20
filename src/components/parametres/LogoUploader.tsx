"use client";

/* Le logo est une data URL issue d'un FileReader : next/image ne peut pas
 * l'optimiser (et refuse les SVG) — un <img> classique est donc attendu. */
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

/** Formats d'image acceptés pour le logo officiel de l'église. */
const TYPES_AUTORISES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

/** Taille maximale du fichier source (2 Mo). */
const TAILLE_MAX_OCTETS = 2 * 1024 * 1024;

type Props = {
  nomEglise: string;
  /** Logo déjà stocké (data URL) dans la configuration de l'église. */
  initial?: string | null;
};

/**
 * Composant d'upload du logo officiel.
 *
 * - **Aperçu immédiat** : dès la sélection du fichier, il est lu en base64
 *   (`FileReader.readAsDataURL`) et affiché sans attendre l'enregistrement.
 * - **Stockage** : l'image est restituée via le champ caché `logoDataUrl`,
 *   soumis avec le formulaire des paramètres. Le Server Action
 *   `enregistrerParametres` re-valide le format / la taille puis persiste la
 *   data URL dans `data/configuration-eglise.json` (et `misAJourLe`).
 * - **Validation** : format (PNG/JPG/SVG/WEBP) et taille (2 Mo) contrôlés
 *   côté client pour le confort, puis ré-contrôlés côté serveur.
 */
export default function LogoUploader({ nomEglise, initial = null }: Props) {
  const [apercu, setApercu] = useState<string | null>(initial ?? null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string>("");
  const [modifie, setModifie] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const choisirFichier = (fichier?: File | null) => {
    if (!fichier) return;
    if (!TYPES_AUTORISES.includes(fichier.type)) {
      setErreur("Format non pris en charge : utilisez un PNG, JPG, SVG ou WEBP.");
      return;
    }
    if (fichier.size > TAILLE_MAX_OCTETS) {
      setErreur("Fichier trop volumineux : 2 Mo maximum.");
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => {
      setApercu(typeof lecteur.result === "string" ? lecteur.result : null);
      setNomFichier(fichier.name);
      setErreur(null);
      setModifie(true);
    };
    lecteur.onerror = () => setErreur("Impossible de lire le fichier sélectionné.");
    lecteur.readAsDataURL(fichier);
  };

  const retirerLogo = () => {
    setApercu(null);
    setNomFichier("");
    setErreur(null);
    setModifie(true);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section
      aria-label="Logo de l'église"
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm sm:p-6"
    >
      {/* Valeur réellement soumise avec le formulaire des paramètres. */}
      <input type="hidden" name="logoDataUrl" value={apercu ?? ""} />

      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <ImagePlus className="h-4 w-4 text-accent" aria-hidden />
        Logo de l&apos;église
      </h2>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {apercu ? (
          <img
            src={apercu}
            alt="Aperçu du logo de l'église"
            className="h-20 w-20 shrink-0 rounded-2xl border border-card-border bg-background object-contain p-1"
          />
        ) : (
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground"
            aria-hidden
          >
            {(nomEglise.trim()[0] ?? "É").toUpperCase()}
          </span>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Importez le logo officiel affiché dans la barre latérale et sur les documents.
            Formats acceptés : PNG, JPG, SVG, WEBP — 2 Mo maximum. L&apos;image est conservée
            avec les paramètres de l&apos;église.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <ImagePlus className="h-4 w-4" aria-hidden />
              {apercu ? "Remplacer le logo" : "Choisir un fichier"}
              <input
                ref={inputRef}
                type="file"
                accept={TYPES_AUTORISES.join(",")}
                className="sr-only"
                onChange={(event) => choisirFichier(event.target.files?.[0])}
              />
            </label>

            {apercu ? (
              <button
                type="button"
                onClick={retirerLogo}
                className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Supprimer le logo
              </button>
            ) : null}
          </div>

          <p className="text-xs" aria-live="polite">
            {erreur ? (
              <span className="font-medium text-red-500 dark:text-red-300">{erreur}</span>
            ) : apercu ? (
              <span className="text-muted-foreground">
                {modifie ? "Aperçu immédiat — " : ""}
                {nomFichier || "Logo actuel"} — cliquez sur « Enregistrer les modifications »
                pour le conserver.
              </span>
            ) : (
              <span className="text-muted-foreground">Aucun fichier sélectionné.</span>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
