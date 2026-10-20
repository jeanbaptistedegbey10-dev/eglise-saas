"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Database,
  Filter,
  LogIn,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";

interface JournalEntree {
  id: string;
  action: string;
  entite: string;
  entiteId: string | null;
  auteurNom: string;
  details: string;
  createdAt: Date;
}

/** Style unique des champs de sélection et de date (thème sombre). */
const CHAMP =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 [color-scheme:light] dark:[color-scheme:dark]";

/** Style de la barre de recherche (icône calée à gauche). */
const CHAMP_RECHERCHE =
  "h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40";

type VarianteBadge = "default" | "secondary" | "destructive" | "outline";

/** Types d'action proposés par le filtre et leurs motifs de correspondance en base. */
const TYPES_ACTION: {
  libelle: string;
  /** Sous-chaînes attendues dans `action` (comparaison en majuscules). */
  motifs: string[];
  /** Limite la correspondance aux entités de compte (création = inscription). */
  surCompteSeulement?: boolean;
}[] = [
  { libelle: "Connexion", motifs: ["CONNEXION", "LOGIN"] },
  {
    libelle: "Inscription",
    motifs: ["INSCRIPTION", "CREATION", "CREER", "CONFIRMATION_EMAIL"],
    surCompteSeulement: true,
  },
  { libelle: "Modification", motifs: ["MODIFICATION", "MODIFIER", "UPDATE", "MISE_A_JOUR"] },
  { libelle: "Suppression", motifs: ["SUPPRESSION", "SUPPRIMER", "DELETE"] },
  { libelle: "Injection", motifs: ["INJECTION"] },
  { libelle: "Purge", motifs: ["PURGE"] },
];

/** Entités ciblées : libellé affiché → valeurs réellement stockées au journal. */
const ENTITES_CIBLEES: { libelle: string; valeurs: string[] }[] = [
  { libelle: "Membre", valeurs: ["Membre", "Utilisateur"] },
  { libelle: "Caisse", valeurs: ["Caisse"] },
  { libelle: "Cotisation", valeurs: ["Cotisation"] },
  { libelle: "Paramètres", valeurs: ["Paramètres", "Parametres", "ConfigurationEglise"] },
];

/** Classes des badges d'action (lisibles en mode clair comme en mode sombre). */
const CLASSES_BADGE: Record<VarianteBadge, string> = {
  default: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  secondary: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  destructive: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300",
  outline: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300",
};

/** Vrai si l'entrée correspond au type d'action sélectionné dans le panneau. */
function correspondTypeAction(entree: JournalEntree, filtre: string): boolean {
  if (!filtre) return true;
  const type = TYPES_ACTION.find((t) => t.libelle === filtre);
  if (!type) return true;
  const action = entree.action.toUpperCase();
  if (!type.motifs.some((motif) => action.includes(motif))) return false;
  if (!type.surCompteSeulement) return true;
  const entite = entree.entite.toUpperCase();
  return entite === "UTILISATEUR" || entite === "MEMBRE" || entite === "COMPTE";
}

/** Vrai si l'entité de l'entrée correspond à l'option sélectionnée. */
function correspondEntite(entite: string, filtre: string): boolean {
  if (!filtre) return true;
  const option = ENTITES_CIBLEES.find((o) => o.libelle === filtre);
  if (option) return option.valeurs.some((v) => v.toLowerCase() === entite.toLowerCase());
  return entite.toLowerCase() === filtre.toLowerCase();
}

