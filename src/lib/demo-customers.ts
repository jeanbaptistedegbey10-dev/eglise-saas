// ---------------------------------------------------------------------------
// Données de démonstration haute-fidélité — Église SaaS
// Encodage UTF-8. Ces constantes alimentent `injecterDonneesDemo()`
// dans src/actions/demo-data.ts.
// ---------------------------------------------------------------------------

export type RoleDemo = "ADMINISTRATEUR" | "PASTEUR" | "TRESORIER" | "SECRETARIAT" | "MEMBRE_CONSULTATION";

export type UtilisateurDemo = {
  nomComplet: string;
  email: string;
  role: RoleDemo;
  telephone: string;
};

export type MembreDemo = {
  nom: string;
  prenoms: string;
  sexe: "H" | "F";
  telephone: string;
  email: string;
  adresse: string;
  profession: string;
  dateNaissance: string; // ISO AAAA-MM-JJ
  etatCivil: string; // Célibataire | Marié(e) | Veuf / Veuve | Divorcé(e)
  fonctions: string[]; // rôles ecclésiastiques
  departement: "Louange" | "Média" | "Intercession";
  groupeMaison: string;
  classificationSociale?: string;
};

export type CaisseDemo = {
  nom: string;
  code: string;
  description: string;
  soldeInitial: number;
  estParDefaut: boolean;
};

export type ExerciceDemo = {
  annee: number;
  libelle: string;
  cloture: boolean;
};

export type DonDemo = {
  montant: number;
  date: string; // ISO
  motif: string;
  caisse: "Caisse Équipement/Projets";
};

export type CulteDemo = {
  date: string; // ISO
  intitule: string;
  totalQueteAnonyme: number;
  presente: number;
};

export type BienPatrimoineDemo = {
  designation: string;
  categorie: "SONORISATION" | "INSTRUMENT" | "MOBILIER" | "INFORMATIQUE" | "IMMOBILIER" | "AUTRE";
  quantite: number;
  etat: "NEUF" | "BON_ETAT" | "USAGE" | "EN_PANNE" | "HORS_SERVICE";
  valeurEstimee: number | null;
  dateAcquisition: string | null; // ISO
  lieuStockage: string | null;
  remarques: string | null;
};

export type AideDemo = {
  beneficiaireIndex: number; // index dans EXEMPLE_MEMBRES
  montantOuNature: string;
  motif: string;
  date: string; // ISO
  notesConflictuelles: string | null;
};

export type DepenseDemo = {
  date: string; // ISO AAAA-MM-JJ
  libelle: string;
  motif: string;
  montant: number;
  caisse: string; // nom d'une caisse EXEMPLE_CAISSES
};

// ---------------------------------------------------------------------------
// 5 COMPTES D'ACCÈS (5 RÔLES)
// ---------------------------------------------------------------------------

export const EXEMPLE_UTILISATEURS: UtilisateurDemo[] = [
  {
    nomComplet: "Komla Mensa",
    email: "komla.mensa@eglise-demo.tg",
    role: "ADMINISTRATEUR",
    telephone: "+228 90 12 34 56",
  },
  {
    nomComplet: "Pasteur Komlan Lawson",
    email: "pasteur@eglise-demo.tg",
    role: "PASTEUR",
    telephone: "+228 70 00 00 01",
  },
  {
    nomComplet: "Trésorier Afi Adjavon",
    email: "tresorier@eglise-demo.tg",
    role: "TRESORIER",
    telephone: "+228 71 00 00 02",
  },
  {
    nomComplet: "Secrétaire Kossiwa Akakpo",
    email: "secretaire@eglise-demo.tg",
    role: "SECRETARIAT",
    telephone: "+228 72 00 00 03",
  },
  {
    nomComplet: "Membre Kodjo Koffi",
    email: "membre@eglise-demo.tg",
    role: "MEMBRE_CONSULTATION",
    telephone: "+228 77 00 00 04",
  },
];

