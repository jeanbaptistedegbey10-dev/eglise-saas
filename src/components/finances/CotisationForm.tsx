"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Check, CircleAlert, LoaderCircle, X } from "lucide-react";

import { enregistrerCotisation } from "@/actions/cotisation";
import {
  CIBLES_CLASSE,
  CIBLES_SEXE,
  FREQUENCES_RECURRENTES,
  TYPES_COTISATION,
  formatMontant,
  libelleCible,
  periodesParAn,
  typeAvecBarème,
} from "@/lib/cotisation";
import { initialCotisationFormState, type CotisationEdition } from "@/types/cotisation";
import type {
  CibleCotisation,
  FrequenceCotisation,
  TypeCotisation,
} from "@/generated/prisma/client";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

type Props = {
  exerciceId: string;
  exerciceLibelle: string;
  /** Cotisation à modifier (bouton « Modifier »), sinon création. */
  edition?: CotisationEdition | null;
  /** URL d'annulation de la modification. */
  urlAnnulation: string;
  departements?: { id: string; nom: string }[];
  groupes?: { id: string; nom: string }[];
};

/**
 * Formulaire de création / modification d'une cotisation. Quatre natures :
 *  • récurrente par classe (grille tarifaire mensuelle / hebdo),
 *  • ponctuelle / aide ciblée (grille tarifaire servant de plancher obligatoire
 *    par classe, surplus volontaire possible),
 *  • travaux & projets (montant libre, cible globale facultative),
 *  • quête de culte (montant libre, sans barème imposé).
 * La grille des barèmes apparaît pour les natures à barème (récurrente et
 * ponctuelle) — ni paiement ni rapport dans cet onglet.
 */
