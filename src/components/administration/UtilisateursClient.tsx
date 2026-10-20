"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Ban,
  Check,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  activerCompte,
  creerUtilisateur,
  desactiverCompte,
  modifierRole,
} from "@/actions/utilisateurs";
import {
  BADGES_ROLE,
  LIBELLES_ROLE,
  MATRICE_DROITS,
  ROLES_UTILISATEUR,
  type RoleUtilisateurValeur,
} from "@/lib/utilisateur";
import type {
  DonneesCreationUtilisateur,
  UtilisateurLigne,
} from "@/types/utilisateur";

const INPUT =
  "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40";

type FormulaireCompte = {
  nomComplet: string;
  email: string;
  telephone: string;
  role: RoleUtilisateurValeur;
  motDePasse: string;
};

const FORMULAIRE_VIDE: FormulaireCompte = {
  nomComplet: "",
  email: "",
  telephone: "",
  role: "MEMBRE_CONSULTATION",
  motDePasse: "",
};

/** Convertit une date (Date ou chaîne ISO sérialisée par RSC) en date française. */
function dateCourte(valeur: Date | string): string {
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

/** Date et heure (dernière connexion) au format français. */
function dateEtHeure(valeur: Date | string): string {
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

type Props = {
  utilisateurs: UtilisateurLigne[];
};

/** Comptes, rôles et autorisations : tableau, actions, modale et matrice des droits. */
export function UtilisateursClient({ utilisateurs }: Props) {
  const router = useRouter();

  const [motCle, setMotCle] = useState("");
  const [roleFiltre, setRoleFiltre] = useState("");
  const [statutFiltre, setStatutFiltre] = useState("");
  const [modalOuverte, setModalOuverte] = useState(false);
  const [form, setForm] = useState<FormulaireCompte>(FORMULAIRE_VIDE);
  const [erreurs, setErreurs] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<{
    texte: string;
    type: "success" | "error";
  } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  const nbActifs = useMemo(
    () => utilisateurs.filter((compte) => compte.actif).length,
    [utilisateurs],
  );
  const nbSuspendus = utilisateurs.length - nbActifs;

  const comptesFiltres = useMemo(() => {
    const q = motCle.trim().toLowerCase();
    return utilisateurs.filter((compte) => {
      const correspond =
        !q ||
        compte.nomComplet.toLowerCase().includes(q) ||
        compte.email.toLowerCase().includes(q) ||
        (compte.telephone ?? "").toLowerCase().includes(q) ||
        LIBELLES_ROLE[compte.role].toLowerCase().includes(q);
      const memeRole = !roleFiltre || compte.role === roleFiltre;
      const memeStatut =
        !statutFiltre ||
        (statutFiltre === "ACTIF" ? compte.actif : !compte.actif);
      return correspond && memeRole && memeStatut;
    });
  }, [utilisateurs, motCle, roleFiltre, statutFiltre]);

  // Fermeture par la touche Échap + verrouillage du défilement de fond.
  useEffect(() => {
    if (!modalOuverte) return;
    const onKeyDown = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setModalOuverte(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [modalOuverte]);

  const informer = (texte: string, type: "success" | "error") => {
    setMessage({ texte, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const ouvrirCreation = () => {
    setForm(FORMULAIRE_VIDE);
    setErreurs({});
    setMotDePasseVisible(false);
    setModalOuverte(true);
  };

  const soumettreCompte = async (
    evenement: React.FormEvent<HTMLFormElement>,
  ) => {
    evenement.preventDefault();
    setEnvoi(true);
    setErreurs({});
    const donnees: DonneesCreationUtilisateur = {
      nomComplet: form.nomComplet.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim() || null,
      role: form.role,
      motDePasse: form.motDePasse,
    };
    try {
      const resultat = await creerUtilisateur(donnees);
      if (resultat.success) {
        setModalOuverte(false);
        setForm(FORMULAIRE_VIDE);
        informer(resultat.message, "success");
        router.refresh();
      } else {
        setErreurs(resultat.fieldErrors);
        informer(resultat.message, "error");
      }
    } catch {
      informer("Une erreur est survenue lors de la création du compte.", "error");
    } finally {
      setEnvoi(false);
    }
  };

  const gererChangementRole = async (
    userId: string,
    nouveauRole: RoleUtilisateurValeur,
  ) => {
    setActionEnCours(userId);
    try {
      const resultat = await modifierRole(userId, nouveauRole);
      if (resultat.success) {
        informer(resultat.message, "success");
        router.refresh();
      } else {
        informer(resultat.message, "error");
      }
    } catch {
      informer("Une erreur est survenue lors du changement de rôle.", "error");
    } finally {
      setActionEnCours(null);
    }
  };

  const gererBasculage = async (compte: UtilisateurLigne) => {
    if (compte.actif) {
      const confirme = window.confirm(
        `Suspendre l'accès du compte « ${compte.nomComplet} » (${LIBELLES_ROLE[compte.role]}) ? L'utilisateur ne pourra plus se connecter.`,
      );
      if (!confirme) return;
    }
    setActionEnCours(compte.id);
    try {
      const resultat = compte.actif
        ? await desactiverCompte(compte.id)
        : await activerCompte(compte.id);
      informer(resultat.message, resultat.success ? "success" : "error");
      router.refresh();
    } catch {
      informer(
        "Une erreur est survenue lors de la mise à jour du compte.",
        "error",
      );
    } finally {
      setActionEnCours(null);
    }
  };

  const erreurChamp = (champ: string) => erreurs[champ]?.[0];

  return (
    <div className="space-y-6">
      {message && (
        <div
          role="alert"
          className={clsx(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300",
          )}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {message.texte}
        </div>
      )}

      {/* Statistiques des comptes */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-accent" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">
                Comptes enregistrés
              </p>
              <p className="text-lg font-semibold text-foreground">
                {utilisateurs.length}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Tous rôles confondus
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CircleCheck className="h-5 w-5 text-emerald-500" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">Comptes actifs</p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {nbActifs}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Accès autorisé
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Ban className="h-5 w-5 text-red-500" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">
                Comptes suspendus
              </p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {nbSuspendus}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Accès bloqué (réactivable)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'outils : recherche, filtres et création */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:max-w-sm md:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={motCle}
            onChange={(e) => setMotCle(e.target.value)}
            placeholder="Rechercher un nom, e-mail, téléphone…"
            aria-label="Rechercher un compte"
            className="h-10 w-full rounded-xl border border-card-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={roleFiltre}
            onChange={(e) => setRoleFiltre(e.target.value)}
            aria-label="Filtrer par rôle"
            className={clsx(INPUT, "w-auto min-w-44")}
          >
            <option value="">Tous les rôles</option>
            {ROLES_UTILISATEUR.map((role) => (
              <option key={role} value={role}>
                {LIBELLES_ROLE[role]}
              </option>
            ))}
          </select>
          <select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            aria-label="Filtrer par statut"
            className={clsx(INPUT, "w-auto min-w-36")}
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIF">Actifs</option>
            <option value="SUSPENDU">Suspendus</option>
          </select>
          <button
            type="button"
            onClick={ouvrirCreation}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Tableau des comptes enregistrés */}
      <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Compte</th>
              <th className="px-5 py-3 font-medium">Rôle</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 font-medium">Création</th>
              <th className="px-5 py-3 font-medium">Dernière connexion</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {comptesFiltres.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  {utilisateurs.length === 0
                    ? "Aucun compte enregistré pour le moment. Créez le premier compte avec « Nouvel utilisateur »."
                    : "Aucun compte ne correspond aux filtres appliqués."}
                </td>
              </tr>
            ) : (
              comptesFiltres.map((compte) => {
                const enAction = actionEnCours === compte.id;
                return (
                  <tr
                    key={compte.id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <span className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {compte.nomComplet}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {compte.email}
                          {compte.telephone ? ` · ${compte.telephone}` : ""}
                        </span>
                      </span>
                      {compte.motDePasseTemporaire && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                          <KeyRound className="h-3 w-3" aria-hidden />
                          Mot de passe temporaire
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          BADGES_ROLE[compte.role],
                        )}
                      >
                        {LIBELLES_ROLE[compte.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          compte.actif
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            : "bg-red-500/15 text-red-500 dark:text-red-300",
                        )}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-current"
                          aria-hidden
                        />
                        {compte.actif ? "Actif" : "Suspendu"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">
                      {dateCourte(compte.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">
                      {compte.derniereConnexion
                        ? dateEtHeure(compte.derniereConnexion)
                        : "Jamais connecté"}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={compte.role}
                          onChange={(e) =>
                            gererChangementRole(
                              compte.id,
                              e.target.value as RoleUtilisateurValeur,
                            )
                          }
                          disabled={enAction}
                          aria-label={`Rôle de ${compte.nomComplet}`}
                          className={clsx(INPUT, "h-9 w-auto min-w-40 text-xs")}
                        >
                          {ROLES_UTILISATEUR.map((role) => (
                            <option key={role} value={role}>
                              {LIBELLES_ROLE[role]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => gererBasculage(compte)}
                          disabled={enAction}
                          className={clsx(
                            "inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 disabled:opacity-60",
                            compte.actif
                              ? "border-red-500/40 text-red-500 hover:bg-red-500/10 focus-visible:ring-red-500/40"
                              : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 focus-visible:ring-emerald-500/40",
                          )}
                        >
                          {enAction ? (
                            <LoaderCircle
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden
                            />
                          ) : compte.actif ? (
                            <Ban className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {enAction
                            ? "…"
                            : compte.actif
                              ? "Suspendre"
                              : "Réactiver"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Matrice synthétique des droits par rôle */}
      <section
        aria-label="Matrice des droits par rôle"
        className="rounded-2xl border border-card-border bg-card p-5 shadow-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-accent" aria-hidden />
            Matrice des droits par rôle
          </h2>
          <p className="text-xs text-muted-foreground">
            Synthèse des autorisations accordées à chaque rôle — repère rapide
            pour l&apos;attribution des accès.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MATRICE_DROITS.map((droits) => (
            <article
              key={droits.role}
              className="flex flex-col gap-2 rounded-xl border border-card-border bg-background/60 p-4"
            >
              <span
                className={clsx(
                  "inline-flex w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  BADGES_ROLE[droits.role],
                )}
              >
                {LIBELLES_ROLE[droits.role]}
              </span>
              <p className="text-sm font-medium leading-snug text-foreground">
                {droits.resume}
              </p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {droits.acces.map((acces) => (
                  <li key={acces} className="flex items-start gap-1.5">
                    <Check
                      className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500"
                      aria-hidden
                    />
                    <span>{acces}</span>
                  </li>
                ))}
                {droits.restrictions?.map((restriction) => (
                  <li
                    key={restriction}
                    className="flex items-start gap-1.5 text-red-500 dark:text-red-300"
                  >
                    <CircleAlert
                      className="mt-0.5 h-3 w-3 shrink-0"
                      aria-hidden
                    />
                    <span>{restriction}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Modale « Nouvel utilisateur » */}
      {modalOuverte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="utilisateur-modal-titre"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer la fenêtre"
            onClick={() => setModalOuverte(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Comptes &amp; Accès
                </p>
                <h2
                  id="utilisateur-modal-titre"
                  className="text-lg font-semibold text-foreground"
                >
                  Nouvel utilisateur
                </h2>
                <p className="text-xs text-muted-foreground">
                  Création d&apos;un compte avec mot de passe temporaire et rôle
                  attribué.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOuverte(false)}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <form
              onSubmit={soumettreCompte}
              className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-5"
            >
              {erreurs._form && (
                <p className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <CircleAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  {erreurs._form[0]}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="compte-nom"
                  className="text-sm font-medium text-foreground"
                >
                  Nom complet
                  <span className="ml-1 text-red-400">*</span>
                </label>
                <input
                  id="compte-nom"
                  type="text"
                  required
                  maxLength={120}
                  value={form.nomComplet}
                  onChange={(e) =>
                    setForm({ ...form, nomComplet: e.target.value })
                  }
                  placeholder="Ex. Marie Konan"
                  className={clsx(
                    INPUT,
                    erreurChamp("nomComplet") && "border-red-500/70",
                  )}
                />
                {erreurChamp("nomComplet") && (
                  <p className="text-xs text-red-400">
                    {erreurChamp("nomComplet")}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="compte-email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                    <span className="ml-1 text-red-400">*</span>
                  </label>
                  <input
                    id="compte-email"
                    type="email"
                    required
                    maxLength={160}
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="prenom.nom@exemple.com"
                    className={clsx(
                      INPUT,
                      erreurChamp("email") && "border-red-500/70",
                    )}
                  />
                  {erreurChamp("email") && (
                    <p className="text-xs text-red-400">{erreurChamp("email")}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="compte-telephone"
                    className="text-sm font-medium text-foreground"
                  >
                    Téléphone
                  </label>
                  <input
                    id="compte-telephone"
                    type="tel"
                    maxLength={30}
                    value={form.telephone}
                    onChange={(e) =>
                      setForm({ ...form, telephone: e.target.value })
                    }
                    placeholder="+228 90 00 00 00"
                    className={clsx(
                      INPUT,
                      erreurChamp("telephone") && "border-red-500/70",
                    )}
                  />
                  {erreurChamp("telephone") && (
                    <p className="text-xs text-red-400">
                      {erreurChamp("telephone")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="compte-role"
                  className="text-sm font-medium text-foreground"
                >
                  Rôle attribué
                  <span className="ml-1 text-red-400">*</span>
                </label>
                <select
                  id="compte-role"
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as RoleUtilisateurValeur,
                    })
                  }
                  className={INPUT}
                >
                  {ROLES_UTILISATEUR.map((role) => (
                    <option key={role} value={role}>
                      {LIBELLES_ROLE[role]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {MATRICE_DROITS.find((droits) => droits.role === form.role)
                    ?.resume}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="compte-mdp"
                  className="text-sm font-medium text-foreground"
                >
                  Mot de passe temporaire
                  <span className="ml-1 text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="compte-mdp"
                    type={motDePasseVisible ? "text" : "password"}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={form.motDePasse}
                    onChange={(e) =>
                      setForm({ ...form, motDePasse: e.target.value })
                    }
                    placeholder="8 caractères minimum"
                    className={clsx(
                      INPUT,
                      "pr-10",
                      erreurChamp("motDePasse") && "border-red-500/70",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setMotDePasseVisible((v) => !v)}
                    aria-label={
                      motDePasseVisible
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {motDePasseVisible ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                {erreurChamp("motDePasse") ? (
                  <p className="text-xs text-red-400">
                    {erreurChamp("motDePasse")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Communiqué à l&apos;utilisateur pour son premier accès
                    (lettre + chiffre requis).
                  </p>
                )}
              </div>

              <div className="-mx-6 -mb-5 flex items-center justify-end gap-2 border-t border-card-border bg-muted/40 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setModalOuverte(false)}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={envoi}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {envoi ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <UserPlus className="h-4 w-4" aria-hidden />
                  )}
                  {envoi ? "Création…" : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
