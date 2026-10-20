import type { Metadata } from "next";

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

  return (
    <EcranAuth
      titre="Connexion"
      sousTitre="Accédez à votre espace de gestion."
    >
      <FormulaireConnexion
        callbackUrl={params.callbackUrl}
        info={params.message}
      />
    </EcranAuth>
  );
}