function badgePourAction(action: string): {
  label: string;
  icon: LucideIcon;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const a = action.toUpperCase();
  if (a.includes("CONNEXION") || a.includes("LOGIN")) {
    return { label: "Connexion", icon: LogIn, variant: "outline" };
  }
  if (a.includes("INSCRIPTION") || a.includes("CONFIRMATION")) {
    return { label: "Inscription", icon: UserPlus, variant: "default" };
  }
  if (a.includes("CREATION") || a.includes("CREER")) {
    return { label: "Création", icon: Clock, variant: "default" };
  }
  if (a.includes("SUPPRESSION") || a.includes("SUPPRIMER") || a.includes("DELETE")) {
    return { label: "Suppression", icon: ShieldAlert, variant: "destructive" };
  }
  if (a.includes("PURGE")) {
    return { label: "Purge", icon: Trash2, variant: "destructive" };
  }
  if (a.includes("INJECTION")) {
    return { label: "Injection", icon: Database, variant: "secondary" };
  }
  if (a.includes("SUSPENSION")) {
    return { label: "Suspension", icon: ShieldAlert, variant: "destructive" };
  }
  if (
    a.includes("MODIFICATION") ||
    a.includes("MODIFIER") ||
    a.includes("UPDATE") ||
    a.includes("MISE_A_JOUR")
  ) {
    return { label: "Modification", icon: ShieldAlert, variant: "secondary" };
  }
  if (a.includes("REACTIVATION")) {
    return { label: "Réactivation", icon: ShieldAlert, variant: "default" };
  }
  if (a.includes("REINITIALISATION")) {
    return { label: "Réinitialisation", icon: ShieldAlert, variant: "outline" };
  }
  if (a.includes("CLOTURE")) {
    return { label: "Clôture", icon: ShieldAlert, variant: "secondary" };
  }
  if (a.includes("ROUVERTURE") || a.includes("ROUVRIR")) {
    return { label: "Réouverture", icon: ShieldAlert, variant: "secondary" };
  }
  if (a.includes("VIREMENT")) {
    return { label: "Virement", icon: ShieldAlert, variant: "outline" };
  }
  return { label: action, icon: Clock, variant: "default" };
}

