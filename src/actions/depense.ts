"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  VALEURS_CATEGORIE_CAISSE,
  VALEURS_MODE_PAIEMENT,
  VALEURS_TYPE_DEPENSE,
  formatMontant,
} from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { exigerTresorierOuAdmin } from "@/lib/garde-actions";
import type { DepenseFormState } from "@/types/depense";
import { Prisma } from "@/generated/prisma/client";
import type {
  CategorieCaisse,
  ModePaiement,
  TypeDepense,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Schémas Zod
// ---------------------------------------------------------------------------

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Montant strictement positif, 2 décimales max. Accepte la saisie texte du
 * formulaire (« 25000,50 ») comme un nombre déjà converti.
 */
const montantSchema = z.preprocess(
  (valeur) =>
    typeof valeur === "string"
      ? Number(valeur.trim().replace(",", "."))
      : valeur,
  z
    .number({
      message: "Montant invalide : saisissez un nombre (ex. 25000 ou 25000.50).",
    })
    .refine(
      (valeur) => Number.isFinite(valeur) && valeur > 0 && valeur <= 1_000_000_000,
      "Le montant doit être compris entre 0 (exclus) et 1 000 000 000.",
    ),
);

const dateSchema = z
  .string()
  .trim()
  .regex(DATE_ISO_REGEX, "Date invalide (format AAAA-MM-JJ).")
  .refine((valeur) => !Number.isNaN(Date.parse(valeur)), "Date invalide.");

const modePaiementSchema = z.enum(VALEURS_MODE_PAIEMENT, {
  message: "Mode de paiement inconnu.",
});

const typeDepenseSchema = z.enum(VALEURS_TYPE_DEPENSE, {
  message: "Type de dépense inconnu.",
});

const caisseSourceSchema = z.enum(VALEURS_CATEGORIE_CAISSE, {
  message: "Caisse interne inconnue.",
});

const identifiantSchema = z.string().trim().min(1, "Identifiant manquant.");

const identifiantOptionnelSchema = z
  .string()
  .trim()
  .min(1, "Identifiant manquant.")
  .nullish();

const depenseSchema = z.object({
  exerciceId: identifiantSchema,
  libelle: z
    .string()
    .trim()
    .min(2, "Le libellé doit contenir au moins 2 caractères.")
    .max(150, "Le libellé ne peut pas dépasser 150 caractères."),
  description: z
    .string()
    .trim()
    .max(500, "La description ne peut pas dépasser 500 caractères.")
    .nullish(),
  montant: montantSchema,
  dateDepense: dateSchema.nullish(),
  modePaiement: modePaiementSchema,
  numeroPiece: z
    .string()
    .trim()
    .max(80, "Le n° de pièce ne peut pas dépasser 80 caractères.")
    .nullish(),
  type: typeDepenseSchema,
  caisseSource: caisseSourceSchema,
  caisseId: identifiantOptionnelSchema,
  cotisationId: identifiantOptionnelSchema,
  beneficiaireMembreId: identifiantOptionnelSchema,
  beneficiaireTiers: z
    .string()
    .trim()
    .max(150, "Le bénéficiaire tiers ne peut pas dépasser 150 caractères.")
    .nullish(),
});

type SaisieDepense = z.output<typeof depenseSchema>;

/**
 * Entrée acceptée par les actions d'écriture : le `FormData` du formulaire
 * ou un objet déjà typé (appel programmatique côté serveur).
 */
type EntreeDepense = FormData | SaisieDepense;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function versFieldErrors(erreur: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of erreur.issues) {
    const cle = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[cle] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function echecValidation(erreur: z.ZodError): DepenseFormState {
  return {
    success: false,
    message: "Le formulaire contient des erreurs. Vérifiez les champs signalés.",
    fieldErrors: versFieldErrors(erreur),
  };
}

function echec(message: string, champ = "_form"): DepenseFormState {
  return { success: false, message, fieldErrors: { [champ]: [message] } };
}

function erreurServeur(contexte: string, erreur: unknown): DepenseFormState {
  console.error(`Erreur serveur (${contexte}) :`, erreur);
  return {
    success: false,
    message:
      "Une erreur est survenue lors de l'enregistrement. Vérifiez la connexion à la base de données.",
    fieldErrors: { _form: ["Erreur serveur lors de l'enregistrement."] },
  };
}

/** Date de dépense : fournie par le formulaire ou aujourd'hui. */
function resoudreDate(valeur: string | null | undefined): Date {
  return valeur ? new Date(`${valeur}T12:00:00`) : new Date();
}

function revaliderDepenses(): void {
  revalidatePath("/finances/depenses");
  revalidatePath("/finances");
  revalidatePath("/rapports");
}

/** Lit un champ textuel (FormData ou objet) et le normalise. */
function versTexte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

/** Champs facultatifs : chaîne vide et absences deviennent `null`. */
function versTexteOptionnel(valeur: unknown): string | null {
  const texte = versTexte(valeur);
  return texte === "" ? null : texte;
}

/** Aplatit l'entrée (FormData ou objet) en brut contrôlable par Zod. */
function versDonneesBrutes(entree: EntreeDepense): Record<string, unknown> {
  if (entree instanceof FormData) {
    return {
      exerciceId: versTexte(entree.get("exerciceId")),
      libelle: versTexte(entree.get("libelle")),
      description: versTexteOptionnel(entree.get("description")),
      montant: entree.get("montant"),
      dateDepense: versTexteOptionnel(entree.get("dateDepense")),
      modePaiement: versTexte(entree.get("modePaiement")),
      numeroPiece: versTexteOptionnel(entree.get("numeroPiece")),
      type: versTexte(entree.get("type")) || "CAISSE_DIRECTE",
      caisseSource: versTexte(entree.get("caisseSource")) || "GENERALE",
      caisseId: versTexteOptionnel(entree.get("caisseId")),
      cotisationId: versTexteOptionnel(entree.get("cotisationId")),
      beneficiaireMembreId: versTexteOptionnel(entree.get("beneficiaireMembreId")),
      beneficiaireTiers: versTexteOptionnel(entree.get("beneficiaireTiers")),
    };
  }

  return { ...entree };
}

/**
 * Données normalisées prêtes pour Prisma (création comme mise à jour).
 * Le type est aligné sur `Prisma.DepenseUncheckedCreateInput` afin d'éviter
 * tout transtypage non contrôlé (`as any`) lors des écritures.
 */
type DonneesDepense = {
  libelle: string;
  description: string | null;
  montant: number;
  dateDepense: Date;
  modePaiement: ModePaiement;
  numeroPiece: string | null;
  type: TypeDepense;
  caisseSource: CategorieCaisse;
  caisseId: string | null;
  cotisationId: string | null;
  beneficiaireMembreId: string | null;
  beneficiaireTiers: string | null;
  exerciceId: string;
};

type ResultatValidation =
  | { ok: true; donnees: DonneesDepense }
  | { ok: false; etat: DepenseFormState };

function donneesPrisma(donnees: DonneesDepense): Prisma.DepenseUncheckedCreateInput {
  return {
    libelle: donnees.libelle,
    description: donnees.description,
    montant: donnees.montant,
    dateDepense: donnees.dateDepense,
    modePaiement: donnees.modePaiement,
    numeroPiece: donnees.numeroPiece,
    type: donnees.type,
    caisseSource: donnees.caisseSource,
    ...(donnees.caisseId ? { caisseId: donnees.caisseId } : {}),
    cotisationId: donnees.cotisationId,
    beneficiaireMembreId: donnees.beneficiaireMembreId,
    beneficiaireTiers: donnees.beneficiaireTiers,
    exerciceId: donnees.exerciceId,
  };
}

async function debiterCaisse(caisseId: string | null, montant: number): Promise<void> {
  if (!caisseId) return;
  const { tablesCaissesDisponibles, versNombreCaisse } = await import("@/lib/caisse");
  if (!tablesCaissesDisponibles()) return;
  const delegate = (
    prisma as unknown as {
      caisse: {
        findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
        update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      };
    }
  ).caisse;
  const caisse = await delegate.findUnique({ where: { id: caisseId } }).catch(() => null);
  if (!caisse) return;
  await delegate
    .update({
      where: { id: caisseId },
      data: { soldeActuel: versNombreCaisse(caisse.soldeActuel) - montant },
    })
    .catch(() => null);
}

async function rembourserCaisse(caisseId: string | null, montant: number): Promise<void> {
  if (!caisseId) return;
  const { tablesCaissesDisponibles, versNombreCaisse } = await import("@/lib/caisse");
  if (!tablesCaissesDisponibles()) return;
  const delegate = (
    prisma as unknown as {
      caisse: {
        findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
        update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      };
    }
  ).caisse;
  const caisse = await delegate.findUnique({ where: { id: caisseId } }).catch(() => null);
  if (!caisse) return;
  await delegate
    .update({
      where: { id: caisseId },
      data: { soldeActuel: versNombreCaisse(caisse.soldeActuel) + montant },
    })
    .catch(() => null);
}

function lireCaisseId(depense: unknown): string | null {
  if (!depense || typeof depense !== "object") return null;
  const valeur = (depense as Record<string, unknown>).caisseId;
  return typeof valeur === "string" && valeur.trim() !== "" ? valeur : null;
}

// ---------------------------------------------------------------------------
// Contrôles métier partagés (création / rectification)
// ---------------------------------------------------------------------------

/**
 * Contrôles communs à la création et à la rectification :
 *
 *  • nature de la dépense (un décaissement affecté exige une cotisation) ;
 *  • bénéficiaire (membre enregistré OU tiers externe, au moins l'un des deux) ;
 *  • existence de la cotisation et appartenance à l'exercice soumis ;
 *  • cohérence du décaissement : le cumul des dépenses de la cotisation ne
 *    peut pas dépasser le total réellement collecté (versements encaissés) ;
 *  • exercice non clôturé.
 *
 * `depenseExclueId` ignore la dépense en cours de rectification lors du
 * calcul du cumul déjà décaissé.
 */
async function validerSaisie(
  saisie: SaisieDepense,
  depenseExclueId: string | null,
): Promise<ResultatValidation> {
  const montant = saisie.montant;
  const type = saisie.type;
  const cotisationId = saisie.cotisationId ?? null;
  const beneficiaireMembreId = saisie.beneficiaireMembreId ?? null;
  const beneficiaireTiers = saisie.beneficiaireTiers ?? null;
  const exerciceId = saisie.exerciceId;
  const caisseId = saisie.caisseId ?? null;

  // 1. Nature du décaissement.
  if (type === "AFFECTEE_COTISATION" && !cotisationId) {
    return {
      ok: false,
      etat: echec(
        "Sélectionnez la cotisation ou le projet financé par ce décaissement.",
        "cotisationId",
      ),
    };
  }

  // 2. Bénéficiaire : membre de l'église OU tiers externe.
  if (!beneficiaireMembreId && !beneficiaireTiers) {
    return {
      ok: false,
      etat: echec(
        "Renseignez le bénéficiaire : un membre de l'église ou un tiers externe.",
        "beneficiaireMembreId",
      ),
    };
  }

  if (beneficiaireMembreId) {
    const membre = await prisma.membre.findUnique({
      where: { id: beneficiaireMembreId },
      select: { id: true },
    });
    if (!membre) {
      return {
        ok: false,
        etat: echec("Le membre bénéficiaire est introuvable.", "beneficiaireMembreId"),
      };
    }
  }

  let cotisationFinaleId: string | null = null;
  let exerciceRetenuId = exerciceId;
  let caisseFinaleId: string | null = null;

  if (type === "AFFECTEE_COTISATION" && cotisationId) {
    // 3a. Cotisation financée : solde réel disponible (clôturée acceptée si solde > 0).
    const { calculerSoldeCotisation } = await import("@/lib/caisse");
    const cotisation = await prisma.cotisation.findUnique({
      where: { id: cotisationId },
      include: { exercice: { select: { id: true, libelle: true, cloture: true } } },
    });
    if (!cotisation) {
      return {
        ok: false,
        etat: echec("La cotisation sélectionnée est introuvable.", "cotisationId"),
      };
    }
    if (cotisation.exercice.id !== exerciceId) {
      return {
        ok: false,
        etat: echec(
          "La cotisation sélectionnée appartient à un autre exercice.",
          "cotisationId",
        ),
      };
    }
    if (cotisation.exercice.cloture) {
      return {
        ok: false,
        etat: echec(
          `L'exercice ${cotisation.exercice.libelle} est clôturé : aucune dépense ne peut y être enregistrée.`,
          "exerciceId",
        ),
      };
    }
    const solde = await calculerSoldeCotisation(cotisationId, depenseExclueId);
    if (!solde) {
      return {
        ok: false,
        etat: echec("La cotisation sélectionnée est introuvable.", "cotisationId"),
      };
    }
    // Tolérance d'un demi-centime sur les arrondis décimaux.
    if (montant - solde.soldeDisponible > 0.005) {
      return {
        ok: false,
        etat: echec(
          `Décaissement incohérent : « ${solde.nom} » ne dispose que de ${formatMontant(Math.max(solde.soldeDisponible, 0))} FCFA (collecte ${formatMontant(solde.totalCollecte)} FCFA, compléments ${formatMontant(solde.totalComplementRecu)} FCFA, déjà consommé ${formatMontant(solde.totalDepenseImputee + solde.totalTransfertVersCaisse)} FCFA).`,
          "montant",
        ),
      };
    }

    cotisationFinaleId = cotisationId;
    exerciceRetenuId = cotisation.exercice.id;
  } else {
    // 3b. Sortie de caisse interne : exercice ouvert + caisse débitée.
    const exercice = await prisma.exercice.findUnique({ where: { id: exerciceId } });
    if (!exercice) {
      return { ok: false, etat: echec("Exercice introuvable.", "exerciceId") };
    }
    if (exercice.cloture) {
      return {
        ok: false,
        etat: echec(
          `L'exercice ${exercice.libelle} est clôturé : aucune dépense ne peut y être enregistrée.`,
          "exerciceId",
        ),
      };
    }
    const { tablesCaissesDisponibles, versNombreCaisse } = await import("@/lib/caisse");
    if (tablesCaissesDisponibles()) {
      const delegate = (
        prisma as unknown as {
          caisse: {
            findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
          };
        }
      ).caisse;
      if (caisseId) {
        const caisse = await delegate.findUnique({ where: { id: caisseId } });
        if (!caisse) {
          return { ok: false, etat: echec("Caisse introuvable.", "caisseId") };
        }
        const soldeCaisse = versNombreCaisse(caisse.soldeActuel);
        if (montant - soldeCaisse > 0.005) {
          return {
            ok: false,
            etat: echec(
              `Solde insuffisant : « ${String(caisse.nom)} » ne dispose que de ${formatMontant(Math.max(soldeCaisse, 0))} FCFA.`,
              "montant",
            ),
          };
        }
        caisseFinaleId = caisseId;
      }
    }
  }

  return {
    ok: true,
    donnees: {
      libelle: saisie.libelle,
      description: saisie.description ?? null,
      montant,
      dateDepense: resoudreDate(saisie.dateDepense),
      modePaiement: saisie.modePaiement,
      numeroPiece: saisie.numeroPiece ?? null,
      type,
      // Une dépense affectée puise dans la cotisation, pas dans une caisse interne.
      caisseSource: type === "AFFECTEE_COTISATION" ? "GENERALE" : saisie.caisseSource,
      caisseId: caisseFinaleId,
      cotisationId: cotisationFinaleId,
      // Le membre prime ; sinon le tiers externe renseigné.
      beneficiaireMembreId,
      beneficiaireTiers: beneficiaireMembreId ? null : beneficiaireTiers,
      exerciceId: exerciceRetenuId,
    },
  };
}

// ---------------------------------------------------------------------------
// Server Actions — dépenses
// ---------------------------------------------------------------------------

/**
 * Enregistre une dépense (décaissement) après validation Zod et contrôles
 * métier : cotisation existante, cumul décaissé cohérent avec le total
 * collecté, bénéficiaire renseigné et exercice ouvert.
 */
export async function enregistrerDepense(
  entree: EntreeDepense,
): Promise<DepenseFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const analyse = depenseSchema.safeParse(versDonneesBrutes(entree));
  if (!analyse.success) return echecValidation(analyse.error);

  try {
    const validation = await validerSaisie(analyse.data, null);
    if (!validation.ok) return validation.etat;

    await prisma.depense.create({ data: donneesPrisma(validation.donnees) });
    await debiterCaisse(validation.donnees.caisseId, validation.donnees.montant);

    revaliderDepenses();
    return {
      success: true,
      message: `La dépense « ${validation.donnees.libelle} » (${formatMontant(validation.donnees.montant)} FCFA) a été enregistrée.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("enregistrerDepense", erreur);
  }
}

/**
 * Rectifie une erreur de saisie ou de montant : mêmes contrôles que la
 * création, la dépense en cours étant exclue du calcul du cumul décaissé.
 */
export async function modifierDepense(
  depenseId: string,
  entree: EntreeDepense,
): Promise<DepenseFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const identifiant = versTexte(depenseId);
  if (!identifiant) return echec("Identifiant de la dépense manquant.");

  const analyse = depenseSchema.safeParse(versDonneesBrutes(entree));
  if (!analyse.success) return echecValidation(analyse.error);

  try {
    const existante = await prisma.depense.findUnique({
      where: { id: identifiant },
      select: { id: true, exerciceId: true, montant: true },
    });
    if (!existante) return echec("Dépense introuvable.");
    if (existante.exerciceId !== analyse.data.exerciceId) {
      return echec(
        "Cette dépense appartient à un autre exercice : changez d'exercice pour la rectifier.",
        "exerciceId",
      );
    }

    const validation = await validerSaisie(analyse.data, identifiant);
    if (!validation.ok) return validation.etat;

    await prisma.depense.update({
      where: { id: identifiant },
      data: donneesPrisma(validation.donnees),
    });
    // Rembourse l'ancienne caisse (lecture tolérante si client non régénéré).
    let ancienneCaisse: string | null = null;
    try {
      const relue = await (prisma.depense.findUnique as unknown as (
        args: unknown,
      ) => Promise<Record<string, unknown> | null>)({
        where: { id: identifiant },
        select: { caisseId: true },
      });
      ancienneCaisse = lireCaisseId(relue);
    } catch {
      ancienneCaisse = null;
    }
    if (ancienneCaisse && ancienneCaisse !== validation.donnees.caisseId) {
      await rembourserCaisse(ancienneCaisse, Number(existante.montant));
    } else if (ancienneCaisse && validation.donnees.caisseId) {
      // Même caisse : on annule l'ancien débit avant d'appliquer le nouveau.
      await rembourserCaisse(ancienneCaisse, Number(existante.montant));
    }
    await debiterCaisse(validation.donnees.caisseId, validation.donnees.montant);

    revaliderDepenses();
    return {
      success: true,
      message: `La dépense « ${validation.donnees.libelle} » a été mise à jour.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("modifierDepense", erreur);
  }
}

/**
 * Supprime un décaissement (après confirmation côté interface) avec
 * réactualisation des pages Finances et Rapports.
 */
export async function supprimerDepense(depenseId: string): Promise<DepenseFormState> {
  const garde = await exigerTresorierOuAdmin();
  if (!garde.ok) {
    return { success: false, message: garde.message, fieldErrors: { _form: [garde.message] } };
  }
  const identifiant = versTexte(depenseId);
  if (!identifiant) return echec("Identifiant de la dépense manquant.");

  try {
    const depense = await prisma.depense.findUnique({
      where: { id: identifiant },
      include: { exercice: { select: { libelle: true, cloture: true } } },
    });
    if (!depense) return echec("Dépense introuvable.");
    if (depense.exercice.cloture) {
      return echec(
        `L'exercice ${depense.exercice.libelle} est clôturé : suppression impossible.`,
      );
    }

    await prisma.depense.delete({ where: { id: identifiant } });
    const caisseSupprimee = await lireCaisseId(depense);
    if (caisseSupprimee) await rembourserCaisse(caisseSupprimee, Number(depense.montant));

    revaliderDepenses();
    return {
      success: true,
      message: `La dépense « ${depense.libelle} » a été supprimée.`,
      fieldErrors: {},
    };
  } catch (erreur) {
    return erreurServeur("supprimerDepense", erreur);
  }
}



