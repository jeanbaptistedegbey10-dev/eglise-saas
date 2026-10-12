import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, Eye, Users } from "lucide-react";

import MembreFormModal from "@/components/membres/MembreFormModal";
import { prisma } from "@/lib/prisma";
import type { Membre } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Membres",
  description: "Répertoire des membres de l'église — création, consultation et modification.",
};

// Les données sont lues à chaque requête : le tableau reste toujours à jour
// après un Server Action, et le build ne dépend pas d'une base accessible.
export const dynamic = "force-dynamic";

export default async function MembresPage() {
  let membres: Membre[] = [];
  let erreurBase: string | null = null;

  try {
    membres = await prisma.membre.findMany({
      orderBy: [{ nom: "asc" }, { prenoms: "asc" }],
    });
  } catch (error) {
    console.error("Erreur lors du chargement des membres :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

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
              {membres.length} membre{membres.length > 1 ? "s" : ""}
            </span>
          )}
          <MembreFormModal triggerLabel="Nouveau membre" />
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
      ) : membres.length === 0 ? (
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
        <div className="overflow-x-auto rounded-2xl border border-card-border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">Prénoms</th>
                <th className="px-5 py-3 font-medium">Téléphone</th>
                <th className="px-5 py-3 font-medium">Profession</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {membres.map((membre) => (
                <tr key={membre.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3 font-medium text-foreground">{membre.nom}</td>
                  <td className="px-5 py-3 text-foreground">{membre.prenoms}</td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted-foreground">
                    {membre.telephone}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{membre.profession ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/membres/${membre.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        Voir la fiche
                      </Link>
                      <MembreFormModal membre={membre} triggerLabel="Modifier" variant="secondary" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
