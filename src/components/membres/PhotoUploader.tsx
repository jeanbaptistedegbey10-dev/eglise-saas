/* La photo est une data URL : next/image ne peut pas l'optimiser — un <img>
 * classique est donc attendu. */
/* eslint-disable @next/next/no-img-element */

"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";

import {
  PHOTO_CARRE_COTE,
  PHOTO_QUALITE_JPEG,
  PHOTO_TAILLE_SOURCE_MAX,
  PHOTO_TYPES_AUTORISES,
  redimensionnerPhoto,
  validerPhotoDataUrl,
} from "@/lib/photo";

type Props = {
  /** Photo déjà enregistrée (data URL) — `null` si le membre n'en a pas. */
  initial?: string | null;
  /** Initiales affichées en repli quand aucune photo n'est sélectionnée. */
  initiales?: string;
  /** Nom complet du membre, utilisé pour le texte alternatif. */
  nomComplet?: string;
  /** Message d'erreur renvoyé par le Server Action (champ `photoDataUrl`). */
  erreur?: string;
};

/**
 * Contrôle d'upload de la photo d'un membre.
 *
 * - **Aperçu immédiat** : le fichier choisi est redimensionné côté client
 *   (`redimensionnerPhoto`) puis affiché sans attendre l'enregistrement.
 * - **Stockage** : la data URL est restituée via le champ caché
 *   `photoDataUrl` et les drapeaux `photoModifiee` / `photoSupprimee`, soumis
 *   avec le formulaire. Le Server Action `enregistrerMembre` re-valide le
 *   format / la taille puis persiste la valeur.
 * - **Validation** : format (PNG/JPG/WEBP) et taille (5 Mo) contrôlés côté
 *   client pour le confort, puis ré-contrôlés côté serveur.
 */
export default function PhotoUploader({
  initial = null,
  initiales = "",
  nomComplet,
  erreur,
}: Props) {
  const [apercu, setApercu] = useState<string | null>(initial ?? null);
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string>("");
  const [enCours, setEnCours] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [supprime, setSupprime] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

const COTE_PHOTO = 160;

/**
 * Lit le fichier avec un FileReader, le dessine via `Image()` dans un canvas
 * carré centré de 160×160 px, puis l'exporte en JPEG (q = 0.5) → base64 (~6-8 Ko).
 */
async function lireEtEncoder(fichier: File): Promise<string | null> {
  const dataUrl = await lireDataUrl(fichier);
  const image = await chargerImageDepuisDataUrl(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = COTE_PHOTO;
  canvas.height = COTE_PHOTO;
  const contexte = canvas.getContext("2d");
  if (!contexte) return null;
  contexte.fillStyle = "#ffffff";
  contexte.fillRect(0, 0, COTE_PHOTO, COTE_PHOTO);
  const echelle = Math.max(COTE_PHOTO / image.width, COTE_PHOTO / image.height);
  const largeur = image.width * echelle;
  const hauteur = image.height * echelle;
  contexte.drawImage(image, (COTE_PHOTO - largeur) / 2, (COTE_PHOTO - hauteur) / 2, largeur, hauteur);
  return canvas.toDataURL("image/jpeg", 0.5);
}
function lireDataUrl(fichier: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(typeof lecteur.result === "string" ? lecteur.result : "");
    lecteur.onerror = () => reject(new Error("Échec de la lecture du fichier."));
    lecteur.onabort = () => reject(new Error("Lecture du fichier interrompue."));
    lecteur.readAsDataURL(fichier);
  });
}
function chargerImageDepuisDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de décoder l'image sélectionnée."));
    image.src = dataUrl;
  });
}
  const handlePhotoChange = async (fichier?: File | null) => {
    if (!fichier) return;
    if (!PHOTO_TYPES_AUTORISES.includes(fichier.type)) {
      setErreurLocale("Format non pris en charge : utilisez un PNG, JPG ou WEBP.");
      return;
    }
    if (fichier.size > PHOTO_TAILLE_SOURCE_MAX) {
      setErreurLocale("Fichier trop volumineux : 5 Mo maximum.");
      return;
    }

    setEnCours(true);
    setErreurLocale(null);
    try {
      const dataUrl = await lireEtEncoder(fichier);
      if (!dataUrl) {
        throw new Error("L'image sélectionnée n'a pas pu être décodée.");
        return;
      }
      const erreurFormat = validerPhotoDataUrl(dataUrl);
      if (erreurFormat) {
        throw new Error(erreurFormat);
        return;
      }
      setApercu(dataUrl);
      setNomFichier(fichier.name);
      setModifie(true);
      setSupprime(false);
    } catch {
      setErreurLocale("La photo n'a pas pu être lue. Veuillez réessayer avec une autre image.");
    } finally {
      setEnCours(false);
    }
  };

  const retirerPhoto = () => {
    setApercu(null);
    setNomFichier("");
    setErreurLocale(null);
    setModifie(false);
    setSupprime(true);
    if (inputRef.current) inputRef.current.value = "";
  };

  const messageErreur = erreur ?? erreurLocale;


  return (
    <div className="flex flex-col gap-3">
      {/* Valeurs réellement soumises avec le formulaire du membre. La photo
          n'est transmise que si elle a été modifiée : inutile de renvoyer la
          data URL existante à chaque enregistrement de la fiche. */}
      {modifie && (
        <>
          <input type="hidden" name="photoUrl" value={apercu ?? ""} />
          <input type="hidden" name="photoModifiee" value="on" />
        </>
      )}
      {supprime && <input type="hidden" name="photoSupprimee" value="on" />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {apercu ? (
          <img
            src={apercu}
            alt={nomComplet ? `Aperçu de la photo de ${nomComplet}` : "Aperçu de la photo"}
            className="h-24 w-24 shrink-0 rounded-2xl border border-card-border bg-background object-cover"
          />
        ) : (
          <span
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-xl font-semibold text-accent"
            aria-hidden
          >
            {initiales || "?"}
          </span>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {enCours ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="h-4 w-4" aria-hidden />
              )}
              {apercu ? "Remplacer la photo" : "Choisir une photo"}
              <input
                ref={inputRef}
                type="file"
                accept={PHOTO_TYPES_AUTORISES.join(",")}
                className="sr-only"
                disabled={enCours}
                onChange={(event) => void handlePhotoChange(event.target.files?.[0])}
              />
            </label>

            {apercu ? (
              <button
                type="button"
                onClick={retirerPhoto}
                className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Supprimer la photo
              </button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Formats acceptés : PNG, JPG, WEBP — 5 Mo maximum. L&apos;image est
            recadrée en carré centré ({PHOTO_CARRE_COTE}×{PHOTO_CARRE_COTE} px) et
            compressée en JPEG (~6-8 Ko) avant enregistrement.
          </p>

          <p className="text-xs" aria-live="polite">
            {messageErreur ? (
              <span className="font-medium text-red-500 dark:text-red-300">{messageErreur}</span>
            ) : apercu ? (
              <span className="text-muted-foreground">
                {modifie ? "Aperçu immédiat — " : ""}
                {nomFichier || "Photo actuelle"} — enregistrez la fiche pour la conserver.
              </span>
            ) : supprime ? (
              <span className="text-muted-foreground">
                La photo sera supprimée à l&apos;enregistrement de la fiche.
              </span>
            ) : (
              <span className="text-muted-foreground">Aucune photo sélectionnée.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
