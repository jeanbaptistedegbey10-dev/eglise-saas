import type { Metadata } from "next";
import Link from "next/link";

import { lireConfiguration } from "@/lib/configuration-eglise";
import EcranAuth from "@/components/auth/EcranAuth";
import FormulaireNouveauMotDePasse from "@/components/auth/FormulaireNouveauMotDePasse";

export const metadata: Metadata = {
  title: "Réinitialisation du mot de passe",
  description: "Choisissez un nouveau mot de passe pour votre compte.",
};

type Props = {
  searchParams: Promise<{ jeton?: string }>;
};

export default async function PageReinitialisation({ searchParams }: Props) {
  const { jeton } = await searchParams;
  const configuration = await lireConfiguration();

  return (
    <EcranAuth
      configuration={configuration}
      titre="Nouveau mot de passe"
      sousTitre="Choisissez un mot de passe sécurisé pour votre compte."
    >
      {jeton ? (
        <FormulaireNouveauMotDePasse jeton={jeton} />
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-6">
          <p className="text-sm text-red-600 dark:text-red-300">
            Le lien de réinitialisation est incomplet. Refaites une demande
            depuis la page « Mot de passe oublié ».
          </p>
          <Link
            href="/mot-de-passe-oublie"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Demander un nouveau lien
          </Link>
        </div>
      )}
    </EcranAuth>
  );
}