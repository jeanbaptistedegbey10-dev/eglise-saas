"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { VALEURS_MODE_PAIEMENT, formatMontant } from "@/lib/finance";
import { consignerAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { aAccesAuChemin, normaliserRole } from "@/lib/permissions";
import { calculerSoldeCotisation, tablesCaissesDisponibles, versNombreCaisse } from "@/lib/caisse";
import { prisma } from "@/lib/prisma";
import type { CaisseFormState } from "@/types/caisse";

const montantSchema = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.trim().replace(",", ".")) : v),
  z.number().refine((v) => Number.isFinite(v) && v > 0 && v <= 1_000_000_000, {
    message: "Montant invalide.",
  }),
);
const idSchema = z.string().trim().min(1, "Identifiant manquant.");
const idOpt = z.string().trim().min(1).nullish();
const texteOpt = (max: number) =>
  z.string().trim().max(max).nullish();
function echec(message: string, champ = "_form"): CaisseFormState {
  return { success: false, message, fieldErrors: { [champ]: [message] } };
}
function ok(message: string): CaisseFormState {
  return { success: true, message, fieldErrors: {} };
}
function revalider(): void {
  revalidatePath("/finances/depenses");
  revalidatePath("/finances/caisses");
  revalidatePath("/finances/dons-libres");
  revalidatePath("/finances/virements");
  revalidatePath("/finances");
}
function indisponible(): CaisseFormState | null {
  if (!tablesCaissesDisponibles()) {
    return echec(
      "Tables Caisses non disponibles : exécutez `prisma migrate dev` puis `prisma generate` pour activer la trésorerie.",
    );
  }
  return null;
}
function delegateCaisse() {
  return (
    prisma as unknown as {
      caisse: {
        findUnique: (a: unknown) => Promise<Record<string, unknown> | null>;
        findMany: (a?: unknown) => Promise<Record<string, unknown>[]>;
        create: (a: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
        update: (a: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
        updateMany: (a: { where?: unknown; data: Record<string, unknown> }) => Promise<unknown>;
        delete: (a: { where: { id: string } }) => Promise<unknown>;
      };
      mouvementCaisse: {
        create: (a: { data: Record<string, unknown> }) => Promise<{ id: string }>;
        count: (a?: unknown) => Promise<number>;
      };
    }
  );
}

/** RBAC : seuls Trésorier / Administrateur gèrent les caisses (via /finances). */
async function verifierDroitCaisses(): Promise<CaisseFormState | null> {
  const session = await auth().catch(() => null);
  const roleBrut = (session?.user as { role?: string } | undefined)?.role ?? null;
  const role = normaliserRole(roleBrut);
  if (!session?.user || !role || (role !== "TRESORIER" && role !== "ADMINISTRATEUR")) {
    return echec("Action réservée aux rôles Trésorier / Administrateur.");
  }
  if (!aAccesAuChemin(role, "/finances/caisses")) {
    return echec("Action réservée aux rôles Trésorier / Administrateur.");
  }
  return null;
}
// MARQUEUR-PARTIE-1
export async function creerNouvelleCaisse(
  entree: FormData | {
    nom: string;
    code?: string | null;
    description?: string | null;
    soldeInitial?: number;
  },
): Promise<CaisseFormState> {
  const droit = await verifierDroitCaisses();
  if (droit) return droit;
  const garde = indisponible();
  if (garde) return garde;
  const brut =
    entree instanceof FormData
      ? {
          nom: String(entree.get("nom") ?? "").trim(),
          code: String(entree.get("code") ?? "").trim() || null,
          description: String(entree.get("description") ?? "").trim() || null,
          soldeInitial: entree.get("soldeInitial"),
        }
      : entree;
  const analyse = z
    .object({
      nom: z.string().trim().min(2, "Nom de caisse trop court.").max(80),
      code: texteOpt(30),
      description: texteOpt(300),
      soldeInitial: z.preprocess(
        (v) =>
          v === null || v === undefined || v === ""
            ? 0
            : typeof v === "string"
              ? Number(v.trim().replace(",", "."))
              : v,
        z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1_000_000_000, {
          message: "Solde initial invalide.",
        }),
      ),
    })
    .safeParse(brut);
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? issue.path.join(".") : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return { success: false, message: "Formulaire invalide.", fieldErrors };
  }
  try {
    const { caisse } = delegateCaisse();
    await caisse.create({
      data: {
        nom: analyse.data.nom,
        code: analyse.data.code ?? null,
        description: analyse.data.description ?? null,
        soldeInitial: analyse.data.soldeInitial,
        soldeActuel: analyse.data.soldeInitial,
      },
    });
    revalider();
    return ok(`La caisse « ${analyse.data.nom} » a été créée.`);
  } catch (erreur) {
    console.error("Erreur creerNouvelleCaisse :", erreur);
    return echec("Création impossible (base injoignable).");
  }
}

