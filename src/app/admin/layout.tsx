import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Il pannello admin aggrega molte query (statistiche, panoramica giorni,
 * contenuti) in ogni pagina: non può produrre un guscio statico istantaneo.
 * `instant = false` dichiara che la navigazione può bloccare, evitando
 * l'errore Next 16 "encountered uncached data during prerendering".
 */
export const instant = false;

async function AdminGate({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell email={user.email}>{children}</AdminShell>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pine-950 text-cream-100">
          Caricamento…
        </div>
      }
    >
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
