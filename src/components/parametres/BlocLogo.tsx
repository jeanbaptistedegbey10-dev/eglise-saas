/**
 * Ancien emplacement du bloc « Logo de l'église » et des sections d'informations
 * Brevo.
 *
 *  - Le composant d'upload vit désormais dans `LogoUploader.tsx` : aperçu
 *    immédiat (FileReader → data URL), validation du format / de la taille et
 *    persistance via le champ caché `logoDataUrl` (Server Action
 *    `enregistrerParametres`). Cette ré-exportation est conservée pour
 *    compatibilité avec d'éventuels imports existants.
 *
 *  - ⚠️ `BlocBrevoInfo` et `AlerteBrevo` ont été SUPPRIMÉS : ils lisaient
 *    `process.env.BREVO_*` dans un Server Component et les transmettaient en
 *    props à un composant client — les clés (y compris `BREVO_SMTP_KEY`,
 *    masquée à l'affichage) étaient alors sérialisées dans le payload RSC et
 *    lisibles depuis le navigateur. Les secrets Brevo/SMTP restent
 *    exclusivement dans le `.env` du serveur ; le formulaire affiche
 *    uniquement la note statique `NoteBrevo.tsx`, sans aucune valeur.
 */
export { default, default as BlocLogo } from "@/components/parametres/LogoUploader";
