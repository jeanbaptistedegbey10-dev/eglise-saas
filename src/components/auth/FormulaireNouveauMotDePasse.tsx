"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, KeyRound, LoaderCircle } from "lucide-react";

import { reinitialiserMotDePasse } from "@/actions/auth";
import { initialAuthFormState } from "@/types/auth";

// ---------------------------------------------------------------------------
// Formulaire de réinitialisation de mot de passe
// (page /reinitialisation-mot-de-passe?jeton=...).
// ---------------------------------------------------------------------------

const INPUT_CLS =
  "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

export default function FormulaireNouveauMotDePasse({ jeton }: { jeton: string }) {
  const [etat, formAction, enCours] = useActionState(
    reinitialiserMotDePasse,
    initialAuthFormState,
  );

  const err = (champ: string) => etat.fieldErrors[champ]?.[0];

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
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="jeton" value={jeton} />

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
          htmlFor="reinit-mdp"
          className="text-sm font-medium text-foreground"
        >
          Nouveau mot de passe
        </label>
        <input
          id="reinit-mdp"
          name="motDePasse"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="8 caractères minimum, avec un chiffre"
          className={INPUT_CLS}
        />
        {err("motDePasse") && (
          <p className="text-xs text-red-400">{err("motDePasse")}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="reinit-confirmation"
          className="text-sm font-medium text-foreground"
        >
          Confirmer le mot de passe
        </label>
        <input
          id="reinit-confirmation"
          name="confirmation"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className={INPUT_CLS}
        />
        {err("confirmation") && (
          <p className="text-xs text-red-400">{err("confirmation")}</p>
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
          <KeyRound className="h-4 w-4" aria-hidden />
        )}
        Réinitialiser mon mot de passe
      </button>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}