// ---------------------------------------------------------------------------
// DÉPARTEMENTS ET GROUPES DE MAISON
// ---------------------------------------------------------------------------

export const EXEMPLE_DEPARTEMENTS = [
  {
    nom: "Louange",
    description: "Équipe de louange et d'adoration (chant, musiciens, chorale).",
    responsableIndex: 0, // Kossiwa Mensa
  },
  {
    nom: "Média",
    description: "Sonorisation, vidéoprojection, informatique et communication.",
    responsableIndex: 1, // Komlan Lawson
  },
  {
    nom: "Intercession",
    description: "Équipe de prière et d'intercession pour les besoins de l'église.",
    responsableIndex: 3, // Afi Akakpo
  },
] as const;

export const EXEMPLE_GROUPES = [
  { nom: "Groupe Béthel", departement: "Intercession", responsableIndex: 3 },
  { nom: "Groupe Shalom", departement: "Louange", responsableIndex: 0 },
  { nom: "Groupe Victoire", departement: "Média", responsableIndex: 1 },
  { nom: "Groupe Espoir", departement: "Intercession", responsableIndex: 9 },
  { nom: "Groupe Grâce", departement: "Louange", responsableIndex: 13 },
] as const;

export const EXEMPLE_MEMBRES: MembreDemo[] = [
  {
    nom: "Mensa",
    prenoms: "Kossiwa",
    sexe: "F",
    telephone: "+228 90 10 01 01",
    email: "kossiwa.mensa@eglise-demo.tg",
    adresse: "Tokoin, Lomé",
    profession: "Enseignante",
    dateNaissance: "1988-04-12",
    etatCivil: "Marié(e)",
    fonctions: ["Diaconesse", "Choriste", "Responsable Louange"],
    departement: "Louange",
    groupeMaison: "Groupe Shalom",
    classificationSociale: "Moyenne",
  },
  {
    nom: "Lawson",
    prenoms: "Komlan",
    sexe: "H",
    telephone: "+228 70 10 01 02",
    email: "komlan.lawson@eglise-demo.tg",
    adresse: "Bè, Lomé",
    profession: "Comptable",
    dateNaissance: "1982-09-03",
    etatCivil: "Marié(e)",
    fonctions: ["Diacre", "Responsable Média"],
    departement: "Média",
    groupeMaison: "Groupe Victoire",
    classificationSociale: "Aisée",
  },
  {
    nom: "Adjavon",
    prenoms: "Kossi",
    sexe: "H",
    telephone: "+228 91 10 01 03",
    email: "kossi.adjavon@eglise-demo.tg",
    adresse: "Kara, centre",
    profession: "Agriculteur",
    dateNaissance: "2011-02-14",
    etatCivil: "Célibataire",
    fonctions: ["Choriste"],
    departement: "Louange",
    groupeMaison: "Groupe Espoir",
    classificationSociale: "Jeune",
  },
  {
    nom: "Akakpo",
    prenoms: "Afi",
    sexe: "F",
    telephone: "+228 71 10 01 04",
    email: "afi.akakpo@eglise-demo.tg",
    adresse: "Hédzranawoé, Lomé",
    profession: "Infirmière",
    dateNaissance: "1990-06-22",
    etatCivil: "Célibataire",
    fonctions: ["Diaconesse", "Responsable Intercession"],
    departement: "Intercession",
    groupeMaison: "Groupe Béthel",
    classificationSociale: "Moyenne",
  },
  {
    nom: "Kodjo",
    prenoms: "Esso",
    sexe: "H",
    telephone: "+228 77 10 01 05",
    email: "esso.kodjo@eglise-demo.tg",
    adresse: "Sokodé, Komah",
    profession: "Pêcheur",
    dateNaissance: "1985-01-08",
    etatCivil: "Marié(e)",
    fonctions: ["Diacre", "Prédicateur"],
    departement: "Média",
    groupeMaison: "Groupe Victoire",
    classificationSociale: "Modeste",
  },
  {
    nom: "Agbenya",
    prenoms: "Sena",
    sexe: "F",
    telephone: "+228 96 10 01 06",
    email: "sena.agbenya@eglise-demo.tg",
    adresse: "Agoè, Lomé",
    profession: "Couturière",
    dateNaissance: "2014-07-30",
    etatCivil: "Célibataire",
    fonctions: ["Choriste"],
    departement: "Louange",
    groupeMaison: "Groupe Grâce",
    classificationSociale: "Jeune",
  },
  {
    nom: "Koffi",
    prenoms: "Yao",
    sexe: "H",
    telephone: "+228 78 10 01 07",
    email: "yao.koffi@eglise-demo.tg",
    adresse: "Kpalimé, centre-ville",
    profession: "Mécanicien",
    dateNaissance: "1978-11-15",
    etatCivil: "Marié(e)",
    fonctions: ["Diacre", "Responsable sécurité"],
    departement: "Intercession",
    groupeMaison: "Groupe Béthel",
    classificationSociale: "Moyenne",
  },
  {
    nom: "Mensah",
    prenoms: "Akissi",
    sexe: "F",
    telephone: "+228 79 10 01 08",
    email: "akissi.mensah@eglise-demo.tg",
    adresse: "Nyékonakpoè, Lomé",
    profession: "Vendeuse",
    dateNaissance: "1995-03-03",
    etatCivil: "Célibataire",
    fonctions: ["Diaconesse"],
    departement: "Média",
    groupeMaison: "Groupe Shalom",
    classificationSociale: "Moyenne",
  },
  {
    nom: "Djidého",
    prenoms: "Ibrahim",
    sexe: "H",
    telephone: "+228 90 10 01 09",
    email: "ibrahim.djideho@eglise-demo.tg",
    adresse: "Kodjoviakopé, Lomé",
    profession: "Chauffeur",
    dateNaissance: "1980-09-12",
    etatCivil: "Marié(e)",
    fonctions: ["Diacre"],
    departement: "Média",
    groupeMaison: "Groupe Victoire",
    classificationSociale: "Aisée",
  },
  {
    nom: "Lawson",
    prenoms: "Simone",
    sexe: "F",
    telephone: "+228 70 10 01 10",
    email: "simone.lawson@eglise-demo.tg",
    adresse: "Agoè Nyivé, Lomé",
    profession: "Secrétaire",
    dateNaissance: "1987-05-19",
    etatCivil: "Marié(e)",
    fonctions: ["Secrétaire d'église"],
    departement: "Intercession",
    groupeMaison: "Groupe Espoir",
    classificationSociale: "Moyenne",
  },
  {
    nom: "Kokou",
    prenoms: "Jean",
    sexe: "H",
    telephone: "+228 91 10 01 11",
    email: "jean.kokou@eglise-demo.tg",
    adresse: "Tokoin, Lomé",
    profession: "Ingénieur",
    dateNaissance: "2000-12-01",
    etatCivil: "Célibataire",
    fonctions: ["Diacre"],
    departement: "Média",
    groupeMaison: "Groupe Victoire",
    classificationSociale: "Aisée",
  },
  {
    nom: "Mensah",
    prenoms: "Esther",
    sexe: "F",
    telephone: "+228 71 10 01 12",
    email: "esther.mensah@eglise-demo.tg",
    adresse: "Baguida, Lomé",
    profession: "Sage-femme",
    dateNaissance: "2010-08-08",
    etatCivil: "Célibataire",
    fonctions: ["Diaconesse", "Choriste"],
    departement: "Louange",
    groupeMaison: "Groupe Shalom",
    classificationSociale: "Jeune",
  },
  {
    nom: "Awouto",
    prenoms: "Laurent",
    sexe: "H",
    telephone: "+228 77 10 01 13",
    email: "laurent.awouto@eglise-demo.tg",
    adresse: "Agbalépédogan, Lomé",
    profession: "Retraité",
    dateNaissance: "1950-01-20",
    etatCivil: "Veuf / Veuve",
    fonctions: ["Ancien", "Prédicateur"],
    departement: "Intercession",
    groupeMaison: "Groupe Béthel",
    classificationSociale: "Modeste",
  },
  {
    nom: "Kpoti",
    prenoms: "Aya",
    sexe: "F",
    telephone: "+228 78 10 01 14",
    email: "aya.kpoti@eglise-demo.tg",
    adresse: "Kpalimé, centre",
    profession: "Étudiante",
    dateNaissance: "2012-04-25",
    etatCivil: "Célibataire",
    fonctions: ["Choriste"],
    departement: "Louange",
    groupeMaison: "Groupe Grâce",
    classificationSociale: "Jeune",
  },
  {
    nom: "Djidého",
    prenoms: "Fatou",
    sexe: "F",
    telephone: "+228 79 10 01 15",
    email: "fatou.djideho@eglise-demo.tg",
    adresse: "Hédzranawoé, Lomé",
    profession: "Coiffeuse",
    dateNaissance: "1998-10-10",
    etatCivil: "Célibataire",
    fonctions: ["Diaconesse"],
    departement: "Média",
    groupeMaison: "Groupe Victoire",
    classificationSociale: "Moyenne",
  },
  {
    nom: "Ayayi",
    prenoms: "Ousmane",
    sexe: "H",
    telephone: "+228 90 10 01 16",
    email: "ousmane.ayayi@eglise-demo.tg",
    adresse: "Agoè, Lomé",
    profession: "Commerçant",
    dateNaissance: "1983-07-07",
    etatCivil: "Marié(e)",
    fonctions: ["Diacre"],
    departement: "Intercession",
    groupeMaison: "Groupe Espoir",
    classificationSociale: "Aisée",
  },
  {
    nom: "Kpodo",
    prenoms: "Ange",
    sexe: "H",
    telephone: "+228 70 10 01 17",
    email: "ange.kpodo@eglise-demo.tg",
    adresse: "Aného, centre",
    profession: "Menuisier",
    dateNaissance: "1979-12-12",
    etatCivil: "Marié(e)",
    fonctions: ["Diacre", "Responsable média"],
    departement: "Média",
    groupeMaison: "Groupe Victoire",
    classificationSociale: "Moyenne",
  },
  {
    nom: "Akakpo",
    prenoms: "Marie",
    sexe: "F",
    telephone: "+228 71 10 01 18",
    email: "marie.akakpo@eglise-demo.tg",
    adresse: "Tsévié, centre",
    profession: "Comptable",
    dateNaissance: "1991-02-28",
    etatCivil: "Marié(e)",
    fonctions: ["Secrétaire", "Trésorière"],
    departement: "Intercession",
    groupeMaison: "Groupe Béthel",
    classificationSociale: "Moyenne",
  },
  {
    nom: "Lawson",
    prenoms: "Sory",
    sexe: "H",
    telephone: "+228 72 10 01 19",
    email: "sory.lawson@eglise-demo.tg",
    adresse: "Atakpamé, centre",
    profession: "Enseignant",
    dateNaissance: "2016-09-09",
    etatCivil: "Célibataire",
    fonctions: ["Choriste"],
    departement: "Louange",
    groupeMaison: "Groupe Shalom",
    classificationSociale: "Enfant",
  },
  {
    nom: "Kodjo",
    prenoms: "Lucie",
    sexe: "F",
    telephone: "+228 77 10 01 20",
    email: "lucie.kodjo@eglise-demo.tg",
    adresse: "Sokodé, centre",
    profession: "Infirmière",
    dateNaissance: "1989-06-06",
    etatCivil: "Célibataire",
    fonctions: ["Diaconesse"],
    departement: "Média",
    groupeMaison: "Groupe Espoir",
    classificationSociale: "Moyenne",
  },
];

