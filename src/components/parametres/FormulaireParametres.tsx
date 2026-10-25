"use client";

import { useActionState, useState } from "react";
import { Building2, CircleAlert, CircleCheck, Loader2, Save, Users, Wallet } from "lucide-react";

import { enregistrerParametres } from "@/actions/parametres";
import { initialParametresFormState } from "@/lib/parametres-types";
import type { ConfigurationEglise } from "@/lib/configuration-eglise";
import BlocIdentite from "@/components/parametres/BlocIdentite";
import BlocCoordonnees from "@/components/parametres/BlocCoordonnees";
import BlocDevise from "@/components/parametres/BlocDevise";
import LogoUploader from "@/components/parametres/LogoUploader";
import NoteBrevo from "@/components/parametres/NoteBrevo";

/** Les trois onglets de la page Paramètres. */
const ONGLETS = [
  { id: "identite", libelle: "Identité & Légal", Icone: Building2 },
  { id: "coordonnees", libelle: "Coordonnées & Responsables", Icone: Users },
  { id: "devise", libelle: "Devise & Exercice", Icone: Wallet },
] as const;

type OngletId = (typeof ONGLETS)[number]["id"];

type Props = { initiale: ConfigurationEglise };

function BoutonEnregistrer({ enCours }: { enCours: boolean }) {
  return (
    <button
      type="submit"
      disabled={enCours}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {enCours ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Save className="h-4 w-4" aria-hidden />
      )}
      Enregistrer les modifications
    </button>
  );
}

/**
 * Formulaire des paramètres de l'église, organisé en 3 onglets :
 *  1. Identité & Légal (nom officiel, enregistrement/décret, IFU/SIRET, RIB,
 *     siège, GPS/ville + logo) ;
 *  2. Coordonnées & Responsables (e-mail, téléphone, pasteur, secrétariat) ;
 *  3. Devise & Exercice (devise, symbole, mois de début d'exercice).
 *
 * Les panneaux restent montés dans le DOM (masquage via l'attribut `hidden`) :
 * leurs champs sont donc TOUS soumis à chaque enregistrement, même depuis un
 * onglet non actif.
 *
 * ⚠️ Aucune prop Brevo/SMTP n'entre dans ce composant client : une valeur
 * d'environnement passée depuis un Server Component serait sérialisée dans le
 * payload RSC et visible depuis le navigateur. Seule `NoteBrevo` affiche un
 * message statique, sans valeur.
 */
export default function FormulaireParametres({ initiale }: Props) {
  const [etat, action, enCours] = useActionState(enregistrerParametres, initialParametresFormState);
  const [ongletActif, setOngletActif] = useState<OngletId>("identite");

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 border-b border-card-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 dark:bg-background/80">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {enCours ? "Enregistrement en cours…" : etat.message ? etat.message : "Modifiez les champs puis enregistrez."}
          </p>
          <BoutonEnregistrer enCours={enCours} />
        </div>
      </div>

      {etat.message ? (
        <div
          role="alert"
          className={
            etat.success
              ? "flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-200"
              : "flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-700 dark:text-red-200"
          }
        >
          {etat.success ? (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{etat.message}</span>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Sections des paramètres"
        className="flex flex-wrap gap-2 rounded-2xl border border-card-border bg-card p-2 shadow-sm"
      >
        {ONGLETS.map(({ id, libelle, Icone }) => {
          const actif = ongletActif === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-parametres-${id}`}
              aria-selected={actif}
              aria-controls={`panneau-parametres-${id}`}
              onClick={() => setOngletActif(id)}
              className={
                actif
                  ? "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  : "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            >
              <Icone className="h-4 w-4" aria-hidden />
              {libelle}
            </button>
          );
        })}
      </div>

      <div
        id="panneau-parametres-identite"
        role="tabpanel"
        aria-labelledby="tab-parametres-identite"
        hidden={ongletActif !== "identite"}
        className={ongletActif === "identite" ? "flex flex-col gap-6" : "hidden"}
      >
        <BlocIdentite initiale={initiale ?? {}} erreurs={etat?.fieldErrors ?? {}} />
        <LogoUploader nomEglise={initiale.nomOfficiel} initial={initiale.logoDataUrl} />
      </div>

      <div
        id="panneau-parametres-coordonnees"
        role="tabpanel"
        aria-labelledby="tab-parametres-coordonnees"
        hidden={ongletActif !== "coordonnees"}
        className={ongletActif === "coordonnees" ? "flex flex-col gap-6" : "hidden"}
      >
        <BlocCoordonnees initiale={initiale ?? {}} erreurs={etat?.fieldErrors ?? {}} />
      </div>

      <div
        id="panneau-parametres-devise"
        role="tabpanel"
        aria-labelledby="tab-parametres-devise"
        hidden={ongletActif !== "devise"}
        className={ongletActif === "devise" ? "flex flex-col gap-6" : "hidden"}
      >
        <BlocDevise initiale={initiale} erreurs={etat.fieldErrors} />
      </div>

      <NoteBrevo />

      <div className="flex justify-end">
        <BoutonEnregistrer enCours={enCours} />
      </div>
    </form>
  );
}
