"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/client";

/**
 * Registra il Service Worker e lo aggiorna quando l'app torna visibile.
 *
 * Non forza un reload: il nuovo worker prende il controllo al passaggio
 * successivo, evitando di perdere stato o form aperti.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      registration = await registerServiceWorker();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => null);
      }
    };

    void register();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void cancelled;
    };
  }, []);

  return null;
}