export const EXEMPLE_CAISSES: CaisseDemo[] = [
  {
    nom: "Caisse Principale",
    code: "CAISSE_PRINCIPALE",
    description: "Fonctionnement courant de l'église (factures, charges, achats divers).",
    soldeInitial: 2500000,
    estParDefaut: true,
  },
  {
    nom: "Compte Bancaire",
    code: "COMPTE_BANCAIRE",
    description: "Compte en banque de l'église (épargne et gros mouvements).",
    soldeInitial: 5000000,
    estParDefaut: false,
  },
  {
    nom: "Caisse Secours/Solidarité",
    code: "CAISSE_SECURITE",
    description: "Secours diaconal, aides sociales et soutiens aux membres nécessiteux.",
    soldeInitial: 750000,
    estParDefaut: false,
  },
  {
    nom: "Caisse Équipement/Projets",
    code: "CAISSE_EQUIPEMENT",
    description: "Projets d'équipement de l'église (sonorisation, vidéoprojecteur, matériel).",
    soldeInitial: 1200000,
    estParDefaut: false,
  },
];

export const EXEMPLE_EXERCICES: ExerciceDemo[] = [
  { annee: 2025, libelle: "Exercice 2025", cloture: true },
  { annee: 2026, libelle: "Exercice 2026", cloture: false },
];

