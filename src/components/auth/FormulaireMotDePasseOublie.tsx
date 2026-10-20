"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, LoaderCircle, Send } from "lucide-react";

import { demanderReinitialisation } from "@/actions/auth";
import { initialAuthFormState } from "@/types/auth";

// ---------------------------------------------------------------------------
// Formulaire « mot de passe oublié » (page /mot-de-passe-oublie).
// Envoie un e-mail Brevo contenant un jeton de réinitialisation (1 heure).
// ---------------------------------------------------------------------------

const INPUT_CLS =
  "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

export default function FormulaireMotDePasseOublie() {
  const [etat, formAction, enCours] = useActionState(
    demanderReinitialisation,
    initialAuthFormState,
  );

  if (etat.success) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-6">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
          {etat.message}
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {etat.message && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{etat.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="oublie-email"
          className="text-sm font-medium text-foreground"
        >
          Adresse e-mail
        </label>
        <input
          id="oublie-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="pasteur@exemple.com"
          className={INPUT_CLS}
        />
        {etat.fieldErrors["email"]?.[0] && (
          <p className="text-xs text-red-400">{etat.fieldErrors["email"][0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {enCours ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Send className="h-4 w-4" aria-hidden />
        )}
        Envoyer le lien de réinitialisation
      </button>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        Vous vous souvenez de votre mot de passe ?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}