export async function enregistrerDonLibreCaisse(
  entree: FormData | {
    caisseId: string;
    montant: number;
    motif: string;
    dateMouvement?: string | null;
    membreId?: string | null;
    donateurTiers?: string | null;
    modePaiement?: string;
    numeroPiece?: string | null;
  },
): Promise<CaisseFormState> {
  const droitDon = await verifierDroitCaisses();
  if (droitDon) return droitDon;
  const garde = indisponible();
  if (garde) return garde;
  const brut =
    entree instanceof FormData
      ? {
          caisseId: String(entree.get("caisseId") ?? "").trim(),
          montant: entree.get("montant"),
          motif: String(entree.get("motif") ?? "").trim(),
          dateMouvement: String(entree.get("dateMouvement") ?? "").trim() || null,
          membreId: String(entree.get("membreId") ?? "").trim() || null,
          donateurTiers: String(entree.get("donateurTiers") ?? "").trim() || null,
          modePaiement: String(entree.get("modePaiement") ?? "ESPECES").trim(),
          numeroPiece: String(entree.get("numeroPiece") ?? "").trim() || null,
        }
      : entree;
  const dateSchema = z
    .string()
    .trim()
    .nullable()
    .refine(
      (v) => v === null || v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
      { message: "Date invalide (AAAA-MM-JJ)." },
    );
  const analyse = z
    .object({
      caisseId: idSchema,
      montant: montantSchema,
      motif: z.string().trim().min(2).max(300),
      dateMouvement: dateSchema.nullish(),
      membreId: idOpt,
      donateurTiers: texteOpt(150),
      modePaiement: z.enum(VALEURS_MODE_PAIEMENT),
      numeroPiece: texteOpt(80),
    })
    .safeParse(brut);
  if (!analyse.success) return echec("Don libre invalide.", "montant");
  try {
    const { caisse, mouvementCaisse } = delegateCaisse();
    const cible = await caisse.findUnique({ where: { id: analyse.data.caisseId } });
    if (!cible) return echec("Caisse introuvable.", "caisseId");
    if (analyse.data.membreId) {
      const membre = await prisma.membre.findUnique({
        where: { id: analyse.data.membreId },
        // Contrôle d'existence uniquement : on n'a pas besoin de charger la
        // photo (data URL volumineuse) ni le reste de la fiche.
        select: { id: true },
      });

      if (!membre) return echec("Membre introuvable.", "membreId");
    }
    const dateMouvement = analyse.data.dateMouvement
      ? new Date(`${analyse.data.dateMouvement}T12:00:00`)
      : undefined;
    await mouvementCaisse.create({
      data: {
        caisseId: analyse.data.caisseId,
        type: "DON_LIBRE",
        montant: analyse.data.montant,
        sens: "ENTREE",
        motif: analyse.data.motif,
        membreId: analyse.data.membreId ?? null,
        donateurTiers: analyse.data.donateurTiers ?? null,
        modePaiement: analyse.data.modePaiement,
        numeroPiece: analyse.data.numeroPiece ?? null,
        ...(dateMouvement ? { dateMouvement } : {}),
      },
    });
    await caisse.update({
      where: { id: analyse.data.caisseId },
      data: { soldeActuel: versNombreCaisse(cible.soldeActuel) + analyse.data.montant },
    });
    revalider();
    return ok(
      `Don libre de ${formatMontant(analyse.data.montant)} FCFA enregistré en « ${String(cible.nom)} ».`,
    );
  } catch (erreur) {
    console.error("Erreur enregistrerDonLibreCaisse :", erreur);
    return echec("Enregistrement impossible.");
  }
}

