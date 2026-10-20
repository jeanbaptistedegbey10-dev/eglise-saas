import HeaderNotifications from "@/components/layout/HeaderNotifications";
import { obtenirAlertes } from "@/actions/alertes";

/** Îlot serveur : cloche d'alertes dans l'en-tête (client = AppShell). */
export default async function HeaderAlertes() {
  const alertes = await obtenirAlertes();
  return <HeaderNotifications alertes={alertes} />;
}
