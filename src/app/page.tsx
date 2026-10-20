import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Église — Gestion communautaire",
  description: "Application dédiée de gestion d'église : redirection vers la connexion ou le tableau de bord.",
};

/**
 * Application dédiée (vitrine SaaS supprimée) :
 * - non connecté → /login
 * - connecté → /dashboard
 */
export default async function Home(): Promise<never> {
  let connecte = false;
  try {
    const session = await auth();
    connecte = Boolean(session?.user);
  } catch (erreur) {
    console.error("Lecture de la session impossible sur / :", erreur);
  }
  redirect(connecte ? "/dashboard" : "/login");
}

