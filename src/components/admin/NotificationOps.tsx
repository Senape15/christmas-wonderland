import { getNotificationOps } from "@/lib/services/notifications";
import { NotificationConsole } from "./NotificationConsole";

/**
 * Wrapper server del pannello operativo delle notifiche.
 *
 * La lettura usa `getNotificationOps()`, che richiama `requireAdmin()`:
 * nessun dato di altri utenti raggiunge un visitatore non autorizzato.
 */
export async function NotificationOps() {
  const snapshot = await getNotificationOps();
  return <NotificationConsole snapshot={snapshot} />;
}
