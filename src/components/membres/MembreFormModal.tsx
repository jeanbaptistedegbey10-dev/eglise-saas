"use client";

import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Briefcase,
  Check,
  ChevronRight,
  CircleAlert,
  Church,
  LoaderCircle,
  MapPin,
  Pencil,
  Phone,
  User,
  UserPlus,
  X,
} from "lucide-react";

import { enregistrerMembre } from "@/actions/membre";
import AdresseAutocompleteMap from "@/components/membres/AdresseAutocompleteMap";
import PhotoUploader from "@/components/membres/PhotoUploader";
import { parseDonneesEcclesiastiques } from "@/lib/membre";
import { initialMembreFormState, type MembreEditable } from "@/types/membre";

// ---------------------------------------------------------------------------
// Onglets horizontaux du formulaire modulaire
// ---------------------------------------------------------------------------

const TABS = [
  {
    id: "personnel",
    numero: 1,
    label: "Données personnelles",
    icon: User,
    champs: ["nom", "prenoms", "nomPere", "nomMere", "dateNaissance", "sexe", "etatCivil", "photoDataUrl"],
  },
  {
    id: "contact",
    numero: 2,
    label: "Contact",
    icon: Phone,
    champs: ["telephone", "email", "telephoneFixe", "indicatifPays"],
  },
  { id: "adresse", numero: 3, label: "Adresse", icon: MapPin, champs: ["adresse"] },
  {
    id: "emploi",
    numero: 4,
    label: "Données sur l'emploi",
    icon: Briefcase,
    champs: ["profession", "lieuTravail", "adresseProfessionnelle", "telephoneProfessionnel"],
  },
  {
    id: "ecclesiastique",
    numero: 5,
    label: "Données ecclésiastiques",
    icon: Church,
    champs: ["classificationSociale", "statutMembre", "typePersonne", "membreDepuis", "dateConversion", "egliseConversion", "eglisePrecedente", "bapteme", "dateBapteme", "fonctions"],
  },
] as const;

const INDICATIFS_PAYS = [
  { code: "+228", drapeau: "🇹🇬", pays: "Togo", label: "🇹🇬 Togo (+228)" },
];

const DEFAUT_INDICATIF = "+228";

type TabId = (typeof TABS)[number]["id"];

const INPUT_BASE =
  "flex w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

// ---------------------------------------------------------------------------
// Champ de formulaire local (erreurs pilotées par l'état du Server Action)
// ---------------------------------------------------------------------------

type TextFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  required?: boolean;
};

function TextField({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  hint,
  error,
  multiline,
  required,
}: TextFieldProps) {
  const describedBy = error ? `${id}-erreur` : hint ? `${id}-aide` : undefined;
  const classes = clsx(
    INPUT_BASE,
    multiline ? "min-h-24 py-2.5" : "h-10",
    error && "border-red-500/70 focus:border-red-500 focus:ring-red-500/30",
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-1 text-red-400" aria-hidden>
            *
          </span>
        )}
      </label>

      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={classes}

        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={classes}
        />
      )}

      {error ? (
        <p id={`${id}-erreur`} className="text-xs text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-aide`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SelectFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
  required?: boolean;
};

function SelectField({ id, name, label, value, onChange, options, error, hint, required }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-red-400" aria-hidden>*</span>}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={clsx(INPUT_BASE, "h-10", error && "border-red-500/70 focus:border-red-500 focus:ring-red-500/30")}
      >
        <option value="">Sélectionner…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-400">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PhoneField({ id, name, label, value, onChange, error, hint, required, autoComplete, placeholder = "Numéro de téléphone" }: {
  id: string; name: string; label: string; value: string;
  onChange: (v: string) => void;
  error?: string; hint?: string; required?: boolean; autoComplete?: string; placeholder?: string;
}) {
  // CORRECTION DÉFINITIVE — saisie téléphone SANS BLOCAGE :
  // - Le champ est séparé en 2 éléments côte à côte : <select> indicatif + <input> numéro.
  // - L'input affiche le numéro SANS trim de fin pendant la frappe (les espaces
  //   de séparation "07 00 ..." ne disparaissent plus quand on tape).
  // - Seule la valeur SOUMISE (hidden) est trimmée pour rester propre en BDD.
  const valeurBrute = value ?? "";
  const valeurSansEspacesDebut = valeurBrute.replace(/^\s+/, "");
  // Un seul indicatif autorisé : +228 (Togo). Correspondance exacte du préfixe.
  const codeTrouve = useMemo(
    () =>
      [...INDICATIFS_PAYS]
        .sort((a, b) => b.code.length - a.code.length)
        .find((c) => valeurSansEspacesDebut.startsWith(c.code)),
    [valeurSansEspacesDebut],
  );
  // Indicatif mémorisé : choisir le pays AVANT de taper le numéro ne doit pas retomber sur l'ancien défaut.
  // Pays par défaut : Togo (+228).
  // On dérive l'indicatif affiché directement de l'état, sans effet ni setState :
  // dès que la valeur externe impose un autre indicatif (mode édition), c'est
  // `codeTrouve` qui fait foi (règle `react-hooks/set-state-in-effect`).
  const [indicatifMemorise, setIndicatifMemorise] = useState<string>(DEFAUT_INDICATIF);

  const indicatif = codeTrouve?.code ?? indicatifMemorise;
  // IMPORTANT : on ne retire qu'UN seul espace de séparation après l'indicatif,
  // on conserve tout le reste (espaces intérieurs + espace final en cours de frappe).
  const numero = codeTrouve
    ? valeurSansEspacesDebut.slice(codeTrouve.code.length).replace(/^\s/, "")
    : valeurSansEspacesDebut;

  const changerIndicatif = (code: string) => {
    setIndicatifMemorise(code);
    if (numero.trim() !== "") {
      onChange(`${code} ${numero.trim()}`);
    }
  };
  // Saisie libre SANS BLOCAGE : on ne coupe ni les espaces intérieurs ni les
  // espaces de fin pendant la frappe — uniquement les espaces de tête.
  const changerNumero = (n: string) => {
    const sansEspacesDebut = n.replace(/^\s+/, "");
    if (sansEspacesDebut === "") {
      onChange("");
      return;
    }
    // On propage tel quel (espaces conservés) pour ne jamais bloquer la frappe.
    onChange(`${indicatif} ${sansEspacesDebut}`);
  };
  // Valeur réellement envoyée au Server Action : version nettoyée (sans espace final).
  const valeurSoumise = numero.trim() === "" ? "" : `${indicatif} ${numero.trim()}`;
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-red-400" aria-hidden>*</span>}
      </label>
      {/* Sélecteur pays/drapeau + saisie numéro — flexbox horizontale, côte à côte */}
      <div className="flex w-full items-center gap-3">
        <select
          id={`${id}-indicatif`}
          aria-label={`Pays / indicatif — ${label}`}
          title="Choix du pays / indicatif"
          value={indicatif}
          onChange={(e) => changerIndicatif(e.target.value)}
          className="flex h-10 w-44 shrink-0 cursor-pointer rounded-lg border border-card-border bg-background px-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
        >
          {INDICATIFS_PAYS.map((c) => (
            <option key={c.code} value={c.code} title={c.label}>{c.label}</option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          value={numero}
          onChange={(e) => changerNumero(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-label={`${label} — numéro`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : hint ? `${id}-aide` : undefined}
          className={clsx(INPUT_BASE, "h-10 w-full min-w-0 flex-1", error && "border-red-500/70 focus:border-red-500 focus:ring-red-500/30")}
        />
      </div>
      <input type="hidden" name={name} value={valeurSoumise} />
      {error ? <p id={`${id}-erreur`} className="text-xs text-red-400">{error}</p> : hint ? <p id={`${id}-aide`} className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modale
// ---------------------------------------------------------------------------

type Props = {
  /** Fiche à modifier — absente pour une création. */
  membre?: MembreEditable | null;
  /** Libellé du bouton déclencheur. */
  triggerLabel?: string;
  /** Variante visuelle du bouton déclencheur. */
  variant?: "primary" | "secondary";
};

export default function MembreFormModal({ membre, triggerLabel, variant = "primary" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ongletActif, setOngletActif] = useState<TabId>("personnel");
  const [etat, formAction, enCours] = useActionState(enregistrerMembre, initialMembreFormState);

  const donneesInitiales = useMemo(
    () => parseDonneesEcclesiastiques(membre?.donneesEcclesiastiques ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [membre?.id],
  );

  // État GLOBAL unique : tous les champs des 5 onglets vivent ici.
  // Zéro perte : aucune réinitialisation lors d'un changement d'onglet
  // ou d'une validation serveur ratée.
  type Formulaire = {
    nom: string;
    prenoms: string;
    nomPere: string;
    nomMere: string;
    dateNaissance: string;
    sexe: string;
    etatCivil: string;
    telephone: string;
    telephoneFixe: string;
    email: string;
    adresse: string;
    adresseLatitude: string;
    adresseLongitude: string;
    profession: string;
    lieuTravail: string;
    adresseProfessionnelle: string;
    telephoneProfessionnel: string;
    classificationSociale: string;
    statutMembre: string;
    typePersonne: string;
    membreDepuis: string;
    dateConversion: string;
    egliseConversion: string;
    eglisePrecedente: string;
    bapteme: boolean;
    dateBapteme: string;
    fonctions: string;
  };

  const construireValeursInitiales = (): Formulaire => ({
    nom: membre?.nom ?? "",
    prenoms: membre?.prenoms ?? "",
    nomPere: donneesInitiales.nomPere ?? "",
    nomMere: donneesInitiales.nomMere ?? "",
    dateNaissance: donneesInitiales.dateNaissance ?? "",
    sexe: donneesInitiales.sexe ?? "",
    etatCivil: donneesInitiales.etatCivil ?? "",
    telephone: membre?.telephone ?? "",
    telephoneFixe: donneesInitiales.telephoneFixe ?? "",
    email: membre?.email ?? "",
    adresse: membre?.adresse ?? "",
    adresseLatitude: donneesInitiales.adresseLatitude != null ? String(donneesInitiales.adresseLatitude) : "",
    adresseLongitude: donneesInitiales.adresseLongitude != null ? String(donneesInitiales.adresseLongitude) : "",
    profession: membre?.profession ?? "",
    lieuTravail: donneesInitiales.lieuTravail ?? "",
    adresseProfessionnelle: donneesInitiales.adresseProfessionnelle ?? "",
    telephoneProfessionnel: donneesInitiales.telephoneProfessionnel ?? "",
    classificationSociale: donneesInitiales.classificationSociale ?? "",
    statutMembre: donneesInitiales.statutMembre ?? "",
    typePersonne: donneesInitiales.typePersonne ?? "",
    membreDepuis: donneesInitiales.membreDepuis ?? "",
    dateConversion: donneesInitiales.dateConversion ?? "",
    egliseConversion: donneesInitiales.egliseConversion ?? "",
    eglisePrecedente: donneesInitiales.eglisePrecedente ?? "",
    bapteme: donneesInitiales.bapteme === true,
    dateBapteme: donneesInitiales.dateBapteme ?? "",
    fonctions: donneesInitiales.fonctions?.join(", ") ?? "",
  });

  // Initialisation paresseuse : le formulaire est construit UNE seule fois
  // (au montage) via l'initialiseur paresseux de `useState`. On ne lit donc
  // aucune ref pendant le rendu (règle `react-hooks/refs`).
  const [formulaire, setFormulaire] = useState<Formulaire>(construireValeursInitiales);
  const setChamp = (cle: keyof Formulaire, valeur: string | boolean) =>
    setFormulaire((prev) => ({ ...prev, [cle]: valeur }));

  // RESTART CLEAN : on ne réinitialise qu'à l'ouverture (transition
  // fermé → ouvert). Jamais lors d'un changement d'onglet ni d'une
  // validation serveur ratée → zéro perte de données.
  const ouvertPrecedentRef = useRef(false);
  useEffect(() => {
    if (open && !ouvertPrecedentRef.current) {
      setFormulaire(construireValeursInitiales());
      setOngletActif("personnel");
    }
    ouvertPrecedentRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const indexActif = TABS.findIndex((tab) => tab.id === ongletActif);
  const dernierOnglet = indexActif === TABS.length - 1;

  // Après soumission : fermer en cas de succès, sinon ouvrir le premier
  // onglet qui contient un champ en erreur.
  //
  // On évite le `setState` synchrone dans un effet (règle
  // `react-hooks/set-state-in-effect`) : la fermeture et la sélection
  // d'onglet sont dérivées PENDANT le rendu à partir de l'état serveur,
  // puis l'effet ne fait que le rafraîchissement des données.
  const ongletEnErreur = etat.success
    ? undefined
    : TABS.find((tab) =>
        tab.champs.some((champ) => etat.fieldErrors[champ] !== undefined),
      );
  if (etat.success) {
    if (open) setOpen(false);
    if (ongletActif !== "personnel") setOngletActif("personnel");
  } else if (ongletEnErreur && ongletEnErreur.id !== ongletActif) {
    setOngletActif(ongletEnErreur.id);
  }

  useEffect(() => {
    if (etat.success) router.refresh();
  }, [etat, router]);

  // Fermeture par la touche Échap + verrouillage du défilement de fond.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const erreurDe = (champ: string): string | undefined => etat.fieldErrors[champ]?.[0];
  const DeclencheurIcon = variant === "primary" ? UserPlus : Pencil;
  const libelleDeclencheur = triggerLabel ?? (membre ? "Modifier" : "Nouveau membre");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "inline-flex items-center gap-2 rounded-xl text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
          variant === "primary"
            ? "bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            : "border border-card-border bg-card px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <DeclencheurIcon className={variant === "primary" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
        {libelleDeclencheur}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="membre-modal-titre"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer la fenêtre"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative mx-auto flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  {membre ? "Modification" : "Création"} — étape {indexActif + 1} sur {TABS.length}
                </p>
                <h2 id="membre-modal-titre" className="text-lg font-semibold text-foreground">
                  {membre ? `${membre.nom} ${membre.prenoms}` : "Nouveau membre"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer la fenêtre"
                className="rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {/* Onglets horizontaux — 5 onglets entièrement visibles d'un coup d'œil, sans coupure ni défilement horizontal */}
            <div
              role="tablist"
              aria-label="Sections du formulaire"
              className="w-full flex items-center justify-between border-b border-white/10 pb-3 gap-1"
            >
              {TABS.map((tab) => {
                const Icone = tab.icon;
                const actif = tab.id === ongletActif;
                const nbErreurs = tab.champs.filter(
                  (champ) => etat.fieldErrors[champ] !== undefined,
                ).length;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={actif}
                    aria-controls="membre-form-panel"
                    onClick={() => setOngletActif(tab.id)}
                    className="px-2 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 text-xs font-medium border-b-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span
                      className={clsx(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        actif
                          ? "bg-primary text-primary-foreground"
                          : nbErreurs > 0
                            ? "bg-red-500/15 text-red-500"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {nbErreurs > 0 && !actif ? nbErreurs : tab.numero}
                    </span>
                    <span className="whitespace-nowrap leading-tight" title={tab.label}>
                      {tab.label}
                    </span>
                    {nbErreurs > 0 && (
                      <span
                        className="h-2 w-2 rounded-full bg-red-500"
                        title={`${nbErreurs} champ(s) en erreur dans cet onglet — cliquez pour corriger`}
                      />
                    )}
                  </button>
                );
              })}
            </div>



            {/* Formulaire — les 5 panneaux restent montés (cachés via `hidden`)
                pour que toutes les valeurs contrôlées soient soumises ensemble
                au Server Action, même depuis un autre onglet.
                CORRECTION DÉFINITIVE BOUTON "SUIVANT" (Étape 4 Emploi → Étape 5) :
                - Le bouton "Suivant" est en type="button" : il ne soumet JAMAIS le formulaire.
                - Le onSubmit bloque toute soumission tant qu'on n'est pas sur le dernier
                  onglet (ex. touche Entrée sur l'étape Emploi = simple navigation).
                - L'enregistrement réel en BDD ne part QUE depuis le bouton final
                  type="submit" du dernier onglet ("Données ecclésiastiques"). */}
            <form
              action={formAction}
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                if (!dernierOnglet) {
                  // Navigation PURE depuis un onglet intermédiaire (dont l'Étape 4
                  // "Données sur l'emploi") : jamais de soumission / validation serveur.
                  e.preventDefault();
                  if (indexActif < TABS.length - 1) {
                    setOngletActif(TABS[indexActif + 1].id);
                  }
                }
              }}
            >
              {membre && <input type="hidden" name="id" value={membre.id} />}

              <div className="min-h-[300px] flex-1 overflow-y-auto px-6 py-6">
                {!etat.success && etat.message && (
                  <div
                    role="alert"
                    className="mb-5 flex flex-col gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    <span className="flex items-start gap-2">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>{etat.message}</span>
                    </span>
                    {Object.keys(etat.fieldErrors).length > 0 && (
                      <span className="flex flex-wrap gap-1.5 pl-6 text-xs">
                        {TABS.filter((t) =>
                          t.champs.some((c) => etat.fieldErrors[c] !== undefined),
                        ).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setOngletActif(t.id)}
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 font-medium text-red-300 outline-none transition-colors hover:bg-red-500/20 focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Voir l&apos;onglet « {t.label} »
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                )}

                <div
                  id="membre-form-panel"
                  role="tabpanel"
                  aria-labelledby={`tab-${ongletActif}`}
                  className="flex flex-col gap-5"
                >
                  <div hidden={ongletActif !== "personnel"} className={ongletActif !== "personnel" ? "hidden" : "flex flex-col gap-5"}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="nom" name="nom" label="Nom" required value={formulaire.nom} onChange={(v) => setChamp("nom", v)} placeholder="Ex. Kouassi" autoComplete="family-name" error={erreurDe("nom")} />
                        <TextField id="prenoms" name="prenoms" label="Prénoms" required value={formulaire.prenoms} onChange={(v) => setChamp("prenoms", v)} placeholder="Ex. Jean Marc" autoComplete="given-name" error={erreurDe("prenoms")} />
                      </div>
                      <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-background px-4 py-4">
                        <span className="text-sm font-medium text-foreground">Photo du membre</span>
                        <PhotoUploader
                          initial={membre?.photoDataUrl ?? null}
                          initiales={`${(formulaire.prenoms || "?").charAt(0)}${(formulaire.nom || "?").charAt(0)}`.toUpperCase()}
                          nomComplet={`${formulaire.nom} ${formulaire.prenoms}`.trim()}
                          erreur={erreurDe("photoDataUrl")}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="nomPere" name="nomPere" label="Nom de famille du père" value={formulaire.nomPere} onChange={(v) => setChamp("nomPere", v)} placeholder="Ex. Kouassi N'Guessan" error={erreurDe("nomPere")} />
                        <TextField id="nomMere" name="nomMere" label="Nom de famille de la mère" value={formulaire.nomMere} onChange={(v) => setChamp("nomMere", v)} placeholder="Ex. Yao Aya" error={erreurDe("nomMere")} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="dateNaissance" name="dateNaissance" label="Date de naissance" type="date" value={formulaire.dateNaissance} onChange={(v) => setChamp("dateNaissance", v)} error={erreurDe("dateNaissance")} />
                        <SelectField id="sexe" name="sexe" label="Sexe" required value={formulaire.sexe} onChange={(v) => setChamp("sexe", v)} options={[{ value: "", label: "Sélectionner…" }, { value: "Masculin", label: "Masculin" }, { value: "Féminin", label: "Féminin" }]} error={erreurDe("sexe")} />
                        <SelectField id="etatCivil" name="etatCivil" label="État civil" value={formulaire.etatCivil} onChange={(v) => setChamp("etatCivil", v)} options={[{ value: "", label: "Sélectionner…" }, { value: "Célibataire", label: "Célibataire" }, { value: "Marié(e)", label: "Marié(e)" }, { value: "Veuf / Veuve", label: "Veuf / Veuve" }, { value: "Divorcé(e)", label: "Divorcé(e)" }]} error={erreurDe("etatCivil")} />
                      </div>
                  </div>

                  <div hidden={ongletActif !== "contact"} className={ongletActif !== "contact" ? "hidden" : "flex flex-col gap-5"}>
                      {/* Téléphones empilés : chacun pleine largeur, l'un en dessous de l'autre */}
                      <div className="flex w-full flex-col gap-4">
                        {/* Ligne 1 — Téléphone cellulaire * (pleine largeur) */}
                        <PhoneField id="telephone" name="telephone" label="Téléphone cellulaire" required value={formulaire.telephone} onChange={(v) => setChamp("telephone", v)} autoComplete="tel" error={erreurDe("telephone")} hint="Numéro unique avec indicatif pays — identifie le membre." />
                        {/* Ligne 2 — Numéro WhatsApp facultatif (pleine largeur) */}
                        <PhoneField id="telephoneFixe" name="telephoneFixe" label="Numéro WhatsApp" value={formulaire.telephoneFixe} onChange={(v) => setChamp("telephoneFixe", v)} autoComplete="tel" placeholder="+228 90 12 34 56" error={erreurDe("telephoneFixe")} hint="Facultatif — pour envoyer des messages WhatsApp." />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="email" name="email" label="E-mail" type="email" value={formulaire.email} onChange={(v) => setChamp("email", v)} placeholder="komlan.mensa@paroisse.tg" autoComplete="email" error={erreurDe("email")} hint="Facultatif." />
                        <p className="hidden text-xs text-muted-foreground sm:block sm:pt-8">L’e-mail sert aux rappels et reçus (facultatif, unique).</p>
                      </div>
                  </div>

                  <div hidden={ongletActif !== "adresse"} className={ongletActif !== "adresse" ? "hidden" : "flex flex-col gap-5"}>
                    <AdresseAutocompleteMap
                      valeur={formulaire.adresse}
                      onValeurChange={(v) => setChamp("adresse", v)}
                      latitude={formulaire.adresseLatitude ? Number(formulaire.adresseLatitude) : null}
                      longitude={formulaire.adresseLongitude ? Number(formulaire.adresseLongitude) : null}
                      onPositionChange={(p) => {
                        setChamp("adresseLatitude", p ? String(p.lat) : "");
                        setChamp("adresseLongitude", p ? String(p.lon) : "");
                      }}
                      valeurInitiale={membre?.adresse ?? ""}
                      latitudeInitiale={donneesInitiales.adresseLatitude ?? null}
                      longitudeInitiale={donneesInitiales.adresseLongitude ?? null}
                      erreur={erreurDe("adresse")}
                    />
                  </div>


                  <div hidden={ongletActif !== "emploi"} className={ongletActif !== "emploi" ? "hidden" : "flex flex-col gap-5"}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="profession" name="profession" label="Profession" value={formulaire.profession} onChange={(v) => setChamp("profession", v)} placeholder="Ex. Enseignant" error={erreurDe("profession")} />
                        <TextField id="lieuTravail" name="lieuTravail" label="Lieu de travail" value={formulaire.lieuTravail} onChange={(v) => setChamp("lieuTravail", v)} placeholder="Ex. Lycée de Tokoin, Lomé" error={erreurDe("lieuTravail")} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="adresseProfessionnelle" name="adresseProfessionnelle" label="Adresse professionnelle" multiline value={formulaire.adresseProfessionnelle} onChange={(v) => setChamp("adresseProfessionnelle", v)} placeholder="Adresse du lieu de travail…" error={erreurDe("adresseProfessionnelle")} />
                        <PhoneField id="telephoneProfessionnel" name="telephoneProfessionnel" label="Téléphone professionnel" value={formulaire.telephoneProfessionnel} onChange={(v) => setChamp("telephoneProfessionnel", v)} autoComplete="tel" error={erreurDe("telephoneProfessionnel")} />
                      </div>
                  </div>

                  <div hidden={ongletActif !== "ecclesiastique"} className={ongletActif !== "ecclesiastique" ? "hidden" : "flex flex-col gap-5"}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="classificationSociale" name="classificationSociale" label="Classification sociale" value={formulaire.classificationSociale} onChange={(v) => setChamp("classificationSociale", v)} placeholder="Ex. Jeune, Femme, Homme…" error={erreurDe("classificationSociale")} />
                        <SelectField id="statutMembre" name="statutMembre" label="Statut de membre" value={formulaire.statutMembre} onChange={(v) => setChamp("statutMembre", v)} options={[{ value: "", label: "Sélectionner…" }, { value: "Membre actif", label: "Membre actif" }, { value: "Nouveau converti", label: "Nouveau converti" }, { value: "Sympathisant", label: "Sympathisant" }, { value: "En observation", label: "En observation" }]} error={erreurDe("statutMembre")} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SelectField id="typePersonne" name="typePersonne" label="Type de personne" required value={formulaire.typePersonne} onChange={(v) => setChamp("typePersonne", v)} options={[{ value: "", label: "Sélectionner…" }, { value: "Adulte", label: "Adulte" }, { value: "Jeune", label: "Jeune" }, { value: "Enfant", label: "Enfant" }, { value: "Visiteur", label: "Visiteur" }]} error={erreurDe("typePersonne")} />
                        <TextField id="membreDepuis" name="membreDepuis" label="Membre depuis" type="date" value={formulaire.membreDepuis} onChange={(v) => setChamp("membreDepuis", v)} error={erreurDe("membreDepuis")} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="dateConversion" name="dateConversion" label="Date de conversion" type="date" value={formulaire.dateConversion} onChange={(v) => setChamp("dateConversion", v)} error={erreurDe("dateConversion")} />
                        <TextField id="egliseConversion" name="egliseConversion" label="Église de conversion" value={formulaire.egliseConversion} onChange={(v) => setChamp("egliseConversion", v)} placeholder="Ex. Église Centrale" error={erreurDe("egliseConversion")} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField id="eglisePrecedente" name="eglisePrecedente" label="Église précédente" value={formulaire.eglisePrecedente} onChange={(v) => setChamp("eglisePrecedente", v)} placeholder="Ex. Église d'origine…" error={erreurDe("eglisePrecedente")} />
                        <TextField id="dateBapteme" name="dateBapteme" label="Date de baptême" type="date" value={formulaire.dateBapteme} onChange={(v) => setChamp("dateBapteme", v)} error={erreurDe("dateBapteme")} hint="Facultatif." />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label htmlFor="bapteme" className="flex cursor-pointer items-start gap-3 rounded-xl border border-card-border bg-background px-4 py-3 transition-colors hover:border-primary/50">
                          <input id="bapteme" name="bapteme" type="checkbox" checked={formulaire.bapteme} onChange={(e) => setChamp("bapteme", e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                          <span className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">Baptisé</span>
                            <span className="text-xs text-muted-foreground">Cochez si la personne a reçu le baptême.</span>
                          </span>
                        </label>

                        <TextField
                          id="fonctions"
                          name="fonctions"
                          label="Fonctions ecclésiastiques"
                          value={formulaire.fonctions} onChange={(v) => setChamp("fonctions", v)}
                          placeholder="Ex. Ancien, Chorale, Accueil"
                          error={erreurDe("fonctions")}
                          hint="Séparez les fonctions par des virgules."
                        />
                      </div>
                  </div>
                </div>
              </div>

              {/* Pied de la modale */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border bg-muted/40 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Annuler
                </button>

                <div className="flex items-center gap-2">
                  {indexActif > 0 && (
                    <button
                      type="button"
                      onClick={() => setOngletActif(TABS[indexActif - 1].id)}
                      disabled={enCours}
                      className="rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      Précédent
                    </button>
                  )}

                  {dernierOnglet ? (
                    <button
                      type="submit"
                      disabled={enCours}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      {enCours ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Check className="h-4 w-4" aria-hidden />
                      )}
                      {enCours
                        ? "Enregistrement…"
                        : membre
                          ? "Mettre à jour"
                          : "Enregistrer"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        // CORRECTION DÉFINITIVE — Étape 4 "Données sur l'emploi" → Étape 5 :
                        // navigation PURE vers "Données ecclésiastiques", JAMAIS de soumission,
                        // d'enregistrement ni de validation serveur ici.
                        // Le Server Action `enregistrerMembre` ne part QUE depuis le bouton
                        // final type="submit" du dernier onglet.
                        e.preventDefault();
                        e.stopPropagation();
                        if (indexActif < TABS.length - 1) {
                          setOngletActif(TABS[indexActif + 1].id);
                        }
                      }}
                      disabled={enCours}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

