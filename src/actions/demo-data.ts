"use server";

import { revalidatePath } from "next/cache";

import { obtenirSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consignerAudit } from "@/lib/audit";
import { Prisma, FrequenceCotisation, TypeCotisation, ModePaiement, CategoriePatrimoine, EtatBien } from "@/generated/prisma/client";
import {
  EXEMPLE_UTILISATEURS,
  EXEMPLE_MEMBRES,
  EXEMPLE_DEPARTEMENTS,
  EXEMPLE_GROUPES,
  EXEMPLE_CAISSES,
  EXEMPLE_EXERCICES,
  EXEMPLE_COTISATION,
  EXEMPLE_BAREMES,
  EXEMPLE_STATUT_VERSEMENT,
  EXEMPLE_DONS,
  EXEMPLE_CULTES,
  EXEMPLE_PATRIMOINE,
  EXEMPLE_AIDES,
  MODES_PAIEMENT,
} from "@/lib/demo-customers";

const EMAIL_ADMIN_PRINCIPAL = "jeanbaptistedegbey10@gmail.com";
type RolePrisma =
  | "ADMINISTRATEUR"
  | "PASTEUR"
  | "TRESORIER"
  | "SECRETARIAT"
  | "MEMBRE_CONSULTATION";

const ROUTES_A_REVALIDER = [
  "/",
  "/dashboard",
  "/finances",
  "/membres",
  "/cultes",
  "/solidarite",
  "/rapports",
  "/parametres",
];

async function verifierAdmin() {
  const session = await obtenirSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? null;
  if (!session || role !== "ADMINISTRATEUR") {
    throw new Error("Accès réservé aux administrateurs.");
  }
  return session;
}

/**
 * Garde serveur des outils de démonstration : en production, l'injection et la
 * purge sont refusées sauf activation explicite (`ACTIVER_OUTILS_DEMO=true`).
 * Double la condition d'affichage de la page Paramètres (masquage UI).
 */
function verifierOutilsDemoActifs() {
  if (process.env.NODE_ENV === "production" && process.env.ACTIVER_OUTILS_DEMO !== "true") {
    throw new Error(
      "Outils de démonstration désactivés en production (variable ACTIVER_OUTILS_DEMO non définie).",
    );
  }
}

function classeAge(dateNaissance: string): "ADULTE" | "JEUNE" | "ENFANT" {
  const naissance = new Date(dateNaissance);
  const ref = new Date(Date.UTC(2026, 0, 1));
  let age = ref.getFullYear() - naissance.getFullYear();
  const m = ref.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < naissance.getDate())) {
    age -= 1;
  }
  if (age < 13) return "ENFANT";
  if (age < 18) return "JEUNE";
  return "ADULTE";
}

/** Libellés français des paliers de barème (classe d'âge → libellé Prisma). */
const LIBELLES_CLASSE_BAREME: Record<string, string> = {
  ADULTE: "Adultes",
  JEUNE: "Jeunes",
  ENFANT: "Enfants",
};

