"use client";

import { useEffect, useState, useActionState } from "react";
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
    champs: ["nom", "prenoms"],
  },
  { id: "contact", numero: 2, label: "Contact", icon: Phone, champs: ["telephone", "email"] },
  { id: "adresse", numero: 3, label: "Adresse", icon: MapPin, champs: ["adresse"] },
  { id: "emploi", numero: 4, label: "Emploi", icon: Briefcase, champs: ["profession"] },
  {
    id: "ecclesiastique",
    numero: 5,
    label: "Données ecclésiastiques",
    icon: Church,
    champs: ["bapteme", "dateBapteme", "fonctions"],
  },
] as const;

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
  defaultValue?: string;
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
  defaultValue,
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
          defaultValue={defaultValue}
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
          defaultValue={defaultValue}
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

  const donnees = parseDonneesEcclesiastiques(membre?.donneesEcclesiastiques ?? null);
  const indexActif = TABS.findIndex((tab) => tab.id === ongletActif);
  const dernierOnglet = indexActif === TABS.length - 1;

  // Après soumission : fermer en cas de succès, sinon ouvrir le premier
  // onglet qui contient un champ en erreur.
  useEffect(() => {
    if (etat.success) {
      setOpen(false);
      setOngletActif("personnel");
      router.refresh();
      return;
    }

    const ongletEnErreur = TABS.find((tab) =>
      tab.champs.some((champ) => etat.fieldErrors[champ] !== undefined),
    );
    if (ongletEnErreur) setOngletActif(ongletEnErreur.id);
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

          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
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

            {/* Onglets horizontaux */}
            <div
              role="tablist"
              aria-label="Sections du formulaire"
              className="flex overflow-x-auto border-b border-card-border bg-muted/30 px-2"
            >
              {TABS.map((tab) => {
                const Icone = tab.icon;
                const actif = tab.id === ongletActif;
                const enErreur = tab.champs.some(
                  (champ) => etat.fieldErrors[champ] !== undefined,
                );

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={actif}
                    aria-controls="membre-form-panel"
                    onClick={() => setOngletActif(tab.id)}
                    className={clsx(
                      "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      actif
                        ? "border-primary font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icone className="h-4 w-4 shrink-0" aria-hidden />
                    <span
                      className={clsx(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                        actif
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tab.numero}
                    </span>
                    {tab.label}
                    {enErreur && (
                      <span
                        className="h-2 w-2 rounded-full bg-red-500"
                        title="Champ en erreur"
                      />
                    )}
                  </button>
                );
              })}
            </div>



            {/* Formulaire */}
            <form action={formAction} className="flex min-h-0 flex-1 flex-col">
              {membre && <input type="hidden" name="id" defaultValue={membre.id} />}

              <div className="min-h-[300px] flex-1 overflow-y-auto px-6 py-6">
                {!etat.success && etat.message && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{etat.message}</span>
                  </div>
                )}

                <div
                  id="membre-form-panel"
                  role="tabpanel"
                  aria-labelledby={`tab-${ongletActif}`}
                  className="flex flex-col gap-5"
                >
                  {ongletActif === "personnel" && (
                    <>
                      <TextField
                        id="nom"
                        name="nom"
                        label="Nom"
                        required
                        defaultValue={membre?.nom}
                        placeholder="Ex. Kouassi"
                        autoComplete="family-name"
                        error={erreurDe("nom")}
                      />
                      <TextField
                        id="prenoms"
                        name="prenoms"
                        label="Prénoms"
                        required
                        defaultValue={membre?.prenoms}
                        placeholder="Ex. Jean Marc"
                        autoComplete="given-name"
                        error={erreurDe("prenoms")}
                      />
                    </>
                  )}

                  {ongletActif === "contact" && (
                    <>
                      <TextField
                        id="telephone"
                        name="telephone"
                        label="Téléphone"
                        type="tel"
                        required
                        defaultValue={membre?.telephone}
                        placeholder="Ex. 07 00 00 00 00"
                        autoComplete="tel"
                        error={erreurDe("telephone")}
                        hint="Numéro unique — il identifie le membre dans le répertoire."
                      />
                      <TextField
                        id="email"
                        name="email"
                        label="Adresse e-mail"
                        type="email"
                        defaultValue={membre?.email ?? ""}
                        placeholder="Ex. jean@exemple.com"
                        autoComplete="email"
                        error={erreurDe("email")}
                        hint="Facultatif."
                      />
                    </>
                  )}

                  {ongletActif === "adresse" && (
                    <TextField
                      id="adresse"
                      name="adresse"
                      label="Adresse"
                      multiline
                      defaultValue={membre?.adresse ?? ""}
                      placeholder="Quartier, rue, ville…"
                      error={erreurDe("adresse")}
                      hint="Facultatif — indiquez le quartier et la ville."
                    />
                  )}


                  {ongletActif === "emploi" && (
                    <TextField
                      id="profession"
                      name="profession"
                      label="Profession"
                      defaultValue={membre?.profession ?? ""}
                      placeholder="Ex. Enseignant"
                      error={erreurDe("profession")}
                      hint="Facultatif — métier ou activité principale du membre."
                    />
                  )}

                  {ongletActif === "ecclesiastique" && (
                    <>
                      <label
                        htmlFor="bapteme"
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-card-border bg-background px-4 py-3 transition-colors hover:border-primary/50"
                      >
                        <input
                          id="bapteme"
                          name="bapteme"
                          type="checkbox"
                          defaultChecked={donnees.bapteme === true}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">Baptisé(e)</span>
                          <span className="text-xs text-muted-foreground">
                            Cochez si la personne a reçu le baptême.
                          </span>
                        </span>
                      </label>

                      <TextField
                        id="dateBapteme"
                        name="dateBapteme"
                        label="Date de baptême"
                        type="date"
                        defaultValue={donnees.dateBapteme ?? ""}
                        error={erreurDe("dateBapteme")}
                        hint="Facultatif."
                      />

                      <TextField
                        id="fonctions"
                        name="fonctions"
                        label="Fonctions ecclésiastiques"
                        defaultValue={donnees.fonctions?.join(", ") ?? ""}
                        placeholder="Ex. Ancien, Chorale, Accueil"
                        error={erreurDe("fonctions")}
                        hint="Séparez les fonctions par des virgules."
                      />
                    </>
                  )}
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
                      onClick={() => setOngletActif(TABS[indexActif + 1].id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
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

