import type { Metadata } from "next";
import { CircleAlert, Users } from "lucide-react";
import ListeMembres, { type MembreFiltreItem } from "@/components/membres/ListeMembres";
import MembreFormModal from "@/components/membres/MembreFormModal";
import ExportCSVBouton from "@/components/commun/ExportCSVBouton";
import { determinerClasseAge } from "@/lib/cotisation";
import { parseDonneesEcclesiastiques } from "@/lib/membre";
import { lireConfiguration } from "@/lib/configuration-eglise";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Membres",
  description: "Répertoire des membres de l'église — création, consultation et modification.",
};

// Les données sont lues à chaque requête : le tableau reste toujours à jour
// après un Server Action, et le build ne dépend pas d'une base accessible.
export const dynamic = "force-dynamic";

export default async function MembresPage() {
  let items: MembreFiltreItem[] = [];
  let erreurBase: string | null = null;
  let localisationGpsEglise: string | null = null;

  try {
    const config = await lireConfiguration();
    localisationGpsEglise = config.localisationGps || null;
  } catch {
    localisationGpsEglise = null;
  }

  try {
    const lignes = await prisma.membre.findMany({
      orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
      include: {
        affectationsDepartement: { include: { departement: { select: { nom: true } } } },
        affectationsGroupe: { include: { groupe: { select: { nom: true } } } },
      },
    });
    items = lignes.map((m) => {
      const profil = parseDonneesEcclesiastiques(m.donneesEcclesiastiques);
      return {
        id: m.id,
        nom: m.nom,
        prenoms: m.prenoms,
        telephone: m.telephone,
        email: m.email,
        profession: m.profession,
        adresse: m.adresse,
        lieuTravail: profil.lieuTravail ?? null,
        sexe: profil.sexe ?? null,
        statut: profil.statutMembre ?? null,
        // Tranche de cotisation (Adulte / Jeune / Enfant) — aligne le filtre
        // du répertoire sur la ventilation des cotisations.
        classeAge: determinerClasseAge(profil),
        departements: m.affectationsDepartement.map((a) => a.departement.nom),
        groupes: m.affectationsGroupe.map((a) => a.groupe.nom),
        photoDataUrl: m.photoDataUrl,
      };
    });
  } catch (error) {
    console.error("Erreur lors du chargement des membres :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  // Données de l'export CSV du répertoire (colonnes en français, valeurs
  // plates — les listes sont jointes par « ; »).
  const colonnesCSV = [
    "Nom",
    "Prénoms",
    "Téléphone",
    "Email",
    "Profession",
    "Adresse",
    "Sexe",
    "Statut",
    "Tranche de cotisation",
    "Départements",
    "Groupes",
  ];
  const lignesCSV = items.map((m) => [
    m.nom,
    m.prenoms,
    m.telephone,
    m.email ?? "",
    m.profession ?? "",
    m.adresse ?? "",
    m.sexe ?? "",
    m.statut ?? "",
    m.classeAge ?? "",
    m.departements.join("; "),
    m.groupes.join("; "),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Communauté</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Gestion des membres
          </h1>
          <p className="text-sm text-muted-foreground">
            Répertoire complet — cliquez sur un membre pour ouvrir sa fiche 360°.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!erreurBase && (
            <span className="rounded-full border border-card-border bg-muted px-3 py-1 text-xs text-muted-foreground">
              {items.length} membre{items.length > 1 ? "s" : ""}
            </span>
          )}
          {!erreurBase && (
            <ExportCSVBouton base="membres" colonnes={colonnesCSV} lignes={lignesCSV} />
          )}
          <MembreFormModal triggerLabel="Nouveau membre" localisationGpsEglise={localisationGpsEglise} />
        </div>
      </header>

      {erreurBase ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erreurBase}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium text-foreground">Aucun membre enregistré</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Le répertoire est vide. Créez le premier membre avec le bouton « Nouveau membre ».
            </p>
          </div>
        </div>
      ) : (
        <ListeMembres membres={items} />
      )}
    </div>
  );
}
