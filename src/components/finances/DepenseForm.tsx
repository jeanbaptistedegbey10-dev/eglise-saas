"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useResetAuChangement } from "@/lib/use-reset-au-changement";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Pencil, Search } from "lucide-react";

import { enregistrerDepense, modifierDepense } from "@/actions/depense";
import {
  CAISSES_INTERNE,
  MODES_PAIEMENT,
  TYPE_DEPENSES,
  formatMontant,
  libelleCategorieCaisse,
} from "@/lib/finance";
import {
  initialDepenseFormState,
  type CaissePourDepense,
  type CotisationPourDepense,
  type DepenseEdition,
  type DepenseFormState,
  type MembrePourDepense,
} from "@/types/depense";

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

const LIBELLE_COTISATION_VIDE = "Sélectionnez une cotisation / un projet…";

type SourceDepense = "AFFECTEE_COTISATION" | "CAISSE_DIRECTE";
type NatureBeneficiaire = "membre" | "tiers";

type Props = {
  cotisations: CotisationPourDepense[];
  caisses: CaissePourDepense[];
  membres: MembrePourDepense[];
  exerciceId: string;
  exerciceCloture: boolean;
  /** Aujourd'hui, calculé côté serveur (cohérence d'hydratation). */
  dateInitiale: string;
  /** Dépense pré-remplie lors d'une rectification (sinon création). */
  depense?: DepenseEdition | null;
};

/**
 * Formulaire de décaissement :
 *
 *  • source — « Liée à une cotisation / projet » (menu des cotisations actives
 *    + badge du montant encaissé) OU « Sortie directe d'une caisse interne »
 *    (Caisse Générale / Solidarité / Travaux & Projets) ;
 *  • bénéficiaire — membre de l'église (recherche dans l'annuaire) ou tiers
 *    externe (texte libre).
 *
 * Sert à la création (`enregistrerDepense`) comme à la rectification
 * (`modifierDepense`) selon la prop `depense`.
 */