export function JournalAuditTable({ entrees }: { entrees: JournalEntree[] }) {
  const [motCle, setMotCle] = useState("");
  const [auteurFiltre, setAuteurFiltre] = useState("");
  const [typeActionFiltre, setTypeActionFiltre] = useState("");
  const [entiteFiltre, setEntiteFiltre] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  // Auteurs / utilisateurs distincts, pour le select du panneau de filtres.
  const auteurs = useMemo(
    () => [...new Set(entrees.map((e) => e.auteurNom))].sort((a, b) => a.localeCompare(b, "fr")),
    [entrees],
  );

  // Entités proposées : les 4 entités de traçabilité + celles présentes dans le journal.
  const entitesDisponibles = useMemo(() => {
    const dejaCouvertes = new Set(
      ENTITES_CIBLEES.flatMap((o) => o.valeurs.map((v) => v.toLowerCase())),
    );
    const complementaires = [...new Set(entrees.map((e) => e.entite))]
      .filter((entite) => !dejaCouvertes.has(entite.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "fr"));
    return [...ENTITES_CIBLEES.map((o) => o.libelle), ...complementaires];
  }, [entrees]);

  const filtresActifs = Boolean(
    motCle || auteurFiltre || typeActionFiltre || entiteFiltre || dateDebut || dateFin,
  );

  const reinitialiserFiltres = () => {
    setMotCle("");
    setAuteurFiltre("");
    setTypeActionFiltre("");
    setEntiteFiltre("");
    setDateDebut("");
    setDateFin("");
  };

  // Moteur de filtrage : la recherche et les 4 filtres sont appliqués simultanément.
  const filtrees = useMemo(() => {
    const mc = motCle.toLowerCase().trim();
    let debut = dateDebut ? new Date(`${dateDebut}T00:00:00`) : null;
    let fin = dateFin ? new Date(`${dateFin}T23:59:59.999`) : null;
    if (debut && fin && debut > fin) {
      [debut, fin] = [fin, debut];
    }

    return entrees.filter((e) => {
      const date = new Date(e.createdAt);

      const correspondRecherche =
        !mc ||
        e.action.toLowerCase().includes(mc) ||
        e.entite.toLowerCase().includes(mc) ||
        e.auteurNom.toLowerCase().includes(mc) ||
        e.details.toLowerCase().includes(mc) ||
        (e.entiteId ?? "").toLowerCase().includes(mc) ||
        date.toLocaleDateString("fr-FR").includes(mc) ||
        date.toLocaleTimeString("fr-FR").includes(mc);

      const correspondAuteur = !auteurFiltre || e.auteurNom === auteurFiltre;
      const correspondAction = correspondTypeAction(e, typeActionFiltre);
      const correspondEntiteChoisie = correspondEntite(e.entite, entiteFiltre);
      const correspondDate = (!debut || date >= debut) && (!fin || date <= fin);

      return (
        correspondRecherche &&
        correspondAuteur &&
        correspondAction &&
        correspondEntiteChoisie &&
        correspondDate
      );
    });
  }, [entrees, motCle, auteurFiltre, typeActionFiltre, entiteFiltre, dateDebut, dateFin]);

  return (
    <div className="space-y-4">
      {/* Barre d'outils : recherche personnalisée dans le journal */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={motCle}
            onChange={(e) => setMotCle(e.target.value)}
            placeholder="Rechercher (action, entité, auteur, détail, date)…"
            aria-label="Rechercher dans le journal d'audit"
            className={CHAMP_RECHERCHE}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          <span role="status">
            {filtrees.length} entrée(s) affichée(s)
            {filtresActifs ? " — filtres actifs" : ""}
          </span>
        </div>
      </div>

      {/* Panneau de filtres combinés (traçabilité) */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filtres de traçabilité
          </span>
          {filtresActifs && (
            <button
              type="button"
              onClick={reinitialiserFiltres}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Réinitialiser
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="audit-filtre-auteur"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Auteur / Utilisateur
            </label>
            <select
              id="audit-filtre-auteur"
              value={auteurFiltre}
              onChange={(e) => setAuteurFiltre(e.target.value)}
              className={CHAMP}
            >
              <option value="">Tous les auteurs</option>
              {auteurs.map((auteur) => (
                <option key={auteur} value={auteur}>
                  {auteur}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="audit-filtre-action"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Type d'action
            </label>
            <select
              id="audit-filtre-action"
              value={typeActionFiltre}
              onChange={(e) => setTypeActionFiltre(e.target.value)}
              className={CHAMP}
            >
              <option value="">Toutes les actions</option>
              {TYPES_ACTION.map((type) => (
                <option key={type.libelle} value={type.libelle}>
                  {type.libelle}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="audit-filtre-entite"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Entité ciblée
            </label>
            <select
              id="audit-filtre-entite"
              value={entiteFiltre}
              onChange={(e) => setEntiteFiltre(e.target.value)}
              className={CHAMP}
            >
              <option value="">Toutes les entités</option>
              {entitesDisponibles.map((entite) => (
                <option key={entite} value={entite}>
                  {entite}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="audit-filtre-date-debut"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Date début
            </label>
            <input
              id="audit-filtre-date-debut"
              type="date"
              value={dateDebut}
              max={dateFin || undefined}
              onChange={(e) => setDateDebut(e.target.value)}
              className={CHAMP}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="audit-filtre-date-fin"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Date fin
            </label>
            <input
              id="audit-filtre-date-fin"
              type="date"
              value={dateFin}
              min={dateDebut || undefined}
              onChange={(e) => setDateFin(e.target.value)}
              className={CHAMP}
            />
          </div>
        </div>
      </div>

      {/* Tableau du journal d'audit */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date &amp; Heure</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Entité</th>
              <th className="px-5 py-3 font-medium">Auteur</th>
              <th className="px-5 py-3 font-medium">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrees.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  Aucune entrée ne correspond aux filtres appliqués.
                </td>
              </tr>
            ) : (
              filtrees.map((entree) => {
                const date = new Date(entree.createdAt);
                const badge = badgePourAction(entree.action);
                return (
                  <tr key={entree.id} className="transition-colors hover:bg-muted/50">
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {date.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                      {" "}
                      {date.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${CLASSES_BADGE[badge.variant]}`}
                      >
                        <badge.icon className="h-3 w-3" aria-hidden />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-foreground">{entree.entite}</td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      {entree.auteurNom}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{entree.details}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