export const EXEMPLE_COTISATION = {
  nom: "Cotisation récurrente 2026",
  description: "Cotisation annuelle des membres pour l'exercice 2026.",
  frequence: "MENSUEL",
  type: "RECURRENTE_CLASSE",
  montantPlancher: 10000,
};

export const EXEMPLE_BAREMES = [
  { cible: "ADULTE", montant: 10000 },
  { cible: "JEUNE", montant: 5000 },
  { cible: "ENFANT", montant: 2500 },
];

export const EXEMPLE_STATUT_VERSEMENT = {
  aJour: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  partiel: [10, 11, 12, 13, 14],
  enRetard: [15, 16, 17, 18, 19],
};

export const MODES_PAIEMENT = ["ESPECES", "MOBILE_MONEY", "VIREMENT", "CHEQUE", "CARTE_BANCAIRE"];

export const EXEMPLE_DONS: DonDemo[] = [
  {
    montant: 150000,
    date: "2026-08-15",
    motif: "Don libre — Achat équipement sonorisation (mixeur son).",
    caisse: "Caisse Équipement/Projets",
  },
  {
    montant: 200000,
    date: "2026-09-05",
    motif: "Don libre — Achat vidéoprojecteur pour le temple.",
    caisse: "Caisse Équipement/Projets",
  },
  {
    montant: 100000,
    date: "2026-09-20",
    motif: "Don libre — Câblage et installation sono/vidéo.",
    caisse: "Caisse Équipement/Projets",
  },
];

