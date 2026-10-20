"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, LoaderCircle, MailCheck, Send } from "lucide-react";

import { renvoyerCodeOtp, verifierCodeOtp } from "@/actions/connexion";
import { initialAuthFormState } from "@/types/auth";

// ---------------------------------------------------------------------------
// Formulaire de vérification du code OTP (page /verifier-code) — 2FA e-mail.
// Valide le code via `verifierCodeOtp` (ouvre la session NextAuth, redirige
// vers /dashboard) ; `renvoyerCodeOtp` régénère le code via Brevo.
// ---------------------------------------------------------------------------

const INPUT_CLS =
  "flex h-12 w-full rounded-lg border border-card-border bg-background px-3 text-center text-xl font-bold tracking-[0.5em] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

type Props = {
  email: string;
  redirectTo: string;
  seSouvenir: boolean;
};

export default function FormulaireVerificationCode({ email, redirectTo, seSouvenir }: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(verifierCodeOtp, initialAuthFormState);
  const [etatRenvoi, actionRenvoi, renvoiEnCours] = useActionState(renvoyerCodeOtp, initialAuthFormState);
  const [compteur, setCompteur] = useState(0);
  const saisieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (etat.success && etat.redirectTo) {
      router.push(etat.redirectTo);
      router.refresh();
    }
  }, [etat, router]);

  useEffect(() => {
    if (etatRenvoi.success && etatRenvoi.message) setCompteur(60);
    saisieRef.current?.focus();
  }, [etatRenvoi]);

  useEffect(() => {
    if (compteur <= 0) return;
    const minuteur = setTimeout(() => setCompteur((c) => c - 1), 1000);
    return () => clearTimeout(minuteur);
  }, [compteur]);

  const err = (champ: string) => etat.fieldErrors[champ]?.[0];

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {seSouvenir && <input type="hidden" name="seSouvenir" value="on" />}

        {!etat.success && etat.message && (
          <div role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{etat.message}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="verification-code" className="text-sm font-medium text-foreground">
            Code à 6 chiffres envoyé à {email}
          </label>
          <input
            id="verification-code"
            ref={saisieRef}
            name="code"
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            minLength={6}
            pattern="[0-9]{6}"
            placeholder="••••••"
            className={INPUT_CLS}
          />
          {err("code") && <p className="text-xs text-red-400">{err("code")}</p>}
          <p className="text-xs text-muted-foreground">Le code expire après 10 minutes.</p>
        </div>

        <button
          type="submit"
          disabled={enCours}
          className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {enCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <MailCheck className="h-4 w-4" aria-hidden />}
          Valider le code
        </button>
      </form>

      <form action={actionRenvoi} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={email} />
        {seSouvenir && <input type="hidden" name="seSouvenir" value="on" />}
        {etatRenvoi.message && (
          <p role="status" className="flex gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{etatRenvoi.message}</span>
          </p>
        )}
        <button
          type="submit"
          disabled={renvoiEnCours || compteur > 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-card-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
          {renvoiEnCours ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {compteur > 0 ? `Renvoyer le code (${compteur}s)` : "Renvoyer le code"}
        </button>
      </form>
    </div>
  );
}
