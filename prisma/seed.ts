import { PrismaClient, Prisma, RoleUtilisateur, ModePaiement, TypeDepense, CategorieCaisse, TypeMouvementCaisse, StatutTache, CategoriePatrimoine, EtatBien, FrequenceCotisation, TypeCotisation, CibleCotisation, CategorieCotisationEnum, RoleOrganisation } from '../src/generated/prisma';
import { randomBytes, scrypt } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(motDePasse: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sel = randomBytes(16);
    scrypt(motDePasse, sel, 64, (erreur, empreinte) => {
      if (erreur) { reject(erreur); return; }
      resolve(`scrypt$${sel.toString("hex")}$${empreinte.toString("hex")}`);
    });
  });
}

async function main() {
  const adminPasswordHash = await hashPassword("AdminEIMC2026!");
  const adminPrincipalPasswordHash = await hashPassword("AdminEIMC2026!");

  await prisma.$transaction(async (tx) => {
    // =========================================================================
    // 1. NETTOYAGE PRÉALABLE — ordre sécurisé (enfants d'abord, puis parents)
    // =========================================================================
    await tx.paiement.deleteMany();
    await tx.versementCotisation.deleteMany();
    await tx.depense.deleteMany();
    await tx.mouvementCaisse.deleteMany();
    await tx.tacheEvenement.deleteMany();
    await tx.culte.deleteMany();
    await tx.departementMembre.deleteMany();
    await tx.groupeMembre.deleteMany();
    await tx.aideDistribution.deleteMany();
    await tx.baremeCotisation.deleteMany();
    await tx.paliereBareme.deleteMany();
    await tx.cotisation.deleteMany();
    await tx.categorieCotisation.deleteMany();
    await tx.groupe.deleteMany();
    await tx.departement.deleteMany();
    await tx.membre.deleteMany();
    await tx.caisse.deleteMany();
    await tx.exercice.deleteMany();
    await tx.typeTache.deleteMany();
    await tx.bienPatrimoine.deleteMany();
    await tx.journalAudit.deleteMany();
    await tx.utilisateur.deleteMany();
    // =========================================================================
    // 2. DONNÉES DE DÉMONSTRATION — contexte togolais & réaliste
    // =========================================================================

    // -------------------------------------------------------------------------
    // Utilisateur Admin (démo)
    // -------------------------------------------------------------------------
    const admin = await tx.utilisateur.create({
      data: {
        nomComplet: "Admin EIMC",
        email: "admin@eimc.tg",
        telephone: "+228 90 00 00 00",
        role: RoleUtilisateur.ADMINISTRATEUR,
        motDePasseHash: adminPasswordHash,
        motDePasseTemporaire: true,
        actif: true,
      },
    });

    // -------------------------------------------------------------------------
    // Utilisateur Administrateur Principal (compte réel)
    // -------------------------------------------------------------------------
    const adminPrincipal = await tx.utilisateur.create({
      data: {
        nomComplet: "Jean Baptiste DEGBEY",
        email: "jeanbaptistedegbey10@gmail.com",
        telephone: "+228 90 00 00 01",
        role: RoleUtilisateur.ADMINISTRATEUR,
        motDePasseHash: adminPrincipalPasswordHash,
        motDePasseTemporaire: true,
        actif: true,
      },
    });

    // -------------------------------------------------------------------------
    // Exercices Comptables
    // -------------------------------------------------------------------------
    const exercice2025 = await tx.exercice.create({
      data: {
        annee: 2025,
        libelle: "Exercice Comptable 2025",
        moisDebut: 1,
        moisFin: 12,
        cloture: true,
      },
    });

    const exercice2026 = await tx.exercice.create({
      data: {
        annee: 2026,
        libelle: "Exercice Comptable 2026 en cours",
        moisDebut: 1,
        moisFin: 12,
        cloture: false,
      },
    });

    // -------------------------------------------------------------------------
    // Caisses
    // -------------------------------------------------------------------------
    const caisseGenerale = await tx.caisse.create({
      data: {
        nom: "Caisse Générale",
        code: "CAISSE-GEN",
        description: "Caisse principale de l'église — fonds généraux",
        soldeInitial: new Prisma.Decimal("500000.00"),
        soldeActuel: new Prisma.Decimal("500000.00"),
        estParDefaut: true,
      },
    });

    const caisseSolidarite = await tx.caisse.create({
      data: {
        nom: "Caisse Solidarité",
        code: "CAISSE-SOL",
        description: "Fonds de solidarité et d'aide aux démunis",
        soldeInitial: new Prisma.Decimal("150000.00"),
        soldeActuel: new Prisma.Decimal("150000.00"),
        estParDefaut: false,
      },
    });

    const caisseTravaux = await tx.caisse.create({
      data: {
        nom: "Caisse Travaux & Projets",
        code: "CAISSE-TRV",
        description: "Fonds dédiés aux travaux et projets d'infrastructure",
        soldeInitial: new Prisma.Decimal("300000.00"),
        soldeActuel: new Prisma.Decimal("300000.00"),
        estParDefaut: false,
      },
    });
    // -------------------------------------------------------------------------
    // Membres (noms togolais, Lomé / Adidogomé / Agoè)
    // -------------------------------------------------------------------------
    const membresData = [
      { nom: "Mensah", prenoms: "Koffi", profession: "Ingénieur", telephone: "+228 90 11 22 33", email: "koffi.mensah@email.tg", adresse: "Lomé, Adidogomé" },
      { nom: "Konan", prenoms: "Akossi", profession: "Enseignante", telephone: "+228 91 22 33 44", email: "akossi.konan@email.tg", adresse: "Lomé, Agoè" },
      { nom: "Sory", prenoms: "Sékou", profession: "Commerçant", telephone: "+228 92 33 44 55", email: "sekou.sory@email.tg", adresse: "Lomé, Adidogomé" },
      { nom: "Diabaté", prenoms: "Fatoumata", profession: "Comptable", telephone: "+228 93 44 55 66", email: "fatoumata.diabate@email.tg", adresse: "Lomé, Agoè" },
      { nom: "Agbégnenou", prenoms: "Kodjo", profession: "Informaticien", telephone: "+228 94 55 66 77", email: "kodjo.agbegnenou@email.tg", adresse: "Lomé, Adidogomé" },
      { nom: "Vovor", prenoms: "Adjovi", profession: "Infirmière", telephone: "+228 95 66 77 88", email: "adjovi.vovor@email.tg", adresse: "Lomé, Agoè" },
      { nom: "Ayivi", prenoms: "Komlan", profession: "Mécanicien", telephone: "+228 96 77 88 99", email: "komlan.ayivi@email.tg", adresse: "Lomé, Bè" },
      { nom: "Djossou", prenoms: "Sèdjro", profession: "Avocat", telephone: "+228 97 88 99 00", email: "sedjro.djossou@email.tg", adresse: "Lomé, Agoè" },
      { nom: "Gnassingbé", prenoms: "Esso", profession: "Éleveur", telephone: "+228 98 99 00 11", email: "esso.gnassingbe@email.tg", adresse: "Lomé, Adidogomé" },
      { nom: "Tchala", prenoms: "Mawulé", profession: "Pharmacien", telephone: "+228 99 00 11 22", email: "mawule.tchala@email.tg", adresse: "Lomé, Agoè" },
    ];

    const membres: Record<string, any> = {};
    for (const m of membresData) {
      const created = await tx.membre.create({
        data: {
          nom: m.nom,
          prenoms: m.prenoms,
          telephone: m.telephone,
          email: m.email,
          adresse: m.adresse,
          profession: m.profession,
          donneesEcclesiastiques: {
            bapteme: true,
            dateBapteme: "2020-06-15",
            fonctions: [],
          },
        },
      });
      membres[m.prenoms.toLowerCase()] = created;
    }
    // -------------------------------------------------------------------------
    // Départements & Groupes
    // -------------------------------------------------------------------------
    const departementsData = [
      { nom: "Jeunesse", description: "Département des jeunes de l'église", responsablePrenom: "Kodjo" },
      { nom: "Louange", description: "Équipe de louange et adoration", responsablePrenom: "Akossi" },
      { nom: "Diaconat", description: "Service de diaconat et assistance aux membres", responsablePrenom: "Koffi" },
      { nom: "Administration", description: "Secrétariat et administration générale", responsablePrenom: "Fatoumata" },
    ];

    const departements: Record<string, any> = {};
    for (const d of departementsData) {
      const responsable = membres[d.responsablePrenom.toLowerCase()];
      const created = await tx.departement.create({
        data: {
          nom: d.nom,
          description: d.description,
          aUnBureau: true,
          responsableId: responsable.id,
        },
      });
      departements[d.nom.toLowerCase()] = created;
    }

    const groupesData = [
      { nom: "Chœur des Jeunes", description: "Groupe de chant des jeunes du dimanche", departement: "Jeunesse", responsablePrenom: "Kodjo", estSousGroupe: false },
      { nom: "Équipe Louange", description: "Musiciens et chanteurs de louange", departement: "Louange", responsablePrenom: "Akossi", estSousGroupe: false },
      { nom: "Diaconesse", description: "Service aux veuves, orphelins et personnes démunies", departement: "Diaconat", responsablePrenom: "Adjovi", estSousGroupe: false },
      { nom: "Secrétariat", description: "Accueil, secrétariat et correspondance", departement: "Administration", responsablePrenom: "Fatoumata", estSousGroupe: false },
    ];

    const groupes: Record<string, any> = {};
    for (const g of groupesData) {
      const departement = departements[g.departement.toLowerCase()];
      const responsable = membres[g.responsablePrenom.toLowerCase()];
      const created = await tx.groupe.create({
        data: {
          nom: g.nom,
          description: g.description,
          aUnBureau: true,
          estSousGroupe: g.estSousGroupe,
          departementId: departement.id,
          responsableId: responsable.id,
        },
      });
      groupes[g.nom.toLowerCase()] = created;
    }

    const departementMembreLinks = [
      { departement: "Jeunesse", membrePrenom: "Kodjo", role: RoleOrganisation.RESPONSABLE },
      { departement: "Jeunesse", membrePrenom: "Sékou", role: RoleOrganisation.MEMBRE },
      { departement: "Jeunesse", membrePrenom: "Komlan", role: RoleOrganisation.MEMBRE },
      { departement: "Louange", membrePrenom: "Akossi", role: RoleOrganisation.RESPONSABLE },
      { departement: "Louange", membrePrenom: "Adjovi", role: RoleOrganisation.MEMBRE },
      { departement: "Diaconat", membrePrenom: "Koffi", role: RoleOrganisation.RESPONSABLE },
      { departement: "Diaconat", membrePrenom: "Sèdjro", role: RoleOrganisation.MEMBRE },
      { departement: "Administration", membrePrenom: "Fatoumata", role: RoleOrganisation.RESPONSABLE },
      { departement: "Administration", membrePrenom: "Mawulé", role: RoleOrganisation.MEMBRE },
      { departement: "Administration", membrePrenom: "Esso", role: RoleOrganisation.MEMBRE },
    ];
    for (const link of departementMembreLinks) {
      await tx.departementMembre.create({
        data: {
          departementId: departements[link.departement].id,
          membreId: membres[link.membrePrenom.toLowerCase()].id,
          role: link.role,
        },
      });
    }

    const groupeMembreLinks = [
      { groupe: "Chœur des Jeunes", membrePrenom: "Kodjo", role: RoleOrganisation.RESPONSABLE },
      { groupe: "Chœur des Jeunes", membrePrenom: "Sékou", role: RoleOrganisation.MEMBRE },
      { groupe: "Chœur des Jeunes", membrePrenom: "Komlan", role: RoleOrganisation.MEMBRE },
      { groupe: "Équipe Louange", membrePrenom: "Akossi", role: RoleOrganisation.RESPONSABLE },
      { groupe: "Équipe Louange", membrePrenom: "Adjovi", role: RoleOrganisation.MEMBRE },
      { groupe: "Diaconesse", membrePrenom: "Adjovi", role: RoleOrganisation.RESPONSABLE },
      { groupe: "Diaconesse", membrePrenom: "Sèdjro", role: RoleOrganisation.MEMBRE },
      { groupe: "Secrétariat", membrePrenom: "Fatoumata", role: RoleOrganisation.RESPONSABLE },
      { groupe: "Secrétariat", membrePrenom: "Mawulé", role: RoleOrganisation.MEMBRE },
      { groupe: "Secrétariat", membrePrenom: "Esso", role: RoleOrganisation.MEMBRE },
    ];
    for (const link of groupeMembreLinks) {
      await tx.groupeMembre.create({
        data: {
          groupeId: groupes[link.groupe.toLowerCase()].id,
          membreId: membres[link.membrePrenom.toLowerCase()].id,
          role: link.role,
        },
      });
    }
    // -------------------------------------------------------------------------
    // Catégories de cotisations
    // -------------------------------------------------------------------------
    const categorieDimmes = await tx.categorieCotisation.create({
      data: {
        libelle: "Dîmes",
        description: "Dîmes mensuelles — 10 % des revenus",
        type: CategorieCotisationEnum.OBLIGATOIRE_BAREME,
      },
    });
    const categorieOffrandes = await tx.categorieCotisation.create({
      data: {
        libelle: "Offrandes spéciales",
        description: "Offrandes spéciales pour événements et projets",
        type: CategorieCotisationEnum.VOLONTAIRE_CAMPAGNE,
      },
    });
    const categorieConstruction = await tx.categorieCotisation.create({
      data: {
        libelle: "Cotisation de construction",
        description: "Fonds dédiés à la construction du temple",
        type: CategorieCotisationEnum.VOLONTAIRE_CAMPAGNE,
      },
    });
    const categorieQuetes = await tx.categorieCotisation.create({
      data: {
        libelle: "Quêtes",
        description: "Quêtes anonymes lors des cultes",
        type: CategorieCotisationEnum.QUETE_ANONYME,
      },
    });

    // -------------------------------------------------------------------------
    // Cotisations (liées aux exercices)
    // -------------------------------------------------------------------------
    const cotisationDimmes2025 = await tx.cotisation.create({
      data: {
        exerciceId: exercice2025.id,
        nom: "Dîmes 2025",
        description: "Dîmes mensuelles des membres pour l'exercice 2025",
        frequence: FrequenceCotisation.MENSUEL,
        type: TypeCotisation.RECURRENTE_CLASSE,
        dateDebut: new Date("2025-01-01"),
        dateFin: new Date("2025-12-31"),
        estCloture: true,
        montantPlancher: new Prisma.Decimal("5000.00"),
        autoriserSurplus: true,
      },
    });
    const cotisationDimmes2026 = await tx.cotisation.create({
      data: {
        exerciceId: exercice2026.id,
        nom: "Dîmes 2026",
        description: "Dîmes mensuelles des membres pour l'exercice 2026",
        frequence: FrequenceCotisation.MENSUEL,
        type: TypeCotisation.RECURRENTE_CLASSE,
        dateDebut: new Date("2026-01-01"),
        dateFin: new Date("2026-12-31"),
        estCloture: false,
        montantPlancher: new Prisma.Decimal("5000.00"),
        autoriserSurplus: true,
      },
    });
    const cotisationConstruction = await tx.cotisation.create({
      data: {
        exerciceId: exercice2026.id,
        nom: "Construction Temple 2026",
        description: "Cotisation spéciale pour la construction du nouveau temple",
        frequence: FrequenceCotisation.TRIMESTRIEL,
        type: TypeCotisation.PONCTUELLE_EVENEMENT,
        dateDebut: new Date("2026-01-01"),
        dateFin: new Date("2026-12-31"),
        estCloture: false,
        montantPlancher: new Prisma.Decimal("10000.00"),
        autoriserSurplus: true,
        montantCible: new Prisma.Decimal("5000000.00"),
      },
    });
    const cotisationQuetes = await tx.cotisation.create({
      data: {
        exerciceId: exercice2026.id,
        nom: "Quêtes du Dimanche 2026",
        description: "Quêtes collectées lors des cultes dominicaux",
        frequence: FrequenceCotisation.HEBDOMADAIRE,
        type: TypeCotisation.QUETE_CULTE,
        dateDebut: new Date("2026-01-01"),
        dateFin: new Date("2026-12-31"),
        estCloture: false,
        montantPlancher: undefined,
        autoriserSurplus: true,
      },
    });
    // -------------------------------------------------------------------------
    // Paliers & barèmes de cotisation (2025 et 2026)
    // -------------------------------------------------------------------------
    await tx.paliereBareme.create({
      data: {
        typeCotisationId: categorieDimmes.id,
        libelleClasse: "Adultes",
        montant: new Prisma.Decimal("10000.00"),
        exerciceId: exercice2025.id,
      },
    });
    await tx.paliereBareme.create({
      data: {
        typeCotisationId: categorieDimmes.id,
        libelleClasse: "Jeunes",
        montant: new Prisma.Decimal("5000.00"),
        exerciceId: exercice2025.id,
      },
    });
    await tx.paliereBareme.create({
      data: {
        typeCotisationId: categorieDimmes.id,
        libelleClasse: "Adultes",
        montant: new Prisma.Decimal("10000.00"),
        exerciceId: exercice2026.id,
      },
    });
    await tx.paliereBareme.create({
      data: {
        typeCotisationId: categorieDimmes.id,
        libelleClasse: "Jeunes",
        montant: new Prisma.Decimal("5000.00"),
        exerciceId: exercice2026.id,
      },
    });
    await tx.paliereBareme.create({
      data: {
        typeCotisationId: categorieConstruction.id,
        libelleClasse: "Famille",
        montant: new Prisma.Decimal("25000.00"),
        exerciceId: exercice2026.id,
      },
    });
    await tx.paliereBareme.create({
      data: {
        typeCotisationId: categorieConstruction.id,
        libelleClasse: "Individuel",
        montant: new Prisma.Decimal("10000.00"),
        exerciceId: exercice2026.id,
      },
    });

    await tx.baremeCotisation.create({
      data: {
        cotisationId: cotisationDimmes2025.id,
        cible: CibleCotisation.ADULTE,
        montant: new Prisma.Decimal("10000.00"),
      },
    });
    await tx.baremeCotisation.create({
      data: {
        cotisationId: cotisationDimmes2025.id,
        cible: CibleCotisation.JEUNE,
        montant: new Prisma.Decimal("5000.00"),
      },
    });
    await tx.baremeCotisation.create({
      data: {
        cotisationId: cotisationDimmes2026.id,
        cible: CibleCotisation.ADULTE,
        montant: new Prisma.Decimal("10000.00"),
      },
    });
    await tx.baremeCotisation.create({
      data: {
        cotisationId: cotisationDimmes2026.id,
        cible: CibleCotisation.JEUNE,
        montant: new Prisma.Decimal("5000.00"),
      },
    });
    await tx.baremeCotisation.create({
      data: {
        cotisationId: cotisationConstruction.id,
        cible: CibleCotisation.ADULTE,
        montant: new Prisma.Decimal("25000.00"),
      },
    });
    // -------------------------------------------------------------------------
    // Aide Distribution (solidarité)
    // -------------------------------------------------------------------------
    await tx.aideDistribution.create({
      data: {
        beneficiaireMembreId: membres["sékou"].id,
        montantOuNature: "50 000 FCFA",
        motif: "Soutien médical — hospitalisation",
        dateDistribution: new Date("2025-06-10"),
        notesConflictuelles: null,
      },
    });
    await tx.aideDistribution.create({
      data: {
        beneficiaireMembreId: membres["adjovi"].id,
        montantOuNature: "Denrées alimentaires (riz, huile, maïs)",
        motif: "Aide alimentaire période de soudure",
        dateDistribution: new Date("2025-09-15"),
        notesConflictuelles: null,
      },
    });
    await tx.aideDistribution.create({
      data: {
        beneficiaireMembreId: null,
        montantOuNature: "30 000 FCFA",
        motif: "Aide d'urgence — sinistre incendie (bénéficiaire non membre)",
        dateDistribution: new Date("2026-02-05"),
        notesConflictuelles: null,
      },
    });

    // -------------------------------------------------------------------------
    // Types de tâches pour les cultes
    // -------------------------------------------------------------------------
    const typeTachePredication = await tx.typeTache.create({
      data: {
        libelle: "Prédication",
        couleur: "#dc2626",
        estParDefaut: true,
      },
    });
    const typeTacheLouange = await tx.typeTache.create({
      data: {
        libelle: "Louange",
        couleur: "#7c3aed",
        estParDefaut: true,
      },
    });
    const typeTacheAccueil = await tx.typeTache.create({
      data: {
        libelle: "Accueil",
        couleur: "#0891b2",
        estParDefaut: false,
      },
    });
    const typeTacheSonorisation = await tx.typeTache.create({
      data: {
        libelle: "Sonorisation",
        couleur: "#0f766e",
        estParDefaut: false,
      },
    });
    // -------------------------------------------------------------------------
    // Culte & Tâches associées
    // -------------------------------------------------------------------------
    const culteDimancheJeunesse = await tx.culte.create({
      data: {
        date: new Date("2026-03-15T08:30:00"),
        dateFin: new Date("2026-03-15T11:30:00"),
        heureDebut: "08:30",
        heureFin: "11:30",
        intitule: "Culte du dimanche - Jeunesse",
        lieu: "Temple principal, Adidogomé",
        description: "Culte mensuel animé par le département Jeunesse",
        theme: "La Grâce",
        descriptionTheme: "La grâce de Dieu qui transforme et restaure toute vie",
        type: "DOMINICAL",
        statut: "TERMINE",
        responsableMembreId: membres["kodjo"].id,
        totalQueteAnonyme: new Prisma.Decimal("45000.00"),
      },
    });
    const culteDimancheLouange = await tx.culte.create({
      data: {
        date: new Date("2026-03-22T08:30:00"),
        dateFin: new Date("2026-03-22T11:30:00"),
        heureDebut: "08:30",
        heureFin: "11:30",
        intitule: "Culte du dimanche - Louange",
        lieu: "Temple principal, Adidogomé",
        description: "Culte d'adoration et de louange",
        theme: "Adorez l'Éternel",
        descriptionTheme: "L'adoration en esprit et en vérité",
        type: "DOMINICAL",
        statut: "TERMINE",
        responsableMembreId: membres["akossi"].id,
        totalQueteAnonyme: new Prisma.Decimal("38000.00"),
      },
    });
    const culteProchain = await tx.culte.create({
      data: {
        date: new Date("2026-04-05T08:30:00"),
        dateFin: new Date("2026-04-05T11:30:00"),
        heureDebut: "08:30",
        heureFin: "11:30",
        intitule: "Culte de Pâques",
        lieu: "Temple principal, Adidogomé",
        description: "Célébration de la résurrection",
        theme: "Victoire sur la mort",
        descriptionTheme: "Jésus est vainqueur de la mort",
        type: "FESTE",
        statut: "PLANIFIE",
        responsableMembreId: membres["koffi"].id,
        totalQueteAnonyme: new Prisma.Decimal("0.00"),
      },
    });

    await tx.tacheEvenement.create({
      data: {
        culteId: culteDimancheJeunesse.id,
        titre: "Prédication principale",
        description: "Message sur la grâce divine",
        statut: StatutTache.CLOTUREE,
        heureDebut: "09:30",
        heureFin: "10:15",
        dateTache: new Date("2026-03-15T09:30:00"),
        responsableMembreId: membres["kodjo"].id,
        typeTacheId: typeTachePredication.id,
        membresEquipe: ["Kodjo Agbégnenou"],
      },
    });
    await tx.tacheEvenement.create({
      data: {
        culteId: culteDimancheJeunesse.id,
        titre: "Conduite de louange",
        description: "Chants d'adoration et de louange",
        statut: StatutTache.CLOTUREE,
        heureDebut: "08:45",
        heureFin: "09:30",
        dateTache: new Date("2026-03-15T08:45:00"),
        responsableMembreId: membres["akossi"].id,
        typeTacheId: typeTacheLouange.id,
        membresEquipe: ["Akossi Konan", "Adjovi Vovor"],
      },
    });
    await tx.tacheEvenement.create({
      data: {
        culteId: culteDimancheJeunesse.id,
        titre: "Accueil des fidèles",
        description: "Accueil à l'entrée du temple",
        statut: StatutTache.CLOTUREE,
        heureDebut: "08:00",
        heureFin: "08:45",
        dateTache: new Date("2026-03-15T08:00:00"),
        responsableMembreId: membres["mawulé"].id,
        typeTacheId: typeTacheAccueil.id,
        membresEquipe: ["Mawulé Tchala", "Esso Gnassingbé"],
      },
    });
    await tx.tacheEvenement.create({
      data: {
        culteId: culteDimancheJeunesse.id,
        titre: "Gestion du son",
        description: "Sonorisation et micro",
        statut: StatutTache.CLOTUREE,
        heureDebut: "08:00",
        heureFin: "11:30",
        dateTache: new Date("2026-03-15T08:00:00"),
        responsableMembreId: membres["komlan"].id,
        typeTacheId: typeTacheSonorisation.id,
        membresEquipe: ["Komlan Ayivi"],
      },
    });
    await tx.tacheEvenement.create({
      data: {
        culteId: culteProchain.id,
        titre: "Prédication de Pâques",
        description: "Message sur la résurrection",
        statut: StatutTache.A_FAIRE,
        heureDebut: "09:30",
        heureFin: "10:30",
        dateTache: new Date("2026-04-05T09:30:00"),
        responsableMembreId: membres["koffi"].id,
        typeTacheId: typeTachePredication.id,
        membresEquipe: ["Koffi Mensah"],
      },
    });
    await tx.tacheEvenement.create({
      data: {
        culteId: culteProchain.id,
        titre: "Louange de Pâques",
        description: "Chants de célébration",
        statut: StatutTache.A_FAIRE,
        heureDebut: "08:45",
        heureFin: "09:30",
        dateTache: new Date("2026-04-05T08:45:00"),
        responsableMembreId: membres["akossi"].id,
        typeTacheId: typeTacheLouange.id,
        membresEquipe: ["Akossi Konan"],
      },
    });
    // -------------------------------------------------------------------------
    // Versements de cotisations
    // -------------------------------------------------------------------------
    await tx.versementCotisation.create({
      data: {
        cotisationId: cotisationDimmes2025.id,
        membreId: membres["koffi"].id,
        montant: new Prisma.Decimal("120000.00"),
        montantBase: new Prisma.Decimal("100000.00"),
        surplusVolontaire: new Prisma.Decimal("20000.00"),
        moisCoches: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"],
        estAnonyme: false,
        dateEffective: new Date("2025-10-15"),
        dateVersement: new Date("2025-10-15"),
        modePaiement: ModePaiement.MOBILE_MONEY,
        commentaire: "Dîmes 2025 — virement Mobile Money",
      },
    });
    await tx.versementCotisation.create({
      data: {
        cotisationId: cotisationDimmes2026.id,
        membreId: membres["akossi"].id,
        montant: new Prisma.Decimal("60000.00"),
        montantBase: new Prisma.Decimal("60000.00"),
        surplusVolontaire: new Prisma.Decimal("0.00"),
        moisCoches: ["01", "02", "03"],
        estAnonyme: false,
        dateEffective: new Date("2026-03-20"),
        dateVersement: new Date("2026-03-20"),
        modePaiement: ModePaiement.ESPECES,
        commentaire: "Dîmes janvier-mars 2026 — espèces",
      },
    });
    await tx.versementCotisation.create({
      data: {
        cotisationId: cotisationConstruction.id,
        membreId: membres["sékou"].id,
        montant: new Prisma.Decimal("50000.00"),
        montantBase: new Prisma.Decimal("50000.00"),
        surplusVolontaire: new Prisma.Decimal("0.00"),
        moisCoches: ["01"],
        estAnonyme: false,
        dateEffective: new Date("2026-02-10"),
        dateVersement: new Date("2026-02-10"),
        modePaiement: ModePaiement.MOBILE_MONEY,
        commentaire: "Participation construction temple — 1er trimestre",
      },
    });

    // -------------------------------------------------------------------------
    // Paiements (quêtes anonymes et dons)
    // -------------------------------------------------------------------------
    await tx.paiement.create({
      data: {
        montant: new Prisma.Decimal("45000.00"),
        datePaiement: new Date("2026-03-15T10:30:00"),
        modePaiement: ModePaiement.ESPECES,
        membreId: null,
        typeCotisationId: categorieQuetes.id,
        exerciceId: exercice2026.id,
        commentaire: "Quête anonyme — Culte Jeunesse 15 mars 2026",
      },
    });
    await tx.paiement.create({
      data: {
        montant: new Prisma.Decimal("38000.00"),
        datePaiement: new Date("2026-03-22T10:30:00"),
        modePaiement: ModePaiement.ESPECES,
        membreId: null,
        typeCotisationId: categorieQuetes.id,
        exerciceId: exercice2026.id,
        commentaire: "Quête anonyme — Culte Louange 22 mars 2026",
      },
    });
    await tx.paiement.create({
      data: {
        montant: new Prisma.Decimal("100000.00"),
        datePaiement: new Date("2025-11-20T09:00:00"),
        modePaiement: ModePaiement.VIREMENT,
        membreId: membres["koffi"].id,
        typeCotisationId: categorieDimmes.id,
        exerciceId: exercice2025.id,
        commentaire: "Dîmes annuelles 2025 — virement bancaire",
      },
    });
    // -------------------------------------------------------------------------
    // Dépenses
    // -------------------------------------------------------------------------
    await tx.depense.create({
      data: {
        libelle: "Facture électricité — Temple",
        description: "Facture CEET du mois de mars 2026",
        montant: new Prisma.Decimal("85000.00"),
        dateDepense: new Date("2026-03-25"),
        modePaiement: ModePaiement.VIREMENT,
        numeroPiece: "CEET-2026-03-1445",
        type: TypeDepense.CAISSE_DIRECTE,
        caisseSource: CategorieCaisse.GENERALE,
        caisseId: caisseGenerale.id,
        exerciceId: exercice2026.id,
      },
    });
    await tx.depense.create({
      data: {
        libelle: "Achat chaises — Salle de réunion",
        description: "50 chaises pour la salle de réunion jeunesse",
        montant: new Prisma.Decimal("175000.00"),
        dateDepense: new Date("2026-02-10"),
        modePaiement: ModePaiement.ESPECES,
        numeroPiece: "FACT-2026-0089",
        type: TypeDepense.AFFECTEE_COTISATION,
        caisseSource: CategorieCaisse.TRAVAUX_PROJETS,
        caisseId: caisseTravaux.id,
        cotisationId: cotisationConstruction.id,
        exerciceId: exercice2026.id,
      },
    });
    await tx.depense.create({
      data: {
        libelle: "Rémunération gardien",
        description: "Salaire du gardien du temple — mars 2026",
        montant: new Prisma.Decimal("60000.00"),
        dateDepense: new Date("2026-03-31"),
        modePaiement: ModePaiement.ESPECES,
        numeroPiece: null,
        type: TypeDepense.CAISSE_DIRECTE,
        caisseSource: CategorieCaisse.GENERALE,
        caisseId: caisseGenerale.id,
        exerciceId: exercice2026.id,
      },
    });

    // -------------------------------------------------------------------------
    // Mouvements de caisse
    // -------------------------------------------------------------------------
    await tx.mouvementCaisse.create({
      data: {
        caisseId: caisseGenerale.id,
        type: TypeMouvementCaisse.TRANSFERT_COTISATION,
        montant: new Prisma.Decimal("120000.00"),
        sens: "ENTREE",
        dateMouvement: new Date("2025-10-15"),
        motif: "Transfert dîmes versées par Koffi Mensah",
        cotisationId: cotisationDimmes2025.id,
        membreId: membres["koffi"].id,
        modePaiement: ModePaiement.MOBILE_MONEY,
      },
    });
    await tx.mouvementCaisse.create({
      data: {
        caisseId: caisseGenerale.id,
        type: TypeMouvementCaisse.DON_LIBRE,
        montant: new Prisma.Decimal("45000.00"),
        sens: "ENTREE",
        dateMouvement: new Date("2026-03-15"),
        motif: "Quête anonyme — Culte Jeunesse",
        cotisationId: cotisationQuetes.id,
        modePaiement: ModePaiement.ESPECES,
      },
    });
    await tx.mouvementCaisse.create({
      data: {
        caisseId: caisseTravaux.id,
        type: TypeMouvementCaisse.TRANSFERT_COTISATION,
        montant: new Prisma.Decimal("50000.00"),
        sens: "ENTREE",
        dateMouvement: new Date("2026-02-10"),
        motif: "Participation construction — Sékou Sory",
        cotisationId: cotisationConstruction.id,
        membreId: membres["sékou"].id,
        modePaiement: ModePaiement.MOBILE_MONEY,
      },
    });
    await tx.mouvementCaisse.create({
      data: {
        caisseId: caisseGenerale.id,
        type: TypeMouvementCaisse.AJUSTEMENT,
        montant: new Prisma.Decimal("85000.00"),
        sens: "SORTIE",
        dateMouvement: new Date("2026-03-25"),
        motif: "Paiement facture électricité temple",
        cotisationId: null,
        modePaiement: ModePaiement.VIREMENT,
      },
    });
    await tx.mouvementCaisse.create({
      data: {
        caisseId: caisseSolidarite.id,
        type: TypeMouvementCaisse.DON_LIBRE,
        montant: new Prisma.Decimal("50000.00"),
        sens: "SORTIE",
        dateMouvement: new Date("2025-06-10"),
        motif: "Aide médicale — Sékou Sory",
        modePaiement: ModePaiement.ESPECES,
      },
    });
    // -------------------------------------------------------------------------
    // Biens de patrimoine
    // -------------------------------------------------------------------------
    await tx.bienPatrimoine.create({
      data: {
        designation: "Table de mixage Yamaha MG10",
        categorie: CategoriePatrimoine.SONORISATION,
        quantite: 1,
        etat: EtatBien.BON_ETAT,
        valeurEstimee: 350000,
        lieuStockage: "Temple — régie son",
        dateAcquisition: new Date("2024-11-05"),
        remarques: "Achetée neuf pour les cultes du dimanche",
      },
    });
    await tx.bienPatrimoine.create({
      data: {
        designation: "Chaises de culte (lot de 100)",
        categorie: CategoriePatrimoine.MOBILIER,
        quantite: 100,
        etat: EtatBien.BON_ETAT,
        valeurEstimee: 300000,
        lieuStockage: "Salle polyvalente",
        dateAcquisition: new Date("2025-03-20"),
        remarques: "Chaises métalliques avec coussin",
      },
    });
    await tx.bienPatrimoine.create({
      data: {
        designation: "Ordinateur secrétariat",
        categorie: CategoriePatrimoine.INFORMATIQUE,
        quantite: 1,
        etat: EtatBien.BON_ETAT,
        valeurEstimee: 280000,
        lieuStockage: "Bureau administratif",
        dateAcquisition: new Date("2025-01-15"),
        remarques: "Utilisé pour la tenue des registres et relevés",
      },
    });
    await tx.bienPatrimoine.create({
      data: {
        designation: "Sono portable JBL",
        categorie: CategoriePatrimoine.SONORISATION,
        quantite: 1,
        etat: EtatBien.USAGE,
        valeurEstimee: 150000,
        lieuStockage: "Temple",
        dateAcquisition: new Date("2023-06-10"),
        remarques: "En état d'usage, révisée en 2025",
      },
    });

    // -------------------------------------------------------------------------
    // Journal d'audit
    // -------------------------------------------------------------------------
    await tx.journalAudit.create({
      data: {
        action: "CREATION",
        entite: "Utilisateur",
        entiteId: admin.id,
        auteurNom: "Système",
        details: "Création du compte administrateur par défaut (admin@eimc.tg)",
      },
    });
    await tx.journalAudit.create({
      data: {
        action: "CREATION",
        entite: "Utilisateur",
        entiteId: adminPrincipal.id,
        auteurNom: "Système",
        details: "Création du compte administrateur principal (jeanbaptistedegbey10@gmail.com)",
      },
    });
    await tx.journalAudit.create({
      data: {
        action: "INSERTION",
        entite: "Exercice",
        entiteId: exercice2025.id,
        auteurNom: "Seed",
        details: "Création de l'exercice comptable 2025 (clôturé)",
      },
    });
    await tx.journalAudit.create({
      data: {
        action: "INSERTION",
        entite: "Exercice",
        entiteId: exercice2026.id,
        auteurNom: "Seed",
        details: "Création de l'exercice comptable 2026 (en cours)",
      },
    });
    await tx.journalAudit.create({
      data: {
        action: "INSERTION",
        entite: "Membre",
        entiteId: membres["koffi"].id,
        auteurNom: "Seed",
        details: "Création du membre Koffi Mensah",
      },
    });
    await tx.journalAudit.create({
      data: {
        action: "INSERTION",
        entite: "Culte",
        entiteId: culteDimancheJeunesse.id,
        auteurNom: "Seed",
        details: "Création du culte 'Culte du dimanche - Jeunesse' (15 mars 2026)",
      },
    });

    console.log("✅ Seed terminé avec succès.");
  });
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });