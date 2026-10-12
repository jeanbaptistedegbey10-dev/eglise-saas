import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Church, Mail, MapPin, Phone } from "lucide-react";

import MembreDetailTabs from "@/components/membres/MembreDetailTabs";
import MembreFormModal from "@/components/membres/MembreFormModal";
import { formatDateISO, libelleModePaiement, parseDonneesEcclesiastiques } from "@/lib/membre";
import { prisma } from "@/lib/prisma";
import type { AideFiche, FicheMembre, MembreEditable, PaiementFiche } from "@/types/membre";

export const metadata: Metadata = {
  title: "Fiche membre",
  description: "Fiche 360° d'un membre : données, contributions et solidarités reçues.",
};

// La fiche est rendue à chaque requête (pas de génération statique au build :
// elle dépend d'une base de données accessible uniquement en exécution).
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

/** Format lisible d'une date (côté serveur, pour éviter tout décalage d'hydratation). */
function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function FicheMembrePage({ params }: Props) {
  const { id } = await params;

  let membre: FicheMembre | null = null;
  let erreurBase: string | null = null;

  try {
    membre = await prisma.membre.findUnique({
      where: { id },
      include: {
        paiements: {
          orderBy: { datePaiement: "desc" },
          include: { typeCotisation: true, exercice: true },
        },
        aidesRecues: { orderBy: { dateDistribution: "desc" } },
      },
    });
  } catch (error) {
    console.error("Erreur lors du chargement de la fiche membre :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  if (erreurBase) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
        <Link
          href="/membres"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux membres
        </Link>
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"
        >
          {erreurBase}
        </div>
      </div>
    );
  }

  if (!membre) notFound();


  // ---------------------------------------------------------------------
  // Sérialisation des données (objets simples uniquement, pour le transfert
  // vers les composants clients).
  // ---------------------------------------------------------------------
  const modifiable: MembreEditable = {
    id: membre.id,
    nom: membre.nom,
    prenoms: membre.prenoms,
    telephone: membre.telephone,
    email: membre.email,
    adresse: membre.adresse,
    profession: membre.profession,
    donneesEcclesiastiques: membre.donneesEcclesiastiques,
  };

  const donnees = parseDonneesEcclesiastiques(membre.donneesEcclesiastiques);
  const initiales = `${membre.prenoms.charAt(0)}${membre.nom.charAt(0)}`.toUpperCase();

  const paiements: PaiementFiche[] = membre.paiements.map((paiement) => ({
    id: paiement.id,
    dateAffichee: formatDate(paiement.datePaiement),
    montant: Number(paiement.montant),
    modePaiement: libelleModePaiement(paiement.modePaiement),
    typeCotisation: paiement.typeCotisation.libelle,
    exercice: paiement.exercice.annee,
    commentaire: paiement.commentaire,
  }));

  const aides: AideFiche[] = membre.aidesRecues.map((aide) => ({
    id: aide.id,
    dateAffichee: formatDate(aide.dateDistribution),
    motif: aide.motif,
    montantOuNature: aide.montantOuNature,
    notesConflictuelles: aide.notesConflictuelles,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <nav aria-label="Fil d'ariane">
        <Link
          href="/membres"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux membres
        </Link>
      </nav>

      {/* En-tête de la fiche */}
      <header className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-xl font-semibold text-accent">
            {initiales}
          </span>

          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                Fiche membre 360°
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {membre.nom} {membre.prenoms}
              </h1>
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                {membre.telephone}
              </li>
              {membre.email && (
                <li className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {membre.email}
                </li>
              )}
              {membre.profession && (
                <li className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {membre.profession}
                </li>
              )}
              {membre.adresse && (
                <li className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {membre.adresse}
                </li>
              )}
            </ul>
          </div>
        </div>

        <MembreFormModal membre={modifiable} triggerLabel="Modifier la fiche" variant="secondary" />
      </header>


      {/* Données ecclésiastiques */}
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Church className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Données ecclésiastiques</h2>
        </div>

        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Baptême
            </dt>
            <dd>
              <span
                className={
                  donnees.bapteme
                    ? "inline-flex rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-accent"
                    : "inline-flex rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                }
              >
                {donnees.bapteme ? "Baptisé(e)" : "Non renseigné"}
              </span>
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Date de baptême
            </dt>
            <dd className="text-sm text-foreground">
              {donnees.dateBapteme ? formatDateISO(donnees.dateBapteme) : "—"}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fonctions
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {donnees.fonctions && donnees.fonctions.length > 0 ? (
                donnees.fonctions.map((fonction) => (
                  <span
                    key={fonction}
                    className="rounded-full border border-card-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {fonction}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* 2 grands onglets : contributions / solidarité */}
      <MembreDetailTabs paiements={paiements} aides={aides} />
    </div>
  );
}