export async function transfererCotisationVersCaisse(
  entree: FormData | { cotisationId: string; caisseId: string; montant: number; motif: string },
): Promise<CaisseFormState> {
  const droitTransfert = await verifierDroitCaisses();
  if (droitTransfert) return droitTransfert;
  const garde = indisponible();
  if (garde) return garde;
  const brut =
    entree instanceof FormData
      ? {
          cotisationId: String(entree.get("cotisationId") ?? "").trim(),
          caisseId: String(entree.get("caisseId") ?? "").trim(),
          montant: entree.get("montant"),
          motif: String(entree.get("motif") ?? "").trim(),
        }
      : entree;
  const analyse = z
    .object({
      cotisationId: idSchema,
      caisseId: idSchema,
      montant: montantSchema,
      motif: z.string().trim().min(2).max(300),
    })
    .safeParse(brut);
  if (!analyse.success) return echec("Transfert invalide.", "montant");
  try {
    const solde = await calculerSoldeCotisation(analyse.data.cotisationId);
    if (!solde) return echec("Cotisation introuvable.", "cotisationId");
    if (analyse.data.montant - solde.soldeDisponible > 0.005) {
      return echec(
        `Fonds insuffisants : « ${solde.nom} » dispose de ${formatMontant(Math.max(solde.soldeDisponible, 0))} FCFA.`,
        "montant",
      );
    }
    const { caisse, mouvementCaisse } = delegateCaisse();
    const cible = await caisse.findUnique({ where: { id: analyse.data.caisseId } });
    if (!cible) return echec("Caisse introuvable.", "caisseId");
    await mouvementCaisse.create({
      data: {
        caisseId: analyse.data.caisseId,
        type: "TRANSFERT_COTISATION",
        montant: analyse.data.montant,
        sens: "ENTREE",
        motif: analyse.data.motif,
        cotisationId: analyse.data.cotisationId,
      },
    });
    await caisse.update({
      where: { id: analyse.data.caisseId },
      data: { soldeActuel: versNombreCaisse(cible.soldeActuel) + analyse.data.montant },
    });
    revalider();
    return ok(
      `${formatMontant(analyse.data.montant)} FCFA transférés de « ${solde.nom} » vers « ${String(cible.nom)} ».`,
    );
  } catch (erreur) {
    console.error("Erreur transfererCotisationVersCaisse :", erreur);
    return echec("Transfert impossible.");
  }
}

export async function completerCotisationDepuisCaisse(
  entree: FormData | { caisseId: string; cotisationId: string; montant: number; motif: string },
): Promise<CaisseFormState> {
  const droitComplement = await verifierDroitCaisses();
  if (droitComplement) return droitComplement;
  const garde = indisponible();
  if (garde) return garde;
  const brut =
    entree instanceof FormData
      ? {
          caisseId: String(entree.get("caisseId") ?? "").trim(),
          cotisationId: String(entree.get("cotisationId") ?? "").trim(),
          montant: entree.get("montant"),
          motif: String(entree.get("motif") ?? "").trim(),
        }
      : entree;
  const analyse = z
    .object({
      caisseId: idSchema,
      cotisationId: idSchema,
      montant: montantSchema,
      motif: z.string().trim().min(2).max(300),
    })
    .safeParse(brut);
  if (!analyse.success) return echec("Complément invalide.", "montant");
  try {
    const { caisse, mouvementCaisse } = delegateCaisse();
    const cible = await caisse.findUnique({ where: { id: analyse.data.caisseId } });
    if (!cible) return echec("Caisse introuvable.", "caisseId");
    const soldeCaisse = versNombreCaisse(cible.soldeActuel);
    if (analyse.data.montant - soldeCaisse > 0.005) {
      return echec(
        `Solde insuffisant : « ${String(cible.nom)} » dispose de ${formatMontant(Math.max(soldeCaisse, 0))} FCFA.`,
        "montant",
      );
    }
    const cotisation = await prisma.cotisation.findUnique({ where: { id: analyse.data.cotisationId } });
    if (!cotisation) return echec("Cotisation introuvable.", "cotisationId");
    await mouvementCaisse.create({
      data: {
        caisseId: analyse.data.caisseId,
        type: "COMPLEMENT_COTISATION",
        montant: analyse.data.montant,
        sens: "SORTIE",
        motif: analyse.data.motif,
        cotisationId: analyse.data.cotisationId,
      },
    });
    await caisse.update({
      where: { id: analyse.data.caisseId },
      data: { soldeActuel: soldeCaisse - analyse.data.montant },
    });
    revalider();
    return ok(
      `${formatMontant(analyse.data.montant)} FCFA prélevés sur « ${String(cible.nom)} » pour abonder « ${cotisation.nom} ».`,
    );
  } catch (erreur) {
    console.error("Erreur completerCotisationDepuisCaisse :", erreur);
    return echec("Complément impossible.");
  }
}

