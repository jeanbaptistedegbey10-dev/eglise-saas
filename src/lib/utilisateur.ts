/**
 * Rôles, libellés et matrice des droits — partagés par les Server Actions
 * (traces d'audit) et l'interface d'administration.
 *
 * `ROLES_UTILISATEUR` reprend exactement les valeurs de l'enum Prisma
 * `RoleUtilisateur` : l'union littérale qui en découle est structurellement
 * assignable au type d'enum généré, sans import du client régénéré.
 */
export const ROLES_UTILISATEUR = [
  "ADMINISTRATEUR",
  "PASTEUR",
  "TRESORIER",
  "SECRETARIAT",
  "MEMBRE_CONSULTATION",
] as const;

/** Valeur littérale d'un rôle utilisateur. */
export type RoleUtilisateurValeur = (typeof ROLES_UTILISATEUR)[number];

/** Libellé français affiché pour chaque rôle. */
export const LIBELLES_ROLE: Record<RoleUtilisateurValeur, string> = {
  ADMINISTRATEUR: "Administrateur",
  PASTEUR: "Pasteur",
  TRESORIER: "Trésorier",
  SECRETARIAT: "Secrétariat",
  MEMBRE_CONSULTATION: "Membre (consultation)",
};

/** Badge coloré (classes Tailwind) associé à chaque rôle. */
export const BADGES_ROLE: Record<RoleUtilisateurValeur, string> = {
  ADMINISTRATEUR:
    "border-violet-500/50 bg-violet-500/15 text-violet-600 dark:text-violet-300",
  PASTEUR:
    "border-indigo-500/50 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  TRESORIER:
    "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  SECRETARIAT:
    "border-blue-500/50 bg-blue-500/15 text-blue-600 dark:text-blue-300",
  MEMBRE_CONSULTATION:
    "border-slate-500/50 bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

/** Entrée de la matrice explicative des droits par rôle. */
export type DroitsRole = {
  role: RoleUtilisateurValeur;
  /** Résumé en une phrase des prérogatives du rôle. */
  resume: string;
  /** Modules et actions ouverts au rôle. */
  acces: string[];
  /** Limites explicites (le cas échéant). */
  restrictions?: string[];
};

/** Matrice synthétique des droits — carte affichée sous la liste des comptes. */
export const MATRICE_DROITS: DroitsRole[] = [
  {
    role: "ADMINISTRATEUR",
    resume: "Accès global et configuration.",
    acces: [
      "Tous les modules : communauté, finances, cultes, solidarité, rapports",
      "Création, rôles et activation / suspension des comptes",
      "Configuration, exercices et barèmes",
      "Consultation du journal d'audit",
    ],
  },
  {
    role: "TRESORIER",
    resume:
      "Gestion des cotisations, caisses, versements, dépenses et rapports financiers.",
    acces: [
      "Cotisations, barèmes et versements",
      "Caisses, virements et encaissements",
      "Dépenses et décaissements",
      "Rapports et bilans financiers",
    ],
  },
  {
    role: "PASTEUR",
    resume: "Suivi pastoral, aides & solidarité, communauté et cultes.",
    acces: [
      "Registre pastoral et suivi des familles",
      "Aides & solidarité",
      "Communauté (membres, départements, groupes)",
      "Cultes & événements",
    ],
  },
  {
    role: "SECRETARIAT",
    resume:
      "Saisie des membres, groupes et événements (sans accès aux décaissements).",
    acces: [
      "Saisie et mise à jour des fiches membres",
      "Groupes, départements et événements",
      "Consultation de l'organisation et des cultes",
    ],
    restrictions: ["Aucun accès aux décaissements, virements ni dépenses"],
  },
  {
    role: "MEMBRE_CONSULTATION",
    resume: "Consultation simple des espaces autorisés, sans droit de saisie.",
    acces: ["Lecture seule des tableaux de bord partagés"],
    restrictions: ["Aucune création, modification ni décaissement"],
  },
];