export async function injecterDonneesDemo() {
  const session = await verifierAdmin();
  verifierOutilsDemoActifs();
  try {
    // -----------------------------------------------------------------------
    // 1. COMPTES D'ACCÈS (5 RÔLES) — le compte admin principal est préservé.
    // -----------------------------------------------------------------------
    for (const u of EXEMPLE_UTILISATEURS) {
      const existe = await prisma.utilisateur.findUnique({ where: { email: u.email } });
      if (!existe) {
        await prisma.utilisateur.create({
          data: {
            nomComplet: u.nomComplet,
            email: u.email,
            telephone: u.telephone,
            role: u.role as RolePrisma,
            motDePasseHash:
              "scrypt$16384$8$1$Zm9vYmFy$YmFyYmFyYmFyYmFyYmFyYmFyYmFyYmFyYmFy",
            actif: true,
          },
        });
      } else if (u.email === EMAIL_ADMIN_PRINCIPAL) {
        await prisma.utilisateur.update({
          where: { id: existe.id },
          data: { role: "ADMINISTRATEUR" as RolePrisma, actif: true },
        });
      }
    }

    // -----------------------------------------------------------------------
    // 2. MEMBRES (20 fiches complètes)
    // -----------------------------------------------------------------------
    const membresCrees: { id: string; demo: (typeof EXEMPLE_MEMBRES)[number] }[] = [];
    for (const m of EXEMPLE_MEMBRES) {
      const existe = await prisma.membre.findUnique({
        where: { email: m.email },
        // Contrôle d'existence uniquement : la photo (data URL) n'est pas
        // nécessaire au sein de jeu de démonstration.
        select: { id: true },
      });

      if (existe) {
        membresCrees.push({ id: existe.id, demo: m });
        continue;
      }
      const donneesEcclesiastiques = {
        sexe: m.sexe,
        dateNaissance: m.dateNaissance,
        etatCivil: m.etatCivil,
        fonctions: m.fonctions,
        classificationSociale: m.classificationSociale,
        statutMembre: "Actif",
        typePersonne: "PHYSIQUE",
        membreDepuis: new Date(Date.UTC(2026, 0, 1)).toISOString(),
        bapteme: true,
      } as unknown;
      const membre = await prisma.membre.create({
        data: {
          nom: m.nom,
          prenoms: m.prenoms,
          telephone: m.telephone,
          email: m.email,
          adresse: m.adresse,
          profession: m.profession,
          donneesEcclesiastiques: donneesEcclesiastiques as unknown as
            | Prisma.NullableJsonNullValueInput
            | Prisma.InputJsonValue,
        },
      });
      membresCrees.push({ id: membre.id, demo: m });
    }

    const membreParIndex = new Map<number, string>();
    membresCrees.forEach(({ id }, index) => membreParIndex.set(index, id));
    // -----------------------------------------------------------------------
    // 3. DÉPARTEMENTS et GROUPES (responsables et affectations)
    // -----------------------------------------------------------------------
    const departementsParNom = new Map<string, string>();
    for (const d of EXEMPLE_DEPARTEMENTS) {
      const existe = await prisma.departement.findFirst({ where: { nom: d.nom } });
      const responsableId =
        d.responsableIndex != null ? membreParIndex.get(d.responsableIndex) ?? null : null;
      const departement = existe
        ? await prisma.departement.update({
            where: { id: existe.id },
            data: { description: d.description, responsableId },
          })
        : await prisma.departement.create({
            data: { nom: d.nom, description: d.description, responsableId },
          });
      departementsParNom.set(d.nom, departement.id);
    }

    const groupesParNom = new Map<string, string>();
    for (const g of EXEMPLE_GROUPES) {
      const existe = await prisma.groupe.findFirst({ where: { nom: g.nom } });
      const responsableId =
        g.responsableIndex != null ? membreParIndex.get(g.responsableIndex) ?? null : null;
      const departementId = departementsParNom.get(g.departement) ?? undefined;
      const groupe = existe
        ? await prisma.groupe.update({
            where: { id: existe.id },
            data: {
              description: `Groupe de maison — ${g.nom}`,
              responsableId,
              departementId,
            },
          })
        : await prisma.groupe.create({
            data: {
              nom: g.nom,
              description: `Groupe de maison — ${g.nom}`,
              responsableId,
              departementId,
            },
          });
      groupesParNom.set(g.nom, groupe.id);
    }

    for (const { id, demo } of membresCrees) {
      const departementId = departementsParNom.get(demo.departement);
      if (departementId) {
        await prisma.departementMembre.upsert({
          where: { departementId_membreId: { departementId, membreId: id } },
          update: { role: "MEMBRE" },
          create: { departementId, membreId: id, role: "MEMBRE" },
        });
      }
      const groupeId = groupesParNom.get(demo.groupeMaison);
      if (groupeId) {
        await prisma.groupeMembre.upsert({
          where: { groupeId_membreId: { groupeId, membreId: id } },
          update: { role: "MEMBRE" },
          create: { groupeId, membreId: id, role: "MEMBRE" },
        });
      }
    }

    // -----------------------------------------------------------------------
    // 4. CAISSES (4) — montants en nombre (Prisma accepte number pour Decimal).
    // -----------------------------------------------------------------------
    const caissesParNom = new Map<string, string>();
    for (const c of EXEMPLE_CAISSES) {
      const existe = await prisma.caisse.findFirst({ where: { nom: c.nom } });
      const caisse = existe
        ? await prisma.caisse.update({
            where: { id: existe.id },
            data: {
              code: c.code,
              description: c.description,
              soldeInitial: c.soldeInitial,
              soldeActuel: c.soldeInitial,
              estParDefaut: c.estParDefaut,
            },
          })
        : await prisma.caisse.create({
            data: {
              nom: c.nom,
              code: c.code,
              description: c.description,
              soldeInitial: c.soldeInitial,
              soldeActuel: c.soldeInitial,
              estParDefaut: c.estParDefaut,
            },
          });
      caissesParNom.set(c.nom, caisse.id);
    }

    // -----------------------------------------------------------------------
    // 5. EXERCICES (2025 clôturé, 2026 actif)
    // -----------------------------------------------------------------------
    const exercicesParAnnee = new Map<number, string>();
    for (const e of EXEMPLE_EXERCICES) {
      const ex = await prisma.exercice.upsert({
        where: { annee: e.annee },
        update: { libelle: e.libelle, cloture: e.cloture },
        create: { annee: e.annee, libelle: e.libelle, cloture: e.cloture },
      });
      exercicesParAnnee.set(e.annee, ex.id);
    }
    const ex2026 = exercicesParAnnee.get(2026);
    // -----------------------------------------------------------------------
    // 6. COTISATION RÉCURRENTE 2026 + barèmes + versements par membre.
    // -----------------------------------------------------------------------
    let cotisation2026Id: string | null = null;
    if (ex2026) {
      const existeCotisation = await prisma.cotisation.findFirst({
        where: { exerciceId: ex2026, nom: EXEMPLE_COTISATION.nom },
      });
      const cotisation = existeCotisation
        ? await prisma.cotisation.update({
            where: { id: existeCotisation.id },
            data: {
              description: EXEMPLE_COTISATION.description,
              frequence:
                FrequenceCotisation[
                  EXEMPLE_COTISATION.frequence as keyof typeof FrequenceCotisation
                ],
              type: EXEMPLE_COTISATION.type as TypeCotisation,
              montantPlancher: EXEMPLE_COTISATION.montantPlancher,
              estCloture: false,
            },
          })
        : await prisma.cotisation.create({
            data: {
              nom: EXEMPLE_COTISATION.nom,
              description: EXEMPLE_COTISATION.description,
              frequence:
                FrequenceCotisation[
                  EXEMPLE_COTISATION.frequence as keyof typeof FrequenceCotisation
                ],
              type: EXEMPLE_COTISATION.type as TypeCotisation,
              montantPlancher: EXEMPLE_COTISATION.montantPlancher,
              estCloture: false,
              exercice: { connect: { id: ex2026 } },
            },
          });
      cotisation2026Id = cotisation.id;

      // Barèmes par classe (ADULTE / JEUNE / ENFANT) — idempotents.
      // PaliereBareme est rattaché à un type de cotisation (CategorieCotisation)
      // et à un exercice — la catégorie démo est créée ou réutilisée ici.
      const typeCotisationExistant = await prisma.categorieCotisation.findFirst({
        where: { libelle: EXEMPLE_COTISATION.nom },
      });
      const typeCotisation = typeCotisationExistant
        ? await prisma.categorieCotisation.update({
            where: { id: typeCotisationExistant.id },
            data: {
              description: EXEMPLE_COTISATION.description,
              type: "OBLIGATOIRE_BAREME",
            },
          })
        : await prisma.categorieCotisation.create({
            data: {
              libelle: EXEMPLE_COTISATION.nom,
              description: EXEMPLE_COTISATION.description,
              type: "OBLIGATOIRE_BAREME",
            },
          });

      await prisma.paliereBareme.deleteMany({
        where: { typeCotisationId: typeCotisation.id },
      });
      for (const b of EXEMPLE_BAREMES) {
        await prisma.paliereBareme.create({
          data: {
            typeCotisationId: typeCotisation.id,
            exerciceId: ex2026,
            libelleClasse: LIBELLES_CLASSE_BAREME[b.cible] ?? b.cible,
            montant: b.montant,
          },
        });
      }

      const moisComplets = [
        "01","02","03","04","05","06","07","08","09","10","11","12",
      ];
      const moisPartiels = ["01","02","03","04","05","06"];
      const statuts = [
        ...EXEMPLE_STATUT_VERSEMENT.aJour.map((i) => ({ index: i, type: "aJour" as const })),
        ...EXEMPLE_STATUT_VERSEMENT.partiel.map((i) => ({ index: i, type: "partiel" as const })),
      ];
      for (const { index, type } of statuts) {
        const membreId = membreParIndex.get(index);
        if (!membreId || !cotisation2026Id) continue;
        const cible = classeAge(EXEMPLE_MEMBRES[index].dateNaissance);
        const bareme = cible === "ADULTE" ? 10000 : cible === "JEUNE" ? 5000 : 2500;
        const montant = type === "aJour" ? bareme : bareme / 2;
        const moisCoches = type === "aJour" ? moisComplets : moisPartiels;
        const modePaiement = MODES_PAIEMENT[index % MODES_PAIEMENT.length] as ModePaiement;
        const dateVersement = new Date(Date.UTC(2026, index % 12, 10 + (index % 20)));
        await prisma.versementCotisation.create({
          data: {
            cotisationId: cotisation2026Id,
            membreId,
            montant,
            montantBase: montant,
            surplusVolontaire: 0,
            moisCoches,
            estAnonyme: false,
            dateEffective: dateVersement,
            dateVersement,
            modePaiement,
            commentaire: `Demo — cotisation ${cible} ${type === "aJour" ? "à jour" : "partiel"}`,
          },
        });
      }
      // Les membres 15-19 (en retard) n'ont aucun versement : volontairement omis.
    }

    // -----------------------------------------------------------------------
    // 7. DONS LIBRES — équipement sonorisation / vidéoprojecteur.
    // -----------------------------------------------------------------------
    const caisseEquipementId = caissesParNom.get("Caisse Équipement/Projets");
    if (caisseEquipementId) {
      for (const d of EXEMPLE_DONS) {
        await prisma.mouvementCaisse.create({
          data: {
            caisseId: caisseEquipementId,
            type: "DON_LIBRE",
            montant: d.montant,
            sens: "ENTREE",
            dateMouvement: new Date(d.date),
            motif: d.motif,
            modePaiement: "ESPECES",
          },
        });
      }
    }
    // -----------------------------------------------------------------------
    // 8. CULTES & QUÊTES — 2 derniers mois.
    // -----------------------------------------------------------------------
    for (const c of EXEMPLE_CULTES) {
      const culteExistant = await prisma.culte.findFirst({
        where: { date: new Date(c.date) },
      });
      if (culteExistant) {
        await prisma.culte.update({
          where: { id: culteExistant.id },
          data: { intitule: c.intitule, totalQueteAnonyme: c.totalQueteAnonyme },
        });
      } else {
        await prisma.culte.create({
          data: {
            date: new Date(c.date),
            intitule: c.intitule,
            totalQueteAnonyme: c.totalQueteAnonyme,
          },
        });
      }
    }

    // -----------------------------------------------------------------------
    // 9. PATRIMOINE — registre des équipements.
    // -----------------------------------------------------------------------
    for (const b of EXEMPLE_PATRIMOINE) {
      await prisma.bienPatrimoine.create({
        data: {
          designation: b.designation,
          categorie: b.categorie as CategoriePatrimoine,
          quantite: b.quantite,
          etat: b.etat as EtatBien,
          valeurEstimee: b.valeurEstimee,
          lieuStockage: b.lieuStockage,
          dateAcquisition:
            b.dateAcquisition != null ? new Date(b.dateAcquisition) : null,
          remarques: b.remarques,
        },
      });
    }

    // -----------------------------------------------------------------------
    // 10. AIDE & SOLIDARITÉ — registres d'assistance.
    // -----------------------------------------------------------------------
    for (const a of EXEMPLE_AIDES) {
      const beneficiaireMembreId = membreParIndex.get(a.beneficiaireIndex) ?? null;
      await prisma.aideDistribution.create({
        data: {
          montantOuNature: a.montantOuNature,
          motif: a.motif,
          beneficiaireMembreId,
          dateDistribution: new Date(a.date),
          notesConflictuelles: a.notesConflictuelles,
        },
      });
    }
  } catch (erreur: unknown) {
    console.error("Erreur injection données démo :", erreur);
    return {
      ok: false,
      message:
        erreur instanceof Error
          ? erreur.message
          : "Erreur inconnue lors de l’injection.",
    };
  }

  await consignerAudit({
    action: "INJECTION_DEMO",
    entite: "DonneesDemo",
    auteurNom:
      (session?.user as { nomComplet?: string } | undefined)?.nomComplet ??
      "Système",
    details:
      "Injection des données de démonstration haute-fidélité (20 membres, 5 rôles, 4 caisses, 2 exercices, cultes, patrimoine, aide & solidarité).",
  });

  for (const route of ROUTES_A_REVALIDER) {
    revalidatePath(route);
  }

  return {
    ok: true,
    message: "Données de démonstration injectées avec succès.",
  };
}

