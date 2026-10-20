import type { Metadata } from "next";

import FormulaireParametres from "@/components/parametres/FormulaireParametres";
import GestionSauvegardes from "@/components/parametres/GestionSauvegardes";
import GestionDonneesDemo from "@/components/administration/GestionDonneesDemo";
import { lireConfiguration } from "@/lib/configuration-eglise";
import { obtenirSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Paramètres",
  description:
    "Configuration de l'église : identité légale, coordonnées & responsables, logo, devise et exercice.",
};

export const dynamic = "force-dynamic";

/**
 * Outils de démonstration (injection / purge) : visibles uniquement pour un
 * ADMINISTRATEUR et jamais en production, sauf activation explicite via la
 * variable d'environnement `ACTIVER_OUTILS_DEMO=true` (voir .env.example).
 * La protection serveur est dédoublée dans `src/actions/demo-data.ts`.
 */
function outilsDemoActives(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ACTIVER_OUTILS_DEMO === "true";
}

export default async function ParametresPage() {
  const initiale = await lireConfiguration();

  const session = await obtenirSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? null;
  const peutVoirOutilsDemo = role === "ADMINISTRATEUR" && outilsDemoActives();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-accent">Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Identité &amp; légal, coordonnées &amp; responsables, devise &amp; exercice.
        </p>
      </header>

      <FormulaireParametres initiale={initiale} />

      <GestionSauvegardes />

      {peutVoirOutilsDemo && <GestionDonneesDemo />}
    </div>
  );
}