export default function CotisationForm({
  exerciceId,
  exerciceLibelle,
  edition,
  urlAnnulation,
  departements = [],
  groupes = [],
}: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    enregistrerCotisation,
    initialCotisationFormState,
  );

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TypeCotisation>("RECURRENTE_CLASSE");
  const [frequence, setFrequence] = useState<FrequenceCotisation>("MENSUEL");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [autoriserSurplus, setAutoriserSurplus] = useState(false);
  const [montantCible, setMontantCible] = useState("");
  const [barèmeParSexe, setBarèmeParSexe] = useState(false);
  const [departementId, setDepartementId] = useState("");
  const [groupeId, setGroupeId] = useState("");
  // Montants de la grille tarifaire, indexés par cible.
  const [montants, setMontants] = useState<Record<string, string>>({});

  // Pré-remplissage en mode modification : recharge à chaque changement de
  // cotisation éditée (?edition=) sans réinitialiser à blanc entre deux clics.
  useResetAuChangement(edition, () => {
    setNom(edition?.nom ?? "");
    setDescription(edition?.description ?? "");
    setType(edition?.type ?? "RECURRENTE_CLASSE");
    setFrequence(edition?.frequence ?? "MENSUEL");
    setDateDebut(edition?.dateDebut ?? "");
    setDateFin(edition?.dateFin ?? "");
    setAutoriserSurplus(edition?.autoriserSurplus ?? false);
    setMontantCible(edition?.montantCible != null ? String(edition.montantCible) : "");
    setDepartementId(edition?.departementId ?? "");
    setGroupeId(edition?.groupeId ?? "");
    const grille: Record<string, string> = {};
    for (const bareme of edition?.baremes ?? []) {
      grille[bareme.cible] = String(bareme.montant);
    }
    setMontants(grille);
    // Le barème « par sexe » n'est pas persisté : on le déduit des cibles
    // enregistrées (HOMME / FEMME → par sexe ; ADULTE / JEUNE / ENFANT → par âge).
    const cibles = new Set((edition?.baremes ?? []).map((bareme) => bareme.cible));
    setBarèmeParSexe(cibles.has("HOMME") || cibles.has("FEMME"));
  });

  useResetAuChangement(etat, () => {
    if (!etat.success) return;
    if (edition) return;
    // Création : on vide la saisie pour la cotisation suivante.
    setNom("");
    setDescription("");
    setDateDebut("");
    setDateFin("");
    setMontantCible("");
    setDepartementId("");
    setGroupeId("");
    setAutoriserSurplus(false);
    setMontants({});
    setBarèmeParSexe(false);
  });
  useEffect(() => {
    if (!etat.success) return;
    router.refresh();
    if (edition) {
      router.push(urlAnnulation);
    }
  }, [etat, edition, urlAnnulation]);

  const erreurDe = (champ: string): string | undefined => etat.fieldErrors[champ]?.[0];
  // Erreurs de la grille (« baremes », « baremes.0.montant »…).
  const erreurBaremes = Object.entries(etat.fieldErrors).find(([cle]) =>
    cle.startsWith("baremes"),
  )?.[1]?.[0];

  // Natures pilotant l'affichage des sections.
  const aUneGrille = typeAvecBarème(type); // récurrente + ponctuelle → grille tarifaire

  const baremesPayload = useMemo(() => {
    if (!typeAvecBarème(type)) return "[]";
    const cibles = barèmeParSexe ? CIBLES_SEXE : CIBLES_CLASSE;
    const lignes: { cible: CibleCotisation; montant: number | string }[] = [];
    for (const cible of cibles) {
      const brut = (montants[cible] ?? "").trim();
      if (brut === "") continue;
      const nombre = Number(brut.replace(",", "."));
      lignes.push({ cible, montant: Number.isFinite(nombre) ? nombre : brut });
    }
    return JSON.stringify(lignes);
  }, [type, montants, barèmeParSexe]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="exerciceId" value={exerciceId} />
      {edition && <input type="hidden" name="id" value={edition.id} />}
      <input type="hidden" name="baremes" value={baremesPayload} />
      {!etat.success && etat.message && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{etat.message}</span>
        </div>
      )}
      <header className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-foreground">
          {edition ? "Modifier la cotisation" : "Nouvelle cotisation"}
        </h2>
        <p className="text-xs text-muted-foreground">Exercice {exerciceLibelle}</p>
      </header>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cotisation-nom" className="text-sm font-medium text-foreground">
          Nom de la cotisation
        </label>
        <input
          id="cotisation-nom"
          name="nom"
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex. Cotisation mensuelle 2024"
          aria-invalid={erreurDe("nom") ? true : undefined}
          className={clsx(INPUT_BASE, "h-10")}
        />
        {erreurDe("nom") && <p className="text-xs text-red-400">{erreurDe("nom")}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cotisation-description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="cotisation-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optionnel - décrivez la cotisation ou l'action associée"
          className={clsx(INPUT_BASE, "min-h-[6rem]")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cotisation-type" className="text-sm font-medium text-foreground">
          Nature
        </label>
        <select
          id="cotisation-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as TypeCotisation)}
          className={clsx(INPUT_BASE, "h-10")}
        >
          {TYPES_COTISATION.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cotisation-departement" className="text-sm font-medium text-foreground">
            Rattacher à un département <span className="text-muted-foreground">(facultatif)</span>
          </label>
          <select
            id="cotisation-departement"
            name="departementId"
            value={departementId}
            onChange={(e) => setDepartementId(e.target.value)}
            className={clsx(INPUT_BASE, "h-10")}
          >
            <option value="">Aucun — toute l&apos;église</option>
            {departements.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nom}
              </option>
            ))}
          </select>
          {erreurDe("departementId") && (
            <p className="text-xs text-red-400">{erreurDe("departementId")}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cotisation-groupe" className="text-sm font-medium text-foreground">
            Rattacher à un groupe <span className="text-muted-foreground">(facultatif)</span>
          </label>
          <select
            id="cotisation-groupe"
            name="groupeId"
            value={groupeId}
            onChange={(e) => setGroupeId(e.target.value)}
            className={clsx(INPUT_BASE, "h-10")}
          >
            <option value="">Aucun — toute l&apos;église</option>
            {groupes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nom}
              </option>
            ))}
          </select>
          {erreurDe("groupeId") && (
            <p className="text-xs text-red-400">{erreurDe("groupeId")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cotisation-date-debut"
            className="text-sm font-medium text-foreground"
          >
            Date de début <span className="text-muted-foreground">(facultatif)</span>
          </label>
          <input
            id="cotisation-date-debut"
            name="dateDebut"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            aria-invalid={erreurDe("dateDebut") ? true : undefined}
            className={clsx(INPUT_BASE, "h-10")}
          />
          {erreurDe("dateDebut") && (
            <p className="text-xs text-red-400">{erreurDe("dateDebut")}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cotisation-date-fin"
            className="text-sm font-medium text-foreground"
          >
            Date limite <span className="text-muted-foreground">(facultatif)</span>
          </label>
          <input
            id="cotisation-date-fin"
            name="dateFin"
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            aria-invalid={erreurDe("dateFin") ? true : undefined}
            className={clsx(INPUT_BASE, "h-10")}
          />
          {erreurDe("dateFin") && (
            <p className="text-xs text-red-400">{erreurDe("dateFin")}</p>
          )}
        </div>
      </div>

      {type === "RECURRENTE_CLASSE" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cotisation-frequence" className="text-sm font-medium text-foreground">
            Fréquence
          </label>
          <select
            id="cotisation-frequence"
            name="frequence"
            value={frequence}
            onChange={(e) => setFrequence(e.target.value as FrequenceCotisation)}
            aria-invalid={erreurDe("frequence") ? true : undefined}
            className={clsx(INPUT_BASE, "h-10")}
          >
            {FREQUENCES_RECURRENTES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {erreurDe("frequence") && (
            <p className="text-xs text-red-400">{erreurDe("frequence")}</p>
          )}
        </div>
      )}

      {aUneGrille && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cotisation-barème-par-sexe"
            checked={barèmeParSexe}
            onChange={(e) => setBarèmeParSexe(e.target.checked)}
            className="h-4 w-4 rounded border-card-border text-primary focus:ring-primary"
          />
          <label htmlFor="cotisation-barème-par-sexe" className="text-sm text-foreground">
            Barème par sexe (Hommes / Femmes)
          </label>
        </div>
      )}

      {aUneGrille && (
        <div className="relative flex flex-col gap-3 rounded-xl border border-card-border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              Grille tarifaire
            </h3>
            <span className="text-xs text-muted-foreground">
              {type === "RECURRENTE_CLASSE"
                ? frequence === "HEBDOMADAIRE"
                  ? "hebdomadaire"
                  : "mensuelle"
                : "plancher obligatoire"}
            </span>
          </div>

          <div className="flex flex-col gap-3">
                    {barèmeParSexe
                      ? CIBLES_SEXE.map((cible) => {
                          const valeur = montants[cible] ?? "";
                          const nombre = Number(valeur.replace(",", "."));
                          const annuel =
                            valeur.trim() !== "" && Number.isFinite(nombre)
                              ? nombre * periodesParAn(frequence)
                              : 0;

                          return (
                            <div
                              key={cible}
                              className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[7rem_1fr_auto]"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {libelleCible(cible)}
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label={`Montant ${libelleCible(cible)}`}
                                  value={valeur}
                                  onChange={(evenement) =>
                                    setMontants((precedent) => ({
                                      ...precedent,
                                      [cible]: evenement.target.value,
                                    }))
                                  }
                                  placeholder="Ex. 5000"
                                  className={clsx(
                                    INPUT_BASE,
                                    "h-10 w-32 min-w-[120px] px-3 py-2 text-right tabular-nums",
                                  )}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {type === "RECURRENTE_CLASSE"
                                    ? `FCFA / ${frequence === "HEBDOMADAIRE" ? "semaine" : "mois"}`
                                    : "FCFA"}
                                </span>
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground sm:text-right">
                                {type === "RECURRENTE_CLASSE" && annuel > 0
                                  ? `= ${formatMontant(annuel)} FCFA / an`
                                  : "—"}
                              </span>
                            </div>
                          );
                        })
                      : CIBLES_CLASSE.map((cible) => {
                          const valeur = montants[cible] ?? "";
                          const nombre = Number(valeur.replace(",", "."));
                          const annuel =
                            valeur.trim() !== "" && Number.isFinite(nombre)
                              ? nombre * periodesParAn(frequence)
                              : 0;

                          return (
                            <div
                              key={cible}
                              className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[7rem_1fr_auto]"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {libelleCible(cible)}
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label={`Montant ${libelleCible(cible)}`}
                                  value={valeur}
                                  onChange={(evenement) =>
                                    setMontants((precedent) => ({
                                      ...precedent,
                                      [cible]: evenement.target.value,
                                    }))
                                  }
                                  placeholder="Ex. 5000"
                                  className={clsx(
                                    INPUT_BASE,
                                    "h-10 w-32 min-w-[120px] px-3 py-2 text-right tabular-nums",
                                  )}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {type === "RECURRENTE_CLASSE"
                                    ? `FCFA / ${frequence === "HEBDOMADAIRE" ? "semaine" : "mois"}`
                                    : "FCFA"}
                                </span>
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground sm:text-right">
                                {type === "RECURRENTE_CLASSE" && annuel > 0
                                  ? `= ${formatMontant(annuel)} FCFA / an`
                                  : "—"}
                              </span>
                            </div>
                          );
                        })}
                  </div>

                  {erreurBaremes && (
                    <p className="text-xs text-red-400">{erreurBaremes}</p>
                  )}
                </div>
              )}

      {type === "PONCTUELLE_EVENEMENT" && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cotisation-autoriser-surplus"
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <input
              type="checkbox"
              id="cotisation-autoriser-surplus"
              name="autoriserSurplus"
              checked={autoriserSurplus}
              onChange={(e) => setAutoriserSurplus(e.target.checked)}
              className="h-4 w-4 rounded border-card-border text-primary focus:ring-primary"
            />
            Autoriser surplus / don volontaire
          </label>
          <p className="text-xs text-muted-foreground">
            Si actif, le contributeur peut verser au-delà du plancher de sa classe
            (ex. Adulte 5 000 FCFA → 7 000 FCFA).
          </p>
        </div>
      )}

      {type === "ANONYME_PROJET" && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cotisation-montant-cible"
            className="text-sm font-medium text-foreground"
          >
            Montant cible / objectif (facultatif)
          </label>
          <input
            id="cotisation-montant-cible"
            name="montantCible"
            type="text"
            inputMode="decimal"
            value={montantCible}
            onChange={(e) => setMontantCible(e.target.value)}
            placeholder="Ex. 2000000"
            aria-invalid={erreurDe("montantCible") ? true : undefined}
            className={clsx(INPUT_BASE, "h-10")}
          />
          {erreurDe("montantCible") ? (
            <p className="text-xs text-red-400">{erreurDe("montantCible")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Objectif global de la campagne (loyer, réfection, instruments…). Laisser
              vide pour un montant libre.
            </p>
          )}
        </div>
      )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {edition && (
                  <Link
                    href={urlAnnulation}
                    className="inline-flex items-center gap-2 rounded-lg border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Annuler
                  </Link>
                )}
                <button
                  type="submit"
                  disabled={enCours}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {enCours ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  {enCours
                    ? "Enregistrement…"
                    : edition
                      ? "Enregistrer les modifications"
                      : "Créer la cotisation"}
                </button>
              </div>
    </form>
  );
}

