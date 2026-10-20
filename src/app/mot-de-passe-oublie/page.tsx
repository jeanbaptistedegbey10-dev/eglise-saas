import type { Metadata } from "next";

import EcranAuth from "@/components/auth/EcranAuth";
import FormulaireMotDePasseOublie from "@/components/auth/FormulaireMotDePasseOublie";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Recevez un lien pour réinitialiser votre mot de passe.",
};

export default function PageMotDePasseOublie() {
  return (
    <EcranAuth
      titre="Mot de passe oublié"
      sousTitre="Indiquez votre e-mail : nous vous enverrons un lien de réinitialisation."
    >
      <FormulaireMotDePasseOublie />
    </EcranAuth>
  );
}