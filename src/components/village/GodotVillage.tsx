"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Schermata iniziale dell'app: il villaggio Godot a tutto schermo.
 *
 * Il gioco apre la casella scelta inviando `wonderland:open-day` alla pagina:
 * l'app porta al calendario con il giorno già pronto da aprire.
 */
export function GodotVillage() {
  const router = useRouter();

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; day?: unknown };
      if (data?.type !== "wonderland:open-day") return;
      const day = Number(data.day);
      if (Number.isInteger(day) && day >= 1 && day <= 24) {
        router.push(`/dashboard/calendario?giorno=${day}`);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-pine-900">
      <iframe
        src="/village/index.html"
        title="Villaggio di Natale"
        className="h-full w-full border-0"
        allow="fullscreen"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-pine-950/70 to-transparent"
      />
    </div>
  );
}
