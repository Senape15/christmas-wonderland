"use client";

import { useEffect, useState } from "react";

/** Banner discreto che avvisa quando l'app perde la connessione. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 border-b border-gold/30 bg-pine-950/95 px-4 py-2 text-center text-xs text-cream-100 shadow-[var(--shadow-card)] backdrop-blur"
    >
      <span aria-hidden="true">🌨️</span> Sei offline: puoi leggere solo le
      risorse già scaricate. Le caselle, i quiz e i progressi richiedono la
      connessione.
    </div>
  );
}
