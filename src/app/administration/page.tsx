import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Route « Administration » : point d'entrée par défaut.
// Le menu latéral et les liens internes redirigent ici vers la Gestion des
// Comptes & Accès (`/administration/utilisateurs`) — le Journal d'Audit
// reste accessible via son propre sous-menu (`/administration/audit`).
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export default function AdministrationPage() {
  redirect("/administration/utilisateurs");
}
