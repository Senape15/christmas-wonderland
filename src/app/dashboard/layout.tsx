import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { AppDock } from "@/components/layout/app-navigation";

/**
 * Authenticated shell for /dashboard.
 * The session read lives behind Suspense (Cache Components requirement),
 * while the real guard is requireUser().
 */
async function AuthGate({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <ServiceWorkerRegistrar />
      <OfflineBanner />
      {children}
      <AppDock />
      <InstallPrompt />
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pine-900 text-cream-100">
          Caricamento…
        </div>
      }
    >
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
