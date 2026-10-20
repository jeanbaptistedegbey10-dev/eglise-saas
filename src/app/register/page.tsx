import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inscription désactivée",
  description: "La création de comptes est réservée à l'administrateur.",
};

/**
 * Route publique /register désactivée : la création d'utilisateurs se fait
 * uniquement par l'Admin dans /administration/utilisateurs.
 * Redirection systématique vers /login (doublée par le middleware).
 */
export default function PageInscription(): never {
  redirect("/login");
}
