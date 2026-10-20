import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Church,
  Heart,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";

import ActionsLienReleve from "@/components/membres/ActionsLienReleve";
import MembreFormModal from "@/components/membres/MembreFormModal";
import PhotoPreview from "@/components/membres/PhotoPreview";
import { formatDateISO, parseDonneesEcclesiastiques } from "@/lib/membre";
import { prisma } from "@/lib/prisma";
import type { FicheMembre, MembreEditable } from "@/types/membre";
import { libelleRole } from "@/types/organisation";

export const metadata: Metadata = {
  title: "Fiche membre",
  description: "Fiche communautaire du membre : état civil, parcours ecclésiastique et rattachements.",
};

// La fiche est rendue à chaque requête (pas de génération statique au build :
// elle dépend d'une base de données accessible uniquement en exécution).
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FicheMembrePage({ params }: Props) {
  const { id } = await params;

  let membre: FicheMembre | null = null;
  let erreurBase: string | null = null;

  try {
    membre = await prisma.membre.findUnique({
      where: { id },
      include: {
        affectationsDepartement: {
          include: { departement: true },
          orderBy: { departement: { nom: "asc" } },
        },
        affectationsGroupe: {
          include: { groupe: true },
          orderBy: { groupe: { nom: "asc" } },
        },
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
    photoDataUrl: membre.photoDataUrl,
  };

  const donnees = parseDonneesEcclesiastiques(membre.donneesEcclesiastiques);
  const initiales = `${membre.prenoms.charAt(0)}${membre.nom.charAt(0)}`.toUpperCase();

  // Lien public du relevé annuel (jeton unique par membre) — partageable via
  // « Copier le lien » et ouvrable directement depuis la fiche.
  const urlReleve = `/releve/${membre.tokenConsultation}`;

  // Départements d'appartenance (objets département uniques)
  const departements = [
    ...new Map(
      membre.affectationsDepartement.map((a) => [a.departement.id, a.departement])
    ).values(),
  ];

  // Groupes / sous-groupes d'activité (objets groupe uniques)
  const groupes = [
    ...new Map(
      membre.affectationsGroupe.map((a) => [a.groupe.id, a.groupe])
    ).values(),
  ];

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
          <PhotoPreview
            photoDataUrl={membre.photoDataUrl}
            initiales={initiales}
            nomComplet={`${membre.nom} ${membre.prenoms}`}
            taille="lg"
          />

          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                Fiche membre 360°
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {membre.nom} {membre.prenoms}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <MembreFormModal membre={modifiable} triggerLabel="Modifier la fiche" variant="secondary" />
          <ActionsLienReleve membreId={membre.id} urlReleve={urlReleve} />
        </div>
      </header>


      {/* Bloc 1 : Coordonnées & État civil */}
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Coordonnées & État civil</h2>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nom complet
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {membre.prenoms} {membre.nom}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Civilité
            </dt>
            <dd className="text-sm text-foreground">
              {donnees.sexe === "Masculin" ? "M." : donnees.sexe === "Féminin" ? "Mme" : "—"}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sexe
            </dt>
            <dd className="text-sm text-foreground">
              {donnees.sexe ?? "—"}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Date de naissance
            </dt>
            <dd className="text-sm text-foreground">
              {donnees.dateNaissance ? formatDateISO(donnees.dateNaissance) : "—"}
            </dd>
          </div>

          {donnees.dateNaissance && (
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tranche d&apos;âge
              </dt>
              <dd className="text-sm text-foreground">
                {trancheAge(donnees.dateNaissance)}
              </dd>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Statut matrimonial
            </dt>
            <dd className="text-sm text-foreground">
              {donnees.etatCivil ?? "—"}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Téléphone
            </dt>
            <dd className="flex items-start gap-1.5 text-sm text-foreground">
              <Phone className="h-4 w-4 shrink-0 mt-0.5 text-accent" aria-hidden />
              {membre.telephone}
            </dd>
          </div>

          {membre.email && (
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </dt>
              <dd className="flex items-start gap-1.5 text-sm text-foreground">
                <Mail className="h-4 w-4 shrink-0 mt-0.5 text-accent" aria-hidden />
                {membre.email}
              </dd>
            </div>
          )}

          {membre.adresse && (
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Adresse de résidence
              </dt>
              <dd className="flex items-start gap-1.5 text-sm text-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-accent" aria-hidden />
                {membre.adresse}
              </dd>
            </div>
          )}

          {membre.profession && (
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Profession
              </dt>
              <dd className="flex items-start gap-1.5 text-sm text-foreground">
                <Briefcase className="h-4 w-4 shrink-0 mt-0.5 text-accent" aria-hidden />
                {membre.profession}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Bloc 2 : Parcours Ecclésiastique */}
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Church className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Parcours Ecclésiastique</h2>
        </div>

        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Statut de baptême
            </dt>
            <dd>
              <span
                className={
                  donnees.bapteme
                    ? "inline-flex rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-accent"
                    : "inline-flex rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                }
              >
                {donnees.bapteme ? "Baptisé(e)" : "Non baptisé(e)"}
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
              Date d&apos;admission / Confirmation
            </dt>
            <dd className="text-sm text-foreground">
              {donnees.dateConversion ? formatDateISO(donnees.dateConversion) : "—"}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fonctions / Charges ecclésiastiques
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

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Classification sociale
            </dt>
            <dd className="text-sm text-foreground">
              {donnees.classificationSociale ?? "—"}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Statut de membre
            </dt>
            <dd className="text-sm text-foreground">
              {donnees.statutMembre ?? "—"}
            </dd>
          </div>
        </dl>
      </section>
      {/* Bloc 3 : Rattachement Organisationnel */}
      <section className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Rattachement Organisationnel</h2>
        </div>

        {/* Départements */}
        {departements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Départements d&apos;appartenance
            </h3>
            <div className="flex flex-wrap gap-2">
              {departements.map((departement) => {
                const affectation =
                  membre.affectationsDepartement.find(
                    (a) => a.departementId === departement.id
                  )!;
                return (
                  <span
                    key={departement.id}
                    className={badgeClasse("department")}
                  >
                    {departement.nom} &nbsp;
                    <span
                      className="text-xs font-medium opacity-75 uppercase tracking-wider"
                    >
                      {libelleRole(affectation.role)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Groupes / Sous-groupes */}
        {groupes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Groupes / Sous-groupes d&apos;activité
            </h3>
            <div className="flex flex-wrap gap-2">
              {groupes.map((groupe) => {
                const affectation =
                  membre.affectationsGroupe.find((a) => a.groupeId === groupe.id)!;
                return (
                  <span
                    key={groupe.id}
                    className={badgeClasse("group")}
                  >
                    {groupe.nom}{groupe.estSousGroupe ? " (sous-groupe)" : ""} &nbsp;
                    <span
                      className="text-xs font-medium opacity-75 uppercase tracking-wider"
                    >
                      {libelleRole(affectation.role)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {(departements.length === 0 && groupes.length === 0) && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-card-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 shrink-0" aria-hidden />
            <span>Aucun rattachement départemental ou de groupe enregistré.</span>
          </div>
        )}
      </section>
    </div>
  );
}

/** Calcule la tranche d'âge à partir d'une date ISO (AAAA-MM-JJ). */
function trancheAge(dateNaissance: string): string {
  const naissance = new Date(dateNaissance);
  const aujourdhui = new Date();
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const mois = aujourdhui.getMonth() - naissance.getMonth();
  if (mois < 0 || (mois === 0 && aujourdhui.getDate() < naissance.getDate())) {
    age -= 1;
  }
  if (age < 0) return "—";
  if (age < 12) return "Enfant (0-11 ans)";
  if (age < 18) return "Adolescent (12-17 ans)";
  if (age < 30) return "Jeune adulte (18-29 ans)";
  if (age < 45) return "Adulte (30-44 ans)";
  if (age < 60) return "Adulte mûr (45-59 ans)";
  return "Senior (60 ans et plus)";
}

/** Classe de badge coloré selon le type d'entité. */
function badgeClasse(type: "department" | "group"): string {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border";
  if (type === "department") {
    return `${base} border-blue-200 bg-blue-50 text-blue-700`;
  }
  return `${base} border-purple-200 bg-purple-50 text-purple-700`;
}