export const EXEMPLE_CULTES: CulteDemo[] = [
  { date: "2026-09-06", intitule: "Culte du dimanche — Rentrée", totalQueteAnonyme: 62000, presente: 145 },
  { date: "2026-09-13", intitule: "Culte du dimanche — Famille", totalQueteAnonyme: 54000, presente: 132 },
  { date: "2026-09-20", intitule: "Culte du dimanche — Jeunesse", totalQueteAnonyme: 47000, presente: 128 },
  { date: "2026-09-27", intitule: "Culte du dimanche — Mission", totalQueteAnonyme: 58000, presente: 140 },
  { date: "2026-10-04", intitule: "Culte du dimanche — Action de grâce", totalQueteAnonyme: 71000, presente: 152 },
  { date: "2026-10-11", intitule: "Culte du dimanche — Témoignage", totalQueteAnonyme: 53000, presente: 137 },
  { date: "2026-10-18", intitule: "Culte du dimanche — En cours", totalQueteAnonyme: 49000, presente: 130 },
];

export const EXEMPLE_PATRIMOINE: BienPatrimoineDemo[] = [
  {
    designation: "Mixeur sonorisation 16 voies",
    categorie: "SONORISATION",
    quantite: 1,
    etat: "BON_ETAT",
    valeurEstimee: 350000,
    dateAcquisition: "2024-03-10",
    lieuStockage: "Salle de contrôle (régie son)",
    remarques: "Acheté neuf, utilisé pour tous les cultes.",
  },
  {
    designation: "Enceintes de sono (paire)",
    categorie: "SONORISATION",
    quantite: 4,
    etat: "BON_ETAT",
    valeurEstimee: 120000,
    dateAcquisition: "2024-03-10",
    lieuStockage: "Temple principal",
    remarques: "Quatre enceintes réparties dans le temple.",
  },
  {
    designation: "Vidéoprojecteur Full HD",
    categorie: "INFORMATIQUE",
    quantite: 1,
    etat: "NEUF",
    valeurEstimee: 450000,
    dateAcquisition: "2025-11-01",
    lieuStockage: "Salle de contrôle / Temple",
    remarques: "Projet équipement sonorisation et vidéoprojecteur.",
  },
  {
    designation: "Chaises de culte",
    categorie: "MOBILIER",
    quantite: 200,
    etat: "USAGE",
    valeurEstimee: 5000,
    dateAcquisition: "2023-06-15",
    lieuStockage: "Temple principal",
    remarques: "Parc de chaises pour l'assemblée.",
  },
  {
    designation: "Clavier électronique",
    categorie: "INSTRUMENT",
    quantite: 2,
    etat: "BON_ETAT",
    valeurEstimee: 200000,
    dateAcquisition: "2024-09-05",
    lieuStockage: "Scène / podium louange",
    remarques: "Instruments de l'équipe de louange.",
  },
];

