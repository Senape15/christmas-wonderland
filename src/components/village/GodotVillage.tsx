"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NavIcon } from "@/components/layout/nav-icons";

/** Distanza tra due dita, usata per trasformare il pinch in rotellina. */
function touchDistance(touches: TouchList): number {
  const a = touches[0];
  const b = touches[1];
  if (!a || !b) return 0;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Schermata iniziale dell'app: il villaggio Godot a tutto schermo.
 *
 * - lascia spazio alla dock inferiore, così Nico non resta nascosto;
 * - mostra un pulsante "Torna al villaggio" quando si entra in un quartiere;
 * - converte il pinch a due dita in eventi `wheel`, che è l'input di zoom
 *   supportato dal motore Godot (su mobile il pinch nativo non arriva);
 * - il gioco apre le caselle con `wonderland:open-day` e l'app porta al
 *   calendario con il giorno già pronto da aprire.
 */
export function GodotVillage() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [inDistrict, setInDistrict] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; day?: unknown; view?: unknown };
      if (data?.type === "wonderland:ready") {
        setReady(true);
        return;
      }
      if (data?.type === "wonderland:view") {
        setInDistrict(data.view === "district");
        return;
      }
      if (data?.type !== "wonderland:open-day") return;
      const day = Number(data.day);
      if (Number.isInteger(day) && day >= 1 && day <= 24) {
        router.push(`/dashboard/calendario?giorno=${day}`);
      }
    }
    window.addEventListener("message", onMessage);
    // Se Godot non segnala la partenza, il loader non deve restare per sempre.
    const fallback = window.setTimeout(() => setReady(true), 15000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(fallback);
    };
  }, [router]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let detach: (() => void) | null = null;

    const attachZoom = () => {
      detach?.();
      detach = null;

      const canvas = iframe.contentDocument?.getElementById("canvas");
      if (!canvas) return;

      let lastDistance = 0;

      const onStart = (event: TouchEvent) => {
        lastDistance = event.touches.length === 2 ? touchDistance(event.touches) : 0;
      };

      const onMove = (event: TouchEvent) => {
        if (event.touches.length !== 2 || lastDistance <= 0) return;
        const current = touchDistance(event.touches);
        if (current <= 0) return;

        // Pinch verso l'esterno (distanza crescente) => zoom in (deltaY < 0).
        const deltaY = Math.max(
          -120,
          Math.min(120, (lastDistance - current) * 3)
        );
        lastDistance = current;
        if (Math.abs(deltaY) < 2) return;

        canvas.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY,
            deltaMode: 0,
            bubbles: true,
            cancelable: true,
          })
        );
      };

      const onEnd = (event: TouchEvent) => {
        if (event.touches.length < 2) lastDistance = 0;
      };

      canvas.addEventListener("touchstart", onStart, { passive: true });
      canvas.addEventListener("touchmove", onMove, { passive: true });
      canvas.addEventListener("touchend", onEnd, { passive: true });
      canvas.addEventListener("touchcancel", onEnd, { passive: true });

      detach = () => {
        canvas.removeEventListener("touchstart", onStart);
        canvas.removeEventListener("touchmove", onMove);
        canvas.removeEventListener("touchend", onEnd);
        canvas.removeEventListener("touchcancel", onEnd);
      };
    };

    iframe.addEventListener("load", attachZoom);
    // L'iframe può essere già pronta dopo un mount/remount della pagina.
    if (iframe.contentDocument?.readyState === "complete") attachZoom();

    return () => {
      iframe.removeEventListener("load", attachZoom);
      detach?.();
    };
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#041b2e" }}
    >
      <div
        className="w-full"
        style={{
          // La dock inferiore occupa circa 4.5rem + safe area: lasciamo un
          // po' di spazio in più, così Nico resta sempre visibile sopra di essa.
          height: "calc(100dvh - 7rem - env(safe-area-inset-bottom, 0px))",
        }}
      >
        <iframe
          ref={iframeRef}
          src="/village/index.html"
          title="Villaggio di Natale"
          className="h-full w-full border-0"
          allow="fullscreen"
        />
      </div>

      {/* Loader: copre il canvas finché Godot non ha i dati del villaggio. */}
      {!ready && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-pine-950 px-8 text-center">
          <div className="relative grid h-16 w-16 place-items-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
            <NavIcon name="tree" className="h-7 w-7 text-gold-light" />
          </div>
          <p className="mt-5 font-display text-lg font-bold text-cream-50">
            Christmas Wonderland
          </p>
          <p className="mt-1 text-sm text-cream-300/70">
            Sto accendendo le luci del villaggio…
          </p>
        </div>
      )}

      {/* Il villaggio ha la sua barra in alto: non copriamola. Aggiungiamo
          solo un pulsante ben visibile per tornare indietro dal quartiere. */}
      {inDistrict && ready && (
        <button
          type="button"
          onClick={() =>
            iframeRef.current?.contentWindow?.postMessage(
              { type: "wonderland:back" },
              window.location.origin
            )
          }
          className="absolute left-3 top-3 z-30 inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/40 bg-pine-950/90 px-4 text-sm font-semibold text-gold-light shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-gold hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <NavIcon name="arrowRight" className="h-4 w-4 rotate-180" />
          Torna al villaggio
        </button>
      )}
    </div>
  );
}
