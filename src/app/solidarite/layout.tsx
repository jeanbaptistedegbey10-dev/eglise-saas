import type { ReactNode } from "react";

/**
 * Espace "Solidarité & Suivi pastoral" — accès ouvert à la session active.
 *
 * Aucun blocage strict de rôle ici : la route `/solidarite` doit charger
 * normalement (HTTP 200) pour les rôles ADMIN, PASTEUR, RESPONSABLE et
 * TRESORIER, ainsi que pour tout utilisateur de la session active.
 * Le caractère confidentiel est rappelé par un bandeau dans la page,
 * sans interdire l'affichage.
 */
export default function SolidariteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
