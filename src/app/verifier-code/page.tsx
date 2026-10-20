import type { Metadata } from "next";
import { redirect } from "next/navigation";

import FormulaireVerificationCode from "@/components/auth/FormulaireVerificationCode";
import EcranAuth from "@/components/auth/EcranAuth";

export const metadata: Metadata = {
  title: "Vérification du code",
  description: "Saisissez le code à 6 chiffres reçu par e-mail pour finaliser votre connexion.",
};

type Props = {
  searchParams: Promise<{ email?: string; redirectTo?: string; seSouvenir?: string }>;
};

export default async function PageVerifierCode({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";

  // Sans e-mail, retour à la connexion (anti accès direct).
  if (!email) redirect("/login");

  const cible =
    params.redirectTo && params.redirectTo.startsWith("/") && !params.redirectTo.startsWith("//")
      ? params.redirectTo
      : "/dashboard";

  return (
    <EcranAuth
      titre="Vérifiez votre identité"
      sousTitre="Un code à 6 chiffres vient d'être envoyé à votre adresse e-mail (valable 10 minutes)."
    >
      <FormulaireVerificationCode
        email={email}
        redirectTo={cible}
        seSouvenir={params.seSouvenir === "1"}
      />
    </EcranAuth>
  );
}
