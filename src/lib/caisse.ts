import { prisma } from "@/lib/prisma";

export const CAISSES_DEFAUT = [
  {
    nom: "Caisse Courante / Générale",
    code: "CAISSE_GENERALE",
    description: "Fonctionnement courant de l'église (factures, charges, achats).",
    estParDefaut: true,
  },
  {
    nom: "Caisse Solidarité / Diaconie",
    code: "CAISSE_SOLIDARITE",
    description: "Secours diaconal, aides sociales et soutiens aux membres.",
    estParDefaut: false,
  },
  {
    nom: "Caisse Travaux & Projets",
    code: "CAISSE_TRAVAUX",
    description: "Travaux, équipements et investissements.",
    estParDefaut: false,
  },
] as const;

export type CaisseResume = {
  id: string;
  nom: string;
  code: string | null;
  description: string | null;
  soldeInitial: number;
  soldeActuel: number;
  estParDefaut: boolean;
};

export type CotisationSolde = {
  id: string;
  nom: string;
  exerciceId: string;
  estCloture: boolean;
  totalCollecte: number;
  totalDepenseImputee: number;
  totalTransfertVersCaisse: number;
  totalComplementRecu: number;
  soldeDisponible: number;
};

export function versNombreCaisse(valeur: unknown): number {
  const nombre = Number(valeur ?? 0);
  return Number.isFinite(nombre) ? nombre : 0;
}

export function tablesCaissesDisponibles(): boolean {
  const client = prisma as unknown as Record<string, unknown>;
  return (
    typeof client.caisse !== "undefined" &&
    typeof client.mouvementCaisse !== "undefined"
  );
}

export async function assurerCaissesInitiales(): Promise<CaisseResume[]> {
  if (!tablesCaissesDisponibles()) return [];
  const delegate = (
    prisma as unknown as {
      caisse: {
        count: () => Promise<number>;
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      };
    }
  ).caisse;
  const nombre = await delegate.count().catch(() => 0);
  if (nombre === 0) {
    for (const caisse of CAISSES_DEFAUT) {
      await delegate
        .create({
          data: {
            nom: caisse.nom,
            code: caisse.code,
            description: caisse.description,
            soldeInitial: 0,
            soldeActuel: 0,
            estParDefaut: caisse.estParDefaut,
          },
        })
        .catch(() => null);
    }
  }
  return listerCaisses();
}

export async function listerCaisses(): Promise<CaisseResume[]> {
  if (!tablesCaissesDisponibles()) return [];
  const delegate = (
    prisma as unknown as {
      caisse: { findMany: (args?: unknown) => Promise<Record<string, unknown>[]> };
    }
  ).caisse;
  const lignes = await delegate
    .findMany({ orderBy: [{ estParDefaut: "desc" }, { nom: "asc" }] })
    .catch(() => []);
  return lignes.map((caisse) => ({
    id: String(caisse.id),
    nom: String(caisse.nom ?? ""),
    code: (caisse.code as string | null) ?? null,
    description: (caisse.description as string | null) ?? null,
    soldeInitial: versNombreCaisse(caisse.soldeInitial),
    soldeActuel: versNombreCaisse(caisse.soldeActuel),
    estParDefaut: Boolean(caisse.estParDefaut),
  }));
}

