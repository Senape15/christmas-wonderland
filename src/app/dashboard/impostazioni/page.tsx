import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getNotificationOverview } from "@/lib/services/notifications";
import { publicVapidKey } from "@/lib/push/config";
import { PageShell } from "@/components/layout/page-shell";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata = {
  title: "Impostazioni · Christmas Wonderland",
};

async function SettingsData() {
  const user = await requireUser();
  const overview = await getNotificationOverview(user.id);

  return (
    <PageShell
      user={user}
      eyebrow="Impostazioni"
      title="Account e notifiche"
      subtitle="Gestisci il tuo account, i promemoria e i dispositivi che ricevono le notifiche. Le notifiche arrivano solo per i giorni già sbloccati."
    >
      <SettingsView
        user={user}
        overview={overview}
        vapidPublicKey={publicVapidKey()}
      />
    </PageShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pine-950 text-cream-100">
          <p className="text-sm text-cream-300/70">
            Sto caricando le impostazioni…
          </p>
        </div>
      }
    >
      <SettingsData />
    </Suspense>
  );
}
