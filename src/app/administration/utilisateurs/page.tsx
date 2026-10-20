import type { Metadata } from "next";
import { CircleAlert, UserCog } from "lucide-react";

import { UtilisateursClient } from "@/components/administration/UtilisateursClient";
import { prisma } from "@/lib/prisma";
import type { UtilisateurLigne } from "@/types/utilisateur";

export const metadata: Metadata = {
  title: "Comptes & Accès",
  description:
    "Gestion des comptes utilisateurs, des rôles et des autorisations d'accès.",
};

// Les données sont lues à chaque requête : le tableau reste toujours à jour
// après un Server Action, et le build ne dépend pas d'une base accessible.
export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  let utilisateurs: UtilisateurLigne[] = [];
  let erreurBase: string | null = null;

  try {
    utilisateurs = await prisma.utilisateur.findMany({
      orderBy: [{ actif: "desc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("Erreur lors du chargement des comptes utilisateurs :", error);
    erreurBase =
      "Impossible de joindre la base de données. Vérifiez la variable DATABASE_URL puis réessayez.";
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Administration</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Comptes &amp; Accès
          </h1>
          <p className="text-sm text-muted-foreground">
            Comptes utilisateurs, rôles et autorisations d&apos;accès — chaque
            modification est tracée dans le journal d&apos;audit.
          </p>
        </div>

        {!erreurBase && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserCog className="h-3.5 w-3.5" aria-hidden />
            <span className="rounded-full border border-card-border bg-muted px-3 py-1">
              {utilisateurs.length} compte
              {utilisateurs.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </header>

      {erreurBase ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erreurBase}</span>
        </div>
      ) : (
        <UtilisateursClient utilisateurs={utilisateurs} />
      )}
    </div>
  );
}