export default function DepenseForm({
  cotisations,
  caisses,
  membres,
  exerciceId,
  exerciceCloture,
  dateInitiale,
  depense,
}: Props) {
  const router = useRouter();
  const edition = depense ?? null;

  const [libelle, setLibelle] = useState(edition?.libelle ?? "");
  const [description, setDescription] = useState(edition?.description ?? "");
  const [montant, setMontant] = useState(edition ? String(edition.montant) : "");
  const [dateDepense, setDateDepense] = useState(edition?.dateDepense ?? dateInitiale);
  const [modePaiement, setModePaiement] = useState<string>(
    edition?.modePaiement ?? "ESPECES",
  );
  const [numeroPiece, setNumeroPiece] = useState(edition?.numeroPiece ?? "");
  const [source, setSource] = useState<SourceDepense>(
    edition?.type === "AFFECTEE_COTISATION" ? "AFFECTEE_COTISATION" : "CAISSE_DIRECTE",
  );
  const [caisseSource, setCaisseSource] = useState<string>(
    edition?.caisseId ?? caisses.find((c) => c.estParDefaut)?.id ?? caisses[0]?.id ?? "",
  );
  const [cotisationId, setCotisationId] = useState(edition?.cotisationId ?? "");
  const [natureBeneficiaire, setNatureBeneficiaire] = useState<NatureBeneficiaire>(
    edition?.beneficiaireMembreId ? "membre" : edition?.beneficiaireTiers ? "tiers" : "membre",
  );
  const [membreId, setMembreId] = useState(edition?.beneficiaireMembreId ?? "");
  const [beneficiaireTiers, setBeneficiaireTiers] = useState(
    edition?.beneficiaireTiers ?? "",
  );
  const [rechercheMembre, setRechercheMembre] = useState("");

  const [etatCreation, actionCreation, creationEnCours] = useActionState(
    (_etat: DepenseFormState, formData: FormData) => enregistrerDepense(formData),
    initialDepenseFormState,
  );
  const [etatEdition, actionEdition, editionEnCours] = useActionState(
    (_etat: DepenseFormState, formData: FormData) =>
      modifierDepense(edition?.id ?? "", formData),
    initialDepenseFormState,
  );

  const etat = edition ? etatEdition : etatCreation;
  const enCours = edition ? editionEnCours : creationEnCours;
  const formAction = edition ? actionEdition : actionCreation;

  useResetAuChangement(etat, () => {
    if (!etat.success) return;
    if (edition) return;
    setLibelle("");
    setMontant("");
    setDescription("");
    setNumeroPiece("");
    setDateDepense(dateInitiale);
    setModePaiement("ESPECES");
    setCotisationId("");
    setMembreId("");
    setBeneficiaireTiers("");
    setRechercheMembre("");
  });
  useEffect(() => {
    if (!etat.success) return;
    router.refresh();
  }, [etat]);

  // TOUTES les cotisations avec solde disponible > 0 (clôturées incluses).
  const cotisationsProposees = useMemo(() => {
    const avecSolde = cotisations.filter(
      (cotisation) => (cotisation.soldeDisponible ?? 0) > 0.005,
    );
    if (!edition?.cotisationId) return avecSolde;
    const liee = cotisations.find((cotisation) => cotisation.id === edition.cotisationId);
    return liee && !avecSolde.some((item) => item.id === liee.id)
      ? [liee, ...avecSolde]
      : avecSolde;
  }, [cotisations, edition]);

  const cotisationChoisie =
    cotisations.find((cotisation) => cotisation.id === cotisationId) ?? null;
  const soldeCotisationChoisie = cotisationChoisie
    ? (cotisationChoisie.soldeDisponible ?? 0) +
      (edition?.cotisationId === cotisationChoisie.id ? (edition?.montant ?? 0) : 0)
    : 0;
  const caisseChoisie = caisses.find((caisse) => caisse.id === caisseSource) ?? null;
  const plafondMontant =
    source === "AFFECTEE_COTISATION" && cotisationChoisie
      ? Math.max(soldeCotisationChoisie, 0) || undefined
      : source === "CAISSE_DIRECTE" && caisseChoisie
        ? Math.max(
            caisseChoisie.soldeActuel +
              (edition?.caisseId === caisseChoisie.id ? (edition?.montant ?? 0) : 0),
            0,
          ) || undefined
        : undefined;

  // Recherche par mot-clé dans l'annuaire des membres.
  const membresFiltres = useMemo(() => {
    const motCle = rechercheMembre.trim().toLowerCase();
    if (!motCle) return membres;
    return membres.filter((membre) => membre.label.toLowerCase().includes(motCle));
  }, [membres, rechercheMembre]);

  const membresAffiches = useMemo(() => {
    const selectionne = membres.find((membre) => membre.id === membreId);
    if (selectionne && !membresFiltres.some((membre) => membre.id === selectionne.id)) {
      return [selectionne, ...membresFiltres];
    }
    return membresFiltres;
  }, [membres, membresFiltres, membreId]);

  const erreurDe = (champ: string): string | undefined =>
    etat.fieldErrors[champ]?.[0];
  const erreurGlobale = etat.success
    ? null
    : ((erreurDe("_form") ?? etat.message) || null);

  const messageSucces = etat.success ? etat.message : null;

  return (
    <section
      id="formulaire-depense"
      aria-label={edition ? "Modifier une dépense" : "Enregistrer une dépense"}
      className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-5 shadow-sm"
    >
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {edition ? "Rectification" : "Nouveau décaissement"}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {edition ? "Modifier la dépense" : "Enregistrer une dépense"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {edition
            ? "Corrigez le libellé, le montant ou le bénéficiaire, puis recapturez."
            : "Dépense liée à une cotisation / projet ou tirée d'une caisse interne."}
        </p>
      </header>

      {erreurGlobale && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
        >
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {erreurGlobale}
        </p>
      )}
      {messageSucces && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {messageSucces}
        </p>
      )}
      {exerciceCloture && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-200">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          L&apos;exercice est clôturé : la saisie des dépenses est en lecture seule.
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="exerciceId" value={exerciceId} readOnly />

        {/* --- Libellé, montant, date --- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="depense-libelle" className="text-sm font-medium text-foreground">
              Libellé de la dépense<span className="ml-1 text-red-400">*</span>
            </label>
            <input
              id="depense-libelle"
              name="libelle"
              type="text"
              value={libelle}
              onChange={(evenement) => setLibelle(evenement.target.value)}
              maxLength={150}
              placeholder="Ex. Loyer du temple, Facture CIE, Aide au frère Jean"
              aria-invalid={erreurDe("libelle") ? true : undefined}
              className={clsx(INPUT_BASE, "h-10")}
            />
            {erreurDe("libelle") && (
              <p className="text-xs text-red-400">{erreurDe("libelle")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="depense-montant" className="text-sm font-medium text-foreground">
              Montant décaissé (FCFA)<span className="ml-1 text-red-400">*</span>
            </label>
            <input
              id="depense-montant"
              name="montant"
              type="number"
              inputMode="decimal"
              min={0}
              max={plafondMontant}
              step="0.01"
              value={montant}
              onChange={(evenement) => setMontant(evenement.target.value)}
              placeholder="Ex. 150000"
              aria-invalid={erreurDe("montant") ? true : undefined}
              className={clsx(INPUT_BASE, "h-10")}
            />
            {plafondMontant !== undefined && (
              <p className="text-xs text-muted-foreground">
                Montant maximum : {formatMontant(plafondMontant)} FCFA
                {source === "AFFECTEE_COTISATION" ? " (solde disponible de la cotisation)." : " (solde de la caisse)."}
              </p>
            )}
            {erreurDe("montant") && (
              <p className="text-xs text-red-400">{erreurDe("montant")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="depense-date" className="text-sm font-medium text-foreground">
              Date de la dépense<span className="ml-1 text-red-400">*</span>
            </label>
            <input
              id="depense-date"
              name="dateDepense"
              type="date"
              value={dateDepense}
              onChange={(evenement) => setDateDepense(evenement.target.value)}
              aria-invalid={erreurDe("dateDepense") ? true : undefined}
              className={clsx(INPUT_BASE, "h-10")}
            />
            {erreurDe("dateDepense") && (
              <p className="text-xs text-red-400">{erreurDe("dateDepense")}</p>
            )}
          </div>
        </div>

        {/* --- Mode de paiement, pièce justificative, description --- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="depense-mode" className="text-sm font-medium text-foreground">
              Mode de paiement<span className="ml-1 text-red-400">*</span>
            </label>
            <select
              id="depense-mode"
              name="modePaiement"
              value={modePaiement}
              onChange={(evenement) => setModePaiement(evenement.target.value)}
              aria-invalid={erreurDe("modePaiement") ? true : undefined}
              className={clsx(INPUT_BASE, "h-10")}
            >
              {MODES_PAIEMENT.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            {erreurDe("modePaiement") && (
              <p className="text-xs text-red-400">{erreurDe("modePaiement")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="depense-piece" className="text-sm font-medium text-foreground">
              N° de pièce justificative
            </label>
            <input
              id="depense-piece"
              name="numeroPiece"
              type="text"
              value={numeroPiece}
              onChange={(evenement) => setNumeroPiece(evenement.target.value)}
              maxLength={80}
              placeholder="Facture, reçu, réf. virement / MoMo (facultatif)"
              aria-invalid={erreurDe("numeroPiece") ? true : undefined}
              className={clsx(INPUT_BASE, "h-10")}
            />
            {erreurDe("numeroPiece") && (
              <p className="text-xs text-red-400">{erreurDe("numeroPiece")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="depense-description" className="text-sm font-medium text-foreground">
              Description / motif
            </label>
            <textarea
              id="depense-description"
              name="description"
              value={description}
              onChange={(evenement) => setDescription(evenement.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Précisions utiles pour le rapport (facultatif)"
              aria-invalid={erreurDe("description") ? true : undefined}
              className={clsx(INPUT_BASE, "py-2")}
            />
            {erreurDe("description") && (
              <p className="text-xs text-red-400">{erreurDe("description")}</p>
            )}
          </div>
        </div>

        {/* --- Source du décaissement --- */}
        <fieldset className="flex flex-col gap-3 rounded-xl border border-card-border bg-background/60 p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Source du décaissement<span className="ml-1 text-red-400">*</span>
          </legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TYPE_DEPENSES.map((option) => (
              <label
                key={option.value}
                className={clsx(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                  source === option.value
                    ? "border-primary bg-primary/10"
                    : "border-card-border hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={source === option.value}
                  onChange={() => setSource(option.value)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{option.resume}</span>
                </span>
              </label>
            ))}
          </div>

          {source === "AFFECTEE_COTISATION" ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="depense-cotisation"
                className="text-sm font-medium text-foreground"
              >
                Cotisation / projet financé<span className="ml-1 text-red-400">*</span>
              </label>
              {cotisationsProposees.length === 0 ? (
                <p className="rounded-lg border border-dashed border-card-border px-3 py-2.5 text-xs text-muted-foreground">
                  Aucune cotisation avec solde disponible sur cet exercice — créez-en
                  une dans « Cotisations & Barèmes » ou abonder via une caisse.
                </p>
              ) : (
                <select
                  id="depense-cotisation"
                  name="cotisationId"
                  value={cotisationId}
                  onChange={(evenement) => setCotisationId(evenement.target.value)}
                  aria-invalid={erreurDe("cotisationId") ? true : undefined}
                  className={clsx(INPUT_BASE, "h-10")}
                >
                  <option value="">{LIBELLE_COTISATION_VIDE}</option>
                  {cotisationsProposees.map((cotisation) => (
                    <option key={cotisation.id} value={cotisation.id}>
                      {cotisation.nom} — Solde dispo:{" "}
                      {formatMontant(Math.max(cotisation.soldeDisponible ?? 0, 0))} FCFA
                      {cotisation.estCloture ? " (Clôturée)" : ""}
                    </option>
                  ))}
                </select>
              )}

              {cotisationChoisie && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    Encaissé : {formatMontant(cotisationChoisie.totalCollecte)} FCFA
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                    Déjà décaissé : {formatMontant(cotisationChoisie.totalDecaisse)} FCFA
                  </span>
                  <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">
                    Reste :{" "}
                    {formatMontant(Math.max(soldeCotisationChoisie, 0))}{" "}
                    FCFA
                  </span>
                </div>
              )}

              {erreurDe("cotisationId") && (
                <p className="text-xs text-red-400">{erreurDe("cotisationId")}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="depense-caisse"
                className="text-sm font-medium text-foreground"
              >
                Caisse interne débitée<span className="ml-1 text-red-400">*</span>
              </label>
              <select
                id="depense-caisse"
                name="caisseId"
                value={caisseSource}
                onChange={(evenement) => setCaisseSource(evenement.target.value)}
                aria-invalid={erreurDe("caisseId") ? true : undefined}
                className={clsx(INPUT_BASE, "h-10")}
              >
                <option value="">Sélectionnez une caisse…</option>
                {caisses.map((caisse) => (
                  <option key={caisse.id} value={caisse.id}>
                    {caisse.nom} (Solde : {formatMontant(caisse.soldeActuel)} FCFA)
                  </option>
                ))}
                {caisses.length === 0 &&
                  CAISSES_INTERNE.map((caisse) => (
                    <option key={caisse.value} value={caisse.value}>
                      {caisse.label}
                    </option>
                  ))}
              </select>
              <input type="hidden" name="caisseSource" value={edition?.caisseSource ?? "GENERALE"} />
              <p className="text-xs text-muted-foreground">
                {caisseChoisie
                  ? `${caisseChoisie.description ?? ""} — Solde : ${formatMontant(caisseChoisie.soldeActuel)} FCFA.`
                  : edition?.caisseSource
                    ? `Ancienne valeur : ${libelleCategorieCaisse(edition.caisseSource)} — choisissez une caisse réelle ci-dessus.`
                    : "La dépense débitera le solde actuel de la caisse choisie."}
              </p>
              {erreurDe("caisseId") && (
                <p className="text-xs text-red-400">{erreurDe("caisseId")}</p>
              )}
            </div>
          )}
        </fieldset>

        {/* --- Bénéficiaire --- */}
        <fieldset className="flex flex-col gap-3 rounded-xl border border-card-border bg-background/60 p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Bénéficiaire du décaissement<span className="ml-1 text-red-400">*</span>
          </legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                natureBeneficiaire === "membre"
                  ? "border-primary bg-primary/10"
                  : "border-card-border hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                name="natureBeneficiaire"
                value="membre"
                checked={natureBeneficiaire === "membre"}
                onChange={() => setNatureBeneficiaire("membre")}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  Membre de l&apos;église
                </span>
                <span className="text-xs text-muted-foreground">
                  Aide, remboursement ou versement à un membre enregistré.
                </span>
              </span>
            </label>

            <label
              className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                natureBeneficiaire === "tiers"
                  ? "border-primary bg-primary/10"
                  : "border-card-border hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                name="natureBeneficiaire"
                value="tiers"
                checked={natureBeneficiaire === "tiers"}
                onChange={() => setNatureBeneficiaire("tiers")}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  Bénéficiaire externe / Tiers
                </span>
                <span className="text-xs text-muted-foreground">
                  Propriétaire, artisan, fournisseur, bailleur…
                </span>
              </span>
            </label>
          </div>

          {natureBeneficiaire === "membre" ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="depense-recherche-membre"
                className="text-sm font-medium text-foreground"
              >
                Rechercher un membre
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  id="depense-recherche-membre"
                  type="search"
                  value={rechercheMembre}
                  onChange={(evenement) => setRechercheMembre(evenement.target.value)}
                  placeholder="Tapez un nom ou un prénom…"
                  className={clsx(INPUT_BASE, "h-10 pl-9")}
                />
              </div>
              <select
                id="depense-membre"
                name="beneficiaireMembreId"
                value={membreId}
                onChange={(evenement) => setMembreId(evenement.target.value)}
                aria-invalid={erreurDe("beneficiaireMembreId") ? true : undefined}
                className={clsx(INPUT_BASE, "h-10")}
              >
                <option value="">Sélectionnez un membre…</option>
                {membresAffiches.map((membre) => (
                  <option key={membre.id} value={membre.id}>
                    {membre.label}
                  </option>
                ))}
              </select>
              {membres.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun membre enregistré — ajoutez d&apos;abord des membres dans
                  « Communauté ».
                </p>
              )}
              {rechercheMembre.trim() !== "" && membresAffiches.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun membre ne correspond à cette recherche.
                </p>
              )}
              {erreurDe("beneficiaireMembreId") && (
                <p className="text-xs text-red-400">
                  {erreurDe("beneficiaireMembreId")}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="depense-tiers"
                className="text-sm font-medium text-foreground"
              >
                Nom du bénéficiaire externe
              </label>
              <input
                id="depense-tiers"
                name="beneficiaireTiers"
                type="text"
                value={beneficiaireTiers}
                onChange={(evenement) => setBeneficiaireTiers(evenement.target.value)}
                maxLength={150}
                placeholder="Ex. Propriétaire temple, Fournisseur électricité"
                aria-invalid={erreurDe("beneficiaireTiers") ? true : undefined}
                className={clsx(INPUT_BASE, "h-10")}
              />
              {erreurDe("beneficiaireTiers") && (
                <p className="text-xs text-red-400">{erreurDe("beneficiaireTiers")}</p>
              )}
            </div>
          )}
        </fieldset>

        {/* --- Soumission --- */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border pt-4">
          <p className="text-xs text-muted-foreground">
            Les champs marqués <span className="text-red-400">*</span> sont
            obligatoires.
          </p>
          <div className="flex items-center gap-2">
            {edition && (
              <Link
                href="/finances/depenses"
                className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Annuler
              </Link>
            )}
            <button
              type="submit"
              disabled={enCours || exerciceCloture}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              {enCours ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : edition ? (
                <Pencil className="h-4 w-4" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              {enCours
                ? "Enregistrement…"
                : edition
                  ? "Enregistrer les corrections"
                  : "Enregistrer la dépense"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
