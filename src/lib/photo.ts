/**
 * Gestion des photos de membre — format de stockage, validation serveur et
 * redimensionnement côté client.
 *
 * Stockage : data URL base64 (« data:image/jpeg;base64, … »), identique au
 * logo de l'église (`LogoUploader`). La photo est réduite côté client avant
 * envoi, puis re-validée côté serveur (format + taille) avant persistance.
 */

/** Formats d'image acceptés pour la photo d'un membre. */
export const PHOTO_TYPES_AUTORISES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

/** Taille maximale du fichier source avant redimensionnement (5 Mo). */
export const PHOTO_TAILLE_SOURCE_MAX = 5 * 1024 * 1024;

/** Dimension maximale (côté le plus long) de la photo stockée, en pixels. */
export const PHOTO_DIMENSION_MAX = 640;

/** Taille maximale de la data URL stockée en base de données (1,5 Mo). */
export const PHOTO_DATA_URL_MAX = 1_500_000;

/** Taille maximale décodée de la photo (1 Mo). */
export const PHOTO_OCTETS_MAX = 1024 * 1024;

/** Motif d'une data URL d'image base64 autorisée (PNG, JPEG ou WEBP). */
const MOTIF_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * Valide une data URL de photo (format + taille).
 *
 * @returns `null` si la valeur est valide, sinon le message d'erreur à
 * afficher à l'utilisateur.
 */
export function validerPhotoDataUrl(valeur: string): string | null {
  const data = valeur.trim();
  if (data === "") return null;

  if (data.length > PHOTO_DATA_URL_MAX) {
    return "Photo trop volumineuse (1,5 Mo maximum après encodage).";
  }

  const correspondance = MOTIF_DATA_URL.exec(data);
  if (!correspondance) {
    return "Format de photo non autorisé (PNG, JPG ou WEBP).";
  }

  // La longueur base64 permet d'estimer la taille décodée (~3 octets pour
  // 4 caractères base64) sans décoder réellement l'image.
  const base64 = correspondance[2];
  const octets = Math.floor((base64.length * 3) / 4);
  if (octets > PHOTO_OCTETS_MAX) {
    return "Photo trop volumineuse (1 Mo maximum après décodage).";
  }

  return null;
}

/**
 * Redimensionne une image côté client pour que sa plus grande dimension
 * n'excède pas `PHOTO_DIMENSION_MAX`, puis la ré-encode en JPEG (qualité 82).
 *
 * Le redimensionnement drastically réduit le poids stocké en base : une photo
 * de smartphone (plusieurs Mo) devient une data URL de quelques dizaines de
 * kilo-octets, sans perte visible à l'écran.
 *
 * @param fichier Image source (fichier choisi par l'utilisateur).
 * @returns La data URL JPEG redimensionnée, ou `null` si l'image n'a pas pu
 * être décodée.
 */
export async function redimensionnerPhoto(fichier: File): Promise<string | null> {
  // `createImageBitmap` n'est pas supporté partout (Safari ancien) : on
  // repasse par un <img> + canvas, plus universel.
  const bitmap = await chargerImage(fichier);
  if (!bitmap) return null;

  const plusGrand = Math.max(bitmap.width, bitmap.height);
  const facteur = plusGrand > PHOTO_DIMENSION_MAX ? PHOTO_DIMENSION_MAX / plusGrand : 1;
  const largeur = Math.max(1, Math.round(bitmap.width * facteur));
  const hauteur = Math.max(1, Math.round(bitmap.height * facteur));

  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;

  const contexte = canvas.getContext("2d");
  if (!contexte) return null;
  contexte.drawImage(bitmap, 0, 0, largeur, hauteur);

  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Charge un fichier image en `<img>` et résout avec ses dimensions. */
function chargerImage(fichier: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(fichier);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}
