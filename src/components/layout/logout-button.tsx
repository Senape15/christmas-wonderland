"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/supabase/auth-client";
import { removePushSubscription } from "@/lib/push/actions";
import { unsubscribeFromPush } from "@/lib/pwa/client";
import { NavIcon } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  label = "Esci",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      // Il dispositivo viene scollegato PRIMA di chiudere la sessione: la
      // Server Action richiede un utente autenticato. Su un dispositivo
      // condiviso non restano subscription attive per l'utente precedente.
      const local = await unsubscribeFromPush();
      if (local.endpoint) {
        await removePushSubscription({ endpoint: local.endpoint }).catch(() => null);
      }
    } catch {
      // Il logout non deve mai bloccarsi per un problema di notifiche.
    } finally {
      // Le cache contengono solo asset pubblici, ma su un dispositivo
      // condiviso vengono svuotate: nessun contenuto resta offline.
      if (typeof window !== "undefined" && "caches" in window) {
        await caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => null);
      }
      await signOut();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-christmas-red px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-christmas-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-60",
        className
      )}
    >
      <NavIcon name="logout" className="h-4 w-4" />
      {busy ? "Esco…" : label}
    </button>
  );
}
