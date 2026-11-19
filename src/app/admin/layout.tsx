import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

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
