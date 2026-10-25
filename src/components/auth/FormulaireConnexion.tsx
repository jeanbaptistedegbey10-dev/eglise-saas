"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, LogIn } from "lucide-react";

import { connecter } from "@/actions/connexion";
import { initialAuthFormState } from "@/types/auth";

// ---------------------------------------------------------------------------
// Formulaire de connexion (page /login) — Server Action `connecter`.
// ---------------------------------------------------------------------------

type Props = {
  /** URL d'origine à retrouver après connexion (middleware). */
  callbackUrl?: string;
  /** Message à afficher (ex : confirmation d'e-mail réussie). */
  info?: string;
  /** Variante visuelle : "violet" (défaut) ou "orange". */
  variant?: "violet" | "orange";
};

export default function FormulaireConnexion({ 
  callbackUrl, 
  info, 
  variant = "violet" 
}: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    connecter,
    initialAuthFormState,
  );

  useEffect(() => {
    if (etat.success && etat.redirectTo) {
      router.push(etat.redirectTo);
      router.refresh();
    }
  }, [etat, router]);

  const err = (champ: string) => etat.fieldErrors[champ]?.[0];

  const isOrange = variant === "orange";

  const INPUT_CLS = isOrange
    ? "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50"
    : "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

  const BUTTON_CLS = isOrange
    ? "mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white shadow-md hover:bg-orange-600 disabled:opacity-60"
    : "mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60";

  const LINK_CLS = isOrange
    ? "text-sm font-medium text-orange-600 hover:underline"
    : "text-sm font-medium text-primary hover:underline";

  const CHECKBOX_CLS = isOrange ? "h-4 w-4 accent-orange-600" : "h-4 w-4 accent-violet-600";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {callbackUrl && (
        <input type="hidden" name="redirectTo" defaultValue={callbackUrl} />
      )}

      {info && !etat.message && (
        <p
          role="status"
          className={isOrange
            ? "flex gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-700"
            : "flex gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300"
          }
        >
          {info}
        </p>
      )}

      {!etat.success && etat.message && (
        <div
          role="alert"
          className={isOrange
            ? "flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700"
            : "flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
          }
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{etat.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="connexion-email"
          className={`text-sm font-medium ${isOrange ? "text-slate-800" : "text-foreground"}`}
        >
          Adresse e-mail
        </label>
        <input
          id="connexion-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="pasteur@exemple.com"
          className={INPUT_CLS}
        />
        {err("email") && <p className="text-xs text-red-400">{err("email")}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="connexion-mdp"
          className={`text-sm font-medium ${isOrange ? "text-slate-800" : "text-foreground"}`}
        >
          Mot de passe
        </label>
        <input
          id="connexion-mdp"
          name="motDePasse"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={INPUT_CLS}
        />
        {err("motDePasse") && (
          <p className="text-xs text-red-400">{err("motDePasse")}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="seSouvenir"
            defaultChecked
            className={CHECKBOX_CLS}
          />
          Se souvenir de moi
        </label>
        <Link
          href="/mot-de-passe-oublie"
          className={LINK_CLS}
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <button
        type="submit"
        disabled={enCours}
        className={BUTTON_CLS}
      >
        {enCours ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-white" aria-hidden />
        ) : (
          <LogIn className="h-4 w-4 text-white" aria-hidden />
        )}
        Se connecter
      </button>

      <p className={`mt-2 text-center text-sm ${isOrange ? "text-slate-500" : "text-muted-foreground"}`}>
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className={isOrange ? "font-medium text-orange-600 hover:underline" : "font-medium text-primary hover:underline"}
        >
          Créer un compte
        </Link>
      </p>
    </form>
  );
}