import { requireUser } from "@/lib/auth";
import { getNotificationOverview } from "@/lib/services/notifications";
import { publicVapidKey } from "@/lib/push/config";
import { MemoryShell } from "@/components/memories/MemoryShell";
import { NotificationSettings } from "@/components/pwa/NotificationSettings";

export const metadata = {
  title: "Impostazioni notifiche · Christmas Wonderland",
};

export default async function NotificationSettingsPage() {
  const user = await requireUser();
  const overview = await getNotificationOverview(user.id);

  return (
    <MemoryShell
      user={user}
      active="/dashboard/impostazioni"
      title="Impostazioni notifiche"
      subtitle="Scegli cosa ricevere, a che ora e su quali dispositivi. Le notifiche arrivano solo per i giorni già sbloccati."
    >
      <NotificationSettings overview={overview} vapidPublicKey={publicVapidKey()} />
    </MemoryShell>
  );
}
