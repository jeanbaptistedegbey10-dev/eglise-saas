import type { Metadata } from "next";

import { lireConfiguration } from "@/lib/configuration-eglise";
import FormulaireConnexion from "@/components/auth/FormulaireConnexion";
import EcranAuth from "@/components/auth/EcranAuth";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace Église SaaS.",
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string; message?: string }>;
};

export default async function PageConnexion({ searchParams }: Props) {
  const params = await searchParams;
  const configuration = await lireConfiguration();

  return (
    <EcranAuth
      configuration={configuration}
      titre="Connexion"
      sousTitre="Accédez à votre espace de gestion."
      theme="sky-orange"
    >
      <FormulaireConnexion
        callbackUrl={params.callbackUrl}
        info={params.message}
        variant="orange"
      />
    </EcranAuth>
  );
}