export async function calculerSoldeCotisation(
  cotisationId: string,
  depenseExclueId: string | null = null,
): Promise<CotisationSolde | null> {
  const cotisation = await prisma.cotisation.findUnique({
    where: { id: cotisationId },
    select: {
      id: true,
      nom: true,
      exerciceId: true,
      estCloture: true,
      versements: { select: { montant: true } },
    },
  });
  if (!cotisation) return null;
  const totalCollecte = cotisation.versements.reduce(
    (somme, versement) => somme + versNombreCaisse(versement.montant),
    0,
  );
  const depenses = await prisma.depense.findMany({
    where: {
      cotisationId,
      ...(depenseExclueId ? { id: { not: depenseExclueId } } : {}),
    },
    select: { montant: true },
  });
  const totalDepenseImputee = depenses.reduce(
    (somme, depense) => somme + versNombreCaisse(depense.montant),
    0,
  );
  let totalTransfertVersCaisse = 0;
  let totalComplementRecu = 0;
  if (tablesCaissesDisponibles()) {
    const delegate = (
      prisma as unknown as {
        mouvementCaisse: {
          findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
        };
      }
    ).mouvementCaisse;
    const mouvements = await delegate
      .findMany({ where: { cotisationId } })
      .catch(() => []);
    for (const mouvement of mouvements) {
      const montant = versNombreCaisse(mouvement.montant);
      if (mouvement.type === "TRANSFERT_COTISATION") totalTransfertVersCaisse += montant;
      else if (mouvement.type === "COMPLEMENT_COTISATION") totalComplementRecu += montant;
    }
  }
  return {
    id: cotisation.id,
    nom: cotisation.nom,
    exerciceId: cotisation.exerciceId,
    estCloture: cotisation.estCloture,
    totalCollecte,
    totalDepenseImputee,
    totalTransfertVersCaisse,
    totalComplementRecu,
    soldeDisponible:
      totalCollecte + totalComplementRecu - (totalDepenseImputee + totalTransfertVersCaisse),
  };
}

export type MouvementCaisseLigne = {
  id: string;
  caisseId: string;
  caisseNom: string | null;
  type: string;
  sens: "ENTREE" | "SORTIE";
  montant: number;
  dateMouvement: string;
  motif: string;
  cotisationId: string | null;
  cotisationNom: string | null;
  membreId: string | null;
  membreNom: string | null;
  donateurTiers: string | null;
  modePaiement: string;
  numeroPiece: string | null;
};

export async function listerMouvementsCaisse(limite = 30): Promise<MouvementCaisseLigne[]> {
  if (!tablesCaissesDisponibles()) return [];
  const delegate = (
    prisma as unknown as {
      mouvementCaisse: {
        findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
      };
    }
  ).mouvementCaisse;
  const lignes = await delegate
    .findMany({
      orderBy: [{ dateMouvement: "desc" }, { createdAt: "desc" }],
      take: limite,
      include: {
        caisse: { select: { nom: true } },
        cotisation: { select: { nom: true } },
        membre: { select: { nom: true, prenoms: true } },
      },
    })
    .catch(() => []);
  return lignes.map((mouvement) => {
    const caisse = mouvement.caisse as { nom?: unknown } | null | undefined;
    const cotisation = mouvement.cotisation as { nom?: unknown } | null | undefined;
    const membre = mouvement.membre as
      | { nom?: unknown; prenoms?: unknown }
      | null
      | undefined;
    const date = mouvement.dateMouvement as Date | string | undefined;
    return {
      id: String(mouvement.id),
      caisseId: String(mouvement.caisseId ?? ""),
      caisseNom: caisse?.nom ? String(caisse.nom) : null,
      type: String(mouvement.type ?? ""),
      sens: mouvement.sens === "SORTIE" ? "SORTIE" : "ENTREE",
      montant: versNombreCaisse(mouvement.montant),
      dateMouvement:
        date instanceof Date ? date.toISOString().slice(0, 10) : String(date ?? "").slice(0, 10),
      motif: String(mouvement.motif ?? ""),
      cotisationId: (mouvement.cotisationId as string | null) ?? null,
      cotisationNom: cotisation?.nom ? String(cotisation.nom) : null,
      membreId: (mouvement.membreId as string | null) ?? null,
      membreNom:
        membre?.nom || membre?.prenoms
          ? `${String(membre?.prenoms ?? "")} ${String(membre?.nom ?? "")}`.trim()
          : null,
      donateurTiers: (mouvement.donateurTiers as string | null) ?? null,
      modePaiement: String(mouvement.modePaiement ?? "ESPECES"),
      numeroPiece: (mouvement.numeroPiece as string | null) ?? null,
    };
  });
}

/** Libellé lisible d'un type de mouvement de trésorerie. */
const LIBELLE_TYPE_MOUVEMENT: Record<string, string> = {
  DON_LIBRE: "Don libre",
  TRANSFERT_COTISATION: "Transfert cotisation vers caisse",
  COMPLEMENT_COTISATION: "Complément caisse vers cotisation",
  VIREMENT_INTERNE: "Virement inter-caisses",
  AJUSTEMENT: "Ajustement de solde",
};