// ---------------------------------------------------------------------------
// PURGE DES DONNÉES DE DÉMONSTRATION (ordre de dépendance des clés étrangères).
// ---------------------------------------------------------------------------

export async function purgerDonneesDemo() {
  const session = await verifierAdmin();
  verifierOutilsDemoActifs();
  try {
    const adminPrincipal = await prisma.utilisateur.findUnique({
      where: { email: EMAIL_ADMIN_PRINCIPAL },
    });

    // Purge dans l'ordre de dépendance des clés étrangères (enfants → parents).
    await prisma.versementCotisation.deleteMany({});
    await prisma.paiement.deleteMany({});
    await prisma.mouvementCaisse.deleteMany({});
    await prisma.aideDistribution.deleteMany({});
    await prisma.depense.deleteMany({});
    await prisma.culte.deleteMany({});
    await prisma.bienPatrimoine.deleteMany({});
    await prisma.paliereBareme.deleteMany({});
    // Enfants (paliers + paiements) purgés ci-dessus : la catégorie démo peut suivre.
    await prisma.categorieCotisation.deleteMany({});
    await prisma.cotisation.deleteMany({});
    await prisma.departementMembre.deleteMany({});
    await prisma.groupeMembre.deleteMany({});
    await prisma.departement.deleteMany({});
    await prisma.groupe.deleteMany({});
    await prisma.membre.deleteMany({});
    await prisma.caisse.deleteMany({});
    await prisma.exercice.deleteMany({});

    // Utilisateurs secondaires uniquement — le compte admin principal est conservé.
    await prisma.utilisateur.deleteMany({
      where: { email: { not: EMAIL_ADMIN_PRINCIPAL } },
    });

    if (adminPrincipal) {
      await prisma.utilisateur.update({
        where: { id: adminPrincipal.id },
        data: { role: "ADMINISTRATEUR" as RolePrisma, actif: true },
      });
    }

    await consignerAudit({
      action: "PURGE_DEMO",
      entite: "DonneesDemo",
      auteurNom:
        (session?.user as { nomComplet?: string } | undefined)?.nomComplet ??
        "Système",
      details:
        "Purge structurée des données de démonstration (ordre FK). Compte principal préservé et réaffecté ADMINISTRATEUR.",
    });

    for (const route of ROUTES_A_REVALIDER) {
      revalidatePath(route);
    }

    return {
      ok: true,
      message:
        "Données de démonstration purgées avec succès. Compte administrateur principal préservé.",
    };
  } catch (erreur: unknown) {
    console.error("Erreur purge données démo :", erreur);
    return {
      ok: false,
      message:
        erreur instanceof Error
          ? erreur.message
          : "Erreur inconnue lors de la purge.",
    };
  }
}