/**
 * Ajuste le solde d'une caisse (inventaire physique / correction de solde).
 * Crée un mouvement de type `AJUSTEMENT` (ENTREE ou SORTIE) et met à jour
 * `soldeActuel` en conséquence.
 */
export async function ajusterSoldeCaisse(
  entree: FormData | {
    caisseId: string;
    montant: number;
    sens: "ENTREE" | "SORTIE";
    motif: string;
  },
): Promise<CaisseFormState> {
  const droitAjustement = await verifierDroitCaisses();
  if (droitAjustement) return droitAjustement;
  const garde = indisponible();
  if (garde) return garde;
  const brut =
    entree instanceof FormData
      ? {
          caisseId: String(entree.get("caisseId") ?? "").trim(),
          montant: entree.get("montant"),
          sens: String(entree.get("sens") ?? "ENTREE").trim(),
          motif: String(entree.get("motif") ?? "").trim(),
        }
      : entree;
  const analyse = z
    .object({
      caisseId: idSchema,
      montant: montantSchema,
      sens: z.enum(["ENTREE", "SORTIE"]),
      motif: z.string().trim().min(2).max(300),
    })
    .safeParse(brut);
  if (!analyse.success) return echec("Ajustement invalide.", "montant");
  try {
    const { caisse, mouvementCaisse } = delegateCaisse();
    const cible = await caisse.findUnique({ where: { id: analyse.data.caisseId } });
    if (!cible) return echec("Caisse introuvable.", "caisseId");
    const soldeAvant = versNombreCaisse(cible.soldeActuel);
    const soldeApres =
      analyse.data.sens === "ENTREE"
        ? soldeAvant + analyse.data.montant
        : Math.max(soldeAvant - analyse.data.montant, 0);
    await mouvementCaisse.create({
      data: {
        caisseId: analyse.data.caisseId,
        type: "AJUSTEMENT",
        montant: analyse.data.montant,
        sens: analyse.data.sens,
        motif: analyse.data.motif,
      },
    });
    await caisse.update({
      where: { id: analyse.data.caisseId },
      data: { soldeActuel: soldeApres },
    });
    await consignerAudit({
      action: "MODIFICATION",
      entite: "Caisse",
      entiteId: analyse.data.caisseId,
      details: `Solde ajusté (${analyse.data.sens === "ENTREE" ? "entrée" : "sortie"} de ${formatMontant(analyse.data.montant)} FCFA, motif : ${analyse.data.motif}) : ${formatMontant(soldeAvant)} FCFA → ${formatMontant(soldeApres)} FCFA.`,
    });
    revalider();
    return ok(
      `Solde de « ${String(cible.nom)} » ajusté : ${formatMontant(soldeAvant)} FCFA → ${formatMontant(soldeApres)} FCFA.`,
    );
  } catch (erreur) {
    console.error("Erreur ajusterSoldeCaisse :", erreur);
    return echec("Ajustement impossible.");
  }
}

/**
 * Virement interne entre deux caisses.
 * Débite la caisse source (SORTIE) et crédite la caisse destination (ENTREE),
 * tous deux de type `VIREMENT_INTERNE`. Les deux jambes sont liées via la
 * référence `numeroPiece` de la jambe destination.
 */
export async function virerEntreCaisses(
  entree: FormData | {
    caisseSourceId: string;
    caisseDestinationId: string;
    montant: number;
    motif: string;
  },
): Promise<CaisseFormState> {
  const droitVirement = await verifierDroitCaisses();
  if (droitVirement) return droitVirement;
  const garde = indisponible();
  if (garde) return garde;
  const brut =
    entree instanceof FormData
      ? {
          caisseSourceId: String(entree.get("caisseSourceId") ?? "").trim(),
          caisseDestinationId: String(entree.get("caisseDestinationId") ?? "").trim(),
          montant: entree.get("montant"),
          motif: String(entree.get("motif") ?? "").trim(),
        }
      : entree;
  const analyse = z
    .object({
      caisseSourceId: idSchema,
      caisseDestinationId: idSchema,
      montant: montantSchema,
      motif: z.string().trim().min(2).max(300),
    })
    .safeParse(brut);
  if (!analyse.success) return echec("Virement invalide.", "montant");
  if (analyse.data.caisseSourceId === analyse.data.caisseDestinationId) {
    return echec("La caisse source et la caisse destination doivent différer.", "caisseDestinationId");
  }
  try {
    const { caisse, mouvementCaisse } = delegateCaisse();
    const source = await caisse.findUnique({ where: { id: analyse.data.caisseSourceId } });
    if (!source) return echec("Caisse source introuvable.", "caisseSourceId");
    const destination = await caisse.findUnique({ where: { id: analyse.data.caisseDestinationId } });
    if (!destination) return echec("Caisse destination introuvable.", "caisseDestinationId");
    const soldeSource = versNombreCaisse(source.soldeActuel);
    if (analyse.data.montant - soldeSource > 0.005) {
      return echec(
        `Solde insuffisant : « ${String(source.nom)} » dispose de ${formatMontant(Math.max(soldeSource, 0))} FCFA.`,
        "montant",
      );
    }
    // Jambes de sortie sur la caisse source.
    const mouvementSortie = await mouvementCaisse.create({
      data: {
        caisseId: analyse.data.caisseSourceId,
        type: "VIREMENT_INTERNE",
        montant: analyse.data.montant,
        sens: "SORTIE",
        motif: analyse.data.motif,
      },
    });
    // Jambes d'entrée sur la caisse destination, liée à la jambe de sortie.
    await mouvementCaisse.create({
      data: {
        caisseId: analyse.data.caisseDestinationId,
        type: "VIREMENT_INTERNE",
        montant: analyse.data.montant,
        sens: "ENTREE",
        motif: analyse.data.motif,
        numeroPiece: `VIR-${mouvementSortie.id}`,
      },
    });
    await caisse.update({
      where: { id: analyse.data.caisseSourceId },
      data: { soldeActuel: soldeSource - analyse.data.montant },
    });
    const soldeDest = versNombreCaisse(destination.soldeActuel);
    await caisse.update({
      where: { id: analyse.data.caisseDestinationId },
      data: { soldeActuel: soldeDest + analyse.data.montant },
    });
    await consignerAudit({
      action: "VIREMENT",
      entite: "Caisse",
      entiteId: analyse.data.caisseSourceId,
      details: `${formatMontant(analyse.data.montant)} FCFA virés de « ${String(
        source.nom,
      )} » vers « ${String(destination.nom)} » (${analyse.data.motif}).`,
    });
    revalider();
    return ok(
      `${formatMontant(analyse.data.montant)} FCFA virés de « ${String(
        source.nom,
      )} » vers « ${String(destination.nom)} ».`,
    );
  } catch (erreur) {
    console.error("Erreur virerEntreCaisses :", erreur);
    return echec("Virement impossible.");
  }
}

/**
 * Modifie une caisse (Nom, Code, Description, Soldes).
 * Reserve aux roles Tresorier / Administrateur.
 */
export async function modifierCaisse(
  id: string,
  entree:
    | FormData
    | {
        nom: string;
        code?: string | null;
        description?: string | null;
        soldeInitial?: number;
        soldeActuel?: number;
      },
): Promise<CaisseFormState> {
  const droit = await verifierDroitCaisses();
  if (droit) return droit;
  const garde = indisponible();
  if (garde) return garde;
  const idAnalyse = idSchema.safeParse(id);
  if (!idAnalyse.success) return echec("Identifiant de caisse manquant.", "caisseId");
  const brut =
    entree instanceof FormData
      ? {
          nom: String(entree.get("nom") ?? "").trim(),
          code: String(entree.get("code") ?? "").trim() || null,
          description: String(entree.get("description") ?? "").trim() || null,
          soldeInitial: entree.get("soldeInitial"),
          soldeActuel: entree.get("soldeActuel"),
        }
      : entree;
  const soldeSchema = z.preprocess(
    (v) =>
      v === null || v === undefined || v === ""
        ? undefined
        : typeof v === "string"
          ? Number(v.trim().replace(",", "."))
          : v,
    z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1_000_000_000, {
      message: "Solde invalide.",
    }).optional(),
  );
  const analyse = z
    .object({
      nom: z.string().trim().min(2, "Nom de caisse trop court.").max(80),
      code: texteOpt(30),
      description: texteOpt(300),
      soldeInitial: soldeSchema,
      soldeActuel: soldeSchema,
    })
    .safeParse(brut);
  if (!analyse.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of analyse.error.issues) {
      const cle = issue.path.length > 0 ? issue.path.join(".") : "_form";
      (fieldErrors[cle] ??= []).push(issue.message);
    }
    return { success: false, message: "Formulaire invalide.", fieldErrors };
  }
  try {
    const { caisse } = delegateCaisse();
    const cible = await caisse.findUnique({ where: { id: idAnalyse.data } });
    if (!cible) return echec("Caisse introuvable.", "caisseId");
    const data: Record<string, unknown> = {
      nom: analyse.data.nom,
      code: analyse.data.code ?? null,
      description: analyse.data.description ?? null,
    };
    if (analyse.data.soldeInitial !== undefined) data.soldeInitial = analyse.data.soldeInitial;
    if (analyse.data.soldeActuel !== undefined) data.soldeActuel = analyse.data.soldeActuel;
    await caisse.update({ where: { id: idAnalyse.data }, data });
    await consignerAudit({
      action: "MODIFICATION",
      entite: "Caisse",
      entiteId: idAnalyse.data,
      details: `Caisse « ${String(cible.nom)} » modifiee -> « ${analyse.data.nom} ».`,
    });
    revalider();
    return ok(`La caisse « ${analyse.data.nom} » a ete modifiee.`);
  } catch (erreur) {
    console.error("Erreur modifierCaisse :", erreur);
    return echec("Modification impossible (base injoignable).");
  }
}
// FIN-MODIFIER-CAISSE

/**
 * Marque une caisse comme caisse par defaut pour les encaissements.
 * Reserve aux roles Tresorier / Administrateur.
 */
export async function definirCaisseParDefaut(id: string): Promise<CaisseFormState> {
  const droit = await verifierDroitCaisses();
  if (droit) return droit;
  const garde = indisponible();
  if (garde) return garde;
  const idAnalyse = idSchema.safeParse(id);
  if (!idAnalyse.success) return echec("Identifiant de caisse manquant.", "caisseId");
  try {
    const { caisse } = delegateCaisse();
    const cible = await caisse.findUnique({ where: { id: idAnalyse.data } });
    if (!cible) return echec("Caisse introuvable.", "caisseId");
    await caisse.updateMany({ data: { estParDefaut: false } });
    await caisse.update({ where: { id: idAnalyse.data }, data: { estParDefaut: true } });
    await consignerAudit({
      action: "MODIFICATION",
      entite: "Caisse",
      entiteId: idAnalyse.data,
      details: `Caisse « ${String(cible.nom)} » definie comme caisse par defaut.`,
    });
    revalider();
    return ok(`« ${String(cible.nom)} » est desormais la caisse par defaut.`);
  } catch (erreur) {
    console.error("Erreur definirCaisseParDefaut :", erreur);
    return echec("Operation impossible (base injoignable).");
  }
}
// FIN-DEFAUT-CAISSE

/**
 * Supprime une caisse sans aucun mouvement lie.
 * Reserve aux roles Tresorier / Administrateur.
 */
export async function supprimerCaisse(id: string): Promise<CaisseFormState> {
  const droit = await verifierDroitCaisses();
  if (droit) return droit;
  const garde = indisponible();
  if (garde) return garde;
  const idAnalyse = idSchema.safeParse(id);
  if (!idAnalyse.success) return echec("Identifiant de caisse manquant.", "caisseId");
  try {
    const { caisse, mouvementCaisse } = delegateCaisse();
    const cible = await caisse.findUnique({ where: { id: idAnalyse.data } });
    if (!cible) return echec("Caisse introuvable.", "caisseId");
    const nb = await mouvementCaisse.count({ where: { caisseId: idAnalyse.data } }).catch(() => 0);
    if (nb > 0) {
      return echec(`Suppression impossible : « ${String(cible.nom)} » a ${nb} mouvement(s) lie(s).`);
    }
    if (Boolean(cible.estParDefaut)) {
      const autres = await caisse.findMany().catch(() => []);
      if (autres.length > 1) {
        return echec("Suppression impossible : choisissez d'abord une autre caisse par defaut.", "caisseId");
      }
    }
    await caisse.delete({ where: { id: idAnalyse.data } });
    await consignerAudit({
      action: "SUPPRESSION",
      entite: "Caisse",
      entiteId: idAnalyse.data,
      details: `Caisse « ${String(cible.nom)} » supprimee.`,
    });
    revalider();
    return ok(`La caisse « ${String(cible.nom)} » a ete supprimee.`);
  } catch (erreur) {
    console.error("Erreur supprimerCaisse :", erreur);
    return echec("Suppression impossible (base injoignable).");
  }
}
