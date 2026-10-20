"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, LoaderCircle, UserPlus } from "lucide-react";

import { inscrireUtilisateur } from "@/actions/auth";
import { initialAuthFormState } from "@/types/auth";

// ---------------------------------------------------------------------------
// Formulaire d'inscription publique (page /register) — Server Action
// `inscrireUtilisateur` (crée le compte inactif et envoie l'e-mail de
// confirmation via Brevo).
// ---------------------------------------------------------------------------

const INPUT_CLS =
  "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";

export default function FormulaireInscription() {
  const [etat, formAction, enCours] = useActionState(
    inscrireUtilisateur,
    initialAuthFormState,
  );

  const err = (champ: string) => etat.fieldErrors[champ]?.[0];

  // Succès : le compte est créé, l'e-mail de confirmation part via Brevo.
  if (etat.success) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-6">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
          {etat.message}
        </p>
        <p className="text-sm text-muted-foreground">
          Pensez à vérifier vos spams si vous ne voyez pas le message.
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Aller à la connexion
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="inscription-prenom"
            className="text-sm font-medium text-foreground"
          >
            Prénom
          </label>
          <input
            id="inscription-prenom"
            name="prenom"
            type="text"
            required
            maxLength={60}
            autoComplete="given-name"
            placeholder="Jean"
            className={INPUT_CLS}
          />
          {err("prenom") && (
            <p className="text-xs text-red-400">{err("prenom")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="inscription-nom"
            className="text-sm font-medium text-foreground"
          >
            Nom
          </label>
          <input
            id="inscription-nom"
            name="nom"
            type="text"
            required
            maxLength={60}
            autoComplete="family-name"
            placeholder="Mvangi"
            className={INPUT_CLS}
          />
          {err("nom") && <p className="text-xs text-red-400">{err("nom")}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inscription-email"
          className="text-sm font-medium text-foreground"
        >
          Adresse e-mail
        </label>
        <input
          id="inscription-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="jean.mvangi@exemple.com"
          className={INPUT_CLS}
        />
        {err("email") && <p className="text-xs text-red-400">{err("email")}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inscription-mdp"
          className="text-sm font-medium text-foreground"
        >
          Mot de passe
        </label>
        <input
          id="inscription-mdp"
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
          htmlFor="inscription-confirmation"
          className="text-sm font-medium text-foreground"
        >
          Confirmer le mot de passe
        </label>
        <input
          id="inscription-confirmation"
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

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="cgu"
          required
          className="mt-0.5 h-4 w-4 accent-violet-600"
        />
        <span>
          J&apos;accepte les conditions générales d&apos;utilisation et la
          politique de confidentialité de la plateforme.
        </span>
      </label>
      {err("cgu") && <p className="text-xs text-red-400">{err("cgu")}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {enCours ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden />
        )}
        Créer mon compte
      </button>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
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