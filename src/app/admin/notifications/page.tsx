import { Suspense } from "react";
import { AdminResourcePage } from "@/components/admin/AdminResourcePage";
import { NotificationOps } from "@/components/admin/NotificationOps";

export const instant = false;

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-10">
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-2xl border border-cream-300/10 bg-cream-50/[0.03]" />
        }
      >
        <NotificationOps />
      </Suspense>

      <AdminResourcePage
        resourceKeys={["scheduled_notifications"]}
        title="Notifiche programmate"
        description="Crea, modifica e programma le notifiche. L'invio reale usa Web Push con le chiavi VAPID configurate sul server."
      />
    </div>
  );
}