export type VirementTraceLigne = {
  id: string;
  date: string;
  type: string;
  source: string;
  destination: string;
  montant: number;
  motif: string;
};

/**
 * Liste les opérations de virement / complément / transfert pour la traçabilité.
 * Chaque opération est présentée sur une seule ligne (Source → Destination).
 * Pour les virements inter-caisses, la jambe d'entrée porte en `numeroPiece`
 * la référence `VIR-<id de la jambe de sortie>` ce qui permet de les apparier.
 */
export async function listerTracesVirements(): Promise<VirementTraceLigne[]> {
  if (!tablesCaissesDisponibles()) return [];
  const delegate = (
    prisma as unknown as {
      mouvementCaisse: {
        findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
      };
    }
  ).mouvementCaisse;
  const lignes = await delegate
    .findMany({
      where: {
        type: {
          in: ["VIREMENT_INTERNE", "TRANSFERT_COTISATION", "COMPLEMENT_COTISATION"],
        },
      },
      orderBy: [{ dateMouvement: "desc" }, { createdAt: "desc" }],
      include: {
        caisse: { select: { id: true, nom: true } },
        cotisation: { select: { id: true, nom: true } },
      },
    })
    .catch(() => []);

  // Index des jambes de sortie de virement inter-caisses par id, pour résoudre la source.
  const jambesSortie = new Map<string, { caisseNom: string }>();
  for (const m of lignes) {
    if (String(m.type) === "VIREMENT_INTERNE" && String(m.sens) === "SORTIE") {
      const caisse = m.caisse as { id?: unknown; nom?: unknown } | null | undefined;
      jambesSortie.set(String(m.id), {
        caisseNom: caisse?.nom ? String(caisse.nom) : "Caisse source",
      });
    }
  }

  const traces: VirementTraceLigne[] = [];
  for (const m of lignes) {
    const type = String(m.type ?? "");
    const sens = String(m.sens ?? "ENTREE");
    const caisse = m.caisse as { id?: unknown; nom?: unknown } | null | undefined;
    const cotisation = m.cotisation as { id?: unknown; nom?: unknown } | null | undefined;
    const caisseNom = caisse?.nom ? String(caisse.nom) : "Caisse";
    const cotisationNom = cotisation?.nom ? String(cotisation.nom) : "Cotisation";
    const date = m.dateMouvement as Date | string | undefined;
    const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : String(date ?? "").slice(0, 10);
    const montant = versNombreCaisse(m.montant);
    const motif = String(m.motif ?? "");
    const numeroPiece = String(m.numeroPiece ?? "");

    if (type === "TRANSFERT_COTISATION" && sens === "ENTREE") {
      traces.push({
        id: String(m.id),
        date: dateStr,
        type: LIBELLE_TYPE_MOUVEMENT[type],
        source: cotisationNom,
        destination: caisseNom,
        montant,
        motif,
      });
      continue;
    }
    if (type === "COMPLEMENT_COTISATION" && sens === "SORTIE") {
      traces.push({
        id: String(m.id),
        date: dateStr,
        type: LIBELLE_TYPE_MOUVEMENT[type],
        source: caisseNom,
        destination: cotisationNom,
        montant,
        motif,
      });
      continue;
    }
    if (type === "VIREMENT_INTERNE" && sens === "ENTREE") {
      // Jambes d'entrée : on résout la caisse source via la référence VIR-<id>.
      let source = "Caisse source";
      const match = numeroPiece.match(/^VIR-(.+)$/);
      if (match) {
        const src = jambesSortie.get(match[1]);
        if (src) source = src.caisseNom;
      }
      traces.push({
        id: String(m.id),
        date: dateStr,
        type: LIBELLE_TYPE_MOUVEMENT[type],
        source,
        destination: caisseNom,
        montant,
        motif,
      });
      continue;
    }
    // Jambes de sortie de virement inter-caisses : omises (déjà présentées par la jambe d'entrée).
  }
  return traces;
}
