import { ShieldCheck } from "lucide-react";

/**
 * Note de sécurité affichée en bas du formulaire des paramètres.
 *
 * Aucune variable d'environnement n'est lue ni transmise à ce composant :
 * une valeur passée en prop depuis un Server Component serait sérialisée
 * dans le payload RSC et donc visible depuis le navigateur. Les clés
 * Brevo/SMTP (BREVO_SMTP_HOST / PORT / LOGIN / KEY, BREVO_EXPEDITEUR_*)
 * restent exclusivement dans le `.env` du serveur, consommées par
 * `src/lib/email.ts`.
 */
export default function NoteBrevo() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-card-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <span>
        <span className="font-medium text-foreground">Envoi d&apos;e-mails (Brevo) :</span> les
        identifiants et clés API SMTP sont configurés côté serveur, dans le fichier{" "}
        <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">.env</code>{" "}
        (variables <code className="font-mono text-xs">BREVO_SMTP_*</code> et{" "}
        <code className="font-mono text-xs">BREVO_EXPEDITEUR_*</code>). Par sécurité, ils ne sont
        ni affichés ni modifiables depuis cette page.
      </span>
    </div>
  );
}