export const EXEMPLE_AIDES: AideDemo[] = [
  {
    beneficiaireIndex: 18,
    montantOuNature: "80 000 FCFA",
    motif: "Aide alimentaire et soins — famille en difficulté.",
    date: "2026-08-22",
    notesConflictuelles: null,
  },
  {
    beneficiaireIndex: 4,
    montantOuNature: "120 000 FCFA",
    motif: "Aide médicale — frais d'hospitalisation partiels.",
    date: "2026-09-03",
    notesConflictuelles: null,
  },
  {
    beneficiaireIndex: 12,
    montantOuNature: "60 000 FCFA + denrées",
    motif: "Secours diaconal — loyer et denrées alimentaires.",
    date: "2026-09-14",
    notesConflictuelles: null,
  },
  {
    beneficiaireIndex: 5,
    montantOuNature: "40 000 FCFA",
    motif: "Aide scolaire — fournitures et frais de scolarité.",
    date: "2026-09-28",
    notesConflictuelles: "En attente de justificatif scolaire.",
  },
  {
    beneficiaireIndex: 1,
    montantOuNature: "150 000 FCFA",
    motif: "Aide d'urgence — réparation véhicule de travail.",
    date: "2026-10-02",
    notesConflictuelles: null,
  },
];

// Dépenses de démonstration — aucune n'est injectée pour l'instant ; le tableau
// est réservé pour compléter l'agrégat EXEMPLE_DONNEES sans source manquante.
export const EXEMPLE_DEPENSES: DepenseDemo[] = [];

// Ensemble agrégé : regroupe TOUTES les constantes de démonstration.
export const EXEMPLE_DONNEES = {
  EXEMPLE_MEMBRES,
  EXEMPLE_UTILISATEURS,
  EXEMPLE_EXERCICES,
  EXEMPLE_CAISSES,
  EXEMPLE_COTISATIONS: EXEMPLE_COTISATION,
  EXEMPLE_AIDES,
  EXEMPLE_DEPENSES,
  EXEMPLE_CULTES,
  EXEMPLE_PATRIMOINE,
};
