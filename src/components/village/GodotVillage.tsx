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
 * - copre la vecchia etichetta minuscola del gioco con un'intestazione leggibile;
 * - converte il pinch a due dita in eventi `wheel`, che è l'input di zoom
 *   supportato dal motore Godot (su mobile il pinch nativo non arriva);
 * - il gioco apre le caselle con `wonderland:open-day` e l'app porta al
 *   calendario con il giorno già pronto da aprire.
 */
export function GodotVillage() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; day?: unknown };
      if (data?.type === "wonderland:ready") {
        setReady(true);
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

      {/* Copre l'etichetta minuscola disegnata dal gioco e la sostituisce. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-pine-950 via-pine-950/85 to-transparent"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
        <div className="rounded-full border border-cream-300/20 bg-pine-950/85 px-4 py-1.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <p className="text-xs font-bold text-cream-50">
            Villaggio di Natale
          </p>
          <p className="text-[11px] leading-tight text-cream-300/75">
            Tocca un punto per aprirlo · pizzica per zoomare
          </p>
        </div>
      </div>
    </div>
  );
}
