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

/** Côté du carré de sortie (rognage centré), en pixels. */
export const PHOTO_CARRE_COTE = 160;

/** Qualité de ré-encodage JPEG visée pour obtenir ~6-8 Ko stockés en base. */
export const PHOTO_QUALITE_JPEG = 0.5;

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
 * Recadre une image en carré centré (rognage « cover »), puis la ré-encode en
 * JPEG haute compression pour obtenir une photo de profil d'environ 6-8 Ko,
 * optimisée pour le stockage en base de données.
 *
 * Le chargement passe par un  + canvas HTML5 (universel, y compris Safari
 * ancien), puis le canvas est dessiné sur un carré fixe et ré-encodé.
 *
 * @param fichier Image source (fichier choisi par l'utilisateur).
 * @returns La data URL JPEG carrée compressée, ou `null` si l'image n'a pas pu
 * être décodée.
 */
export async function redimensionnerPhoto(fichier: File): Promise<string | null> {
  // Chargement universel (  + canvas), puis rognage carré centré.
  // repasse par un <img> + canvas, plus universel.
  const bitmap = await chargerImage(fichier);
  if (!bitmap) return null;

  const cote = PHOTO_CARRE_COTE;
  const canvas = document.createElement("canvas");
  canvas.width = cote;
  canvas.height = cote;

  const contexte = canvas.getContext("2d");
  if (!contexte) return null;

  contexte.fillStyle = "#ffffff";
  contexte.fillRect(0, 0, cote, cote);

  const echelle = Math.max(cote / bitmap.width, cote / bitmap.height);
  const largeur = bitmap.width * echelle;
  const hauteur = bitmap.height * echelle;
  contexte.drawImage(bitmap, (cote - largeur) / 2, (cote - hauteur) / 2, largeur, hauteur);

  return canvas.toDataURL("image/jpeg", PHOTO_QUALITE_JPEG);
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
