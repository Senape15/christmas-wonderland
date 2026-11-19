"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/supabase/auth-client";
import { removePushSubscription } from "@/lib/push/actions";
import { unsubscribeFromPush } from "@/lib/pwa/client";

export function LogoutButton() {
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
      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-full text-sm font-medium transition-colors disabled:opacity-60"
    >
      {busy ? "Esco…" : "Logout"}
    </button>
  );
}
