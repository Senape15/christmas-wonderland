"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { getHotspotStateLabel } from "@/lib/story";
import type { VillageHotspot } from "@/types/village";

interface HotspotMarkerProps {
  hotspot: VillageHotspot;
  /** Scala corrente della mappa: serve a mantenere il marker di dimensione costante. */
  scale: number;
  isSelected: boolean;
  onSelect: (hotspotId: string) => void;
}

const STATE_RING: Record<VillageHotspot["state"], string> = {
  locked: "border-cream-300/35 bg-pine-900/70 text-cream-300/70",
  available: "border-gold bg-gold/25 text-gold-light",
  discovered: "border-ice-300 bg-ice-900/70 text-ice-300",
  completed: "border-christmas-red-light bg-christmas-red/30 text-cream-50",
};

const STATE_DOT: Record<VillageHotspot["state"], string> = {
  locked: "bg-cream-300/45",
  available: "bg-gold",
  discovered: "bg-ice-300",
  completed: "bg-christmas-red-light",
};

const STATE_LABEL_CLASS: Record<VillageHotspot["state"], string> = {
  locked: "text-cream-200/80",
  available: "text-gold-light",
  discovered: "text-ice-300",
  completed: "text-christmas-red-light",
};

/**
 * Segnaposto illustrato di un punto del villaggio.
 *
 * Resta visibile anche quando è bloccato (fa parte dell'illustrazione), ma
 * non rivela nulla: nessun giorno, nessun titolo, nessun messaggio.
 * La dimensione sullo schermo è costante grazie alla contro-scala.
 */
export const HotspotMarker = memo(function HotspotMarker({
  hotspot,
  scale,
  isSelected,
  onSelect,
}: HotspotMarkerProps) {
  // Arrotondato: la CSSOM riserializza i numeri a 6 cifre significative.
  const inverse = Math.round((1 / Math.max(scale, 0.0001)) * 1000) / 1000;
  const label = getHotspotStateLabel(hotspot.state);

  return (
    <button
      type="button"
      data-hotspot={hotspot.slug}
      onClick={() => onSelect(hotspot.id)}
      aria-pressed={isSelected}
      aria-label={`${hotspot.name}, ${label}`}
      className="group absolute -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none"
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
    >
      <span
        className="relative flex h-11 w-11 items-center justify-center"
        style={{ transform: `scale(${inverse})` }}
      >
        {/* Alone pulsante per il punto disponibile oggi */}
        {hotspot.state === "available" && (
          <span className="hotspot-pulse absolute h-8 w-8 rounded-full border-2 border-gold" />
        )}

        <span
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-[var(--shadow-card)] backdrop-blur-sm transition-transform duration-200",
            STATE_RING[hotspot.state],
            isSelected && "scale-125 ring-4 ring-gold/40",
            hotspot.state !== "locked" && "group-hover:scale-110"
          )}
        >
          {hotspot.state === "completed" ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : hotspot.state === "locked" ? (
            <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
              <rect x="3.5" y="7" width="9" height="7" rx="1.6" fill="currentColor" />
              <path d="M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          ) : (
            <span className={cn("h-2.5 w-2.5 rounded-full", STATE_DOT[hotspot.state])} />
          )}
        </span>

        {/* Nome del luogo: solo su hover, focus o selezione */}
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full border border-cream-300/25 bg-pine-950/90 px-2.5 py-1 text-[11px] font-medium tracking-wide",
            STATE_LABEL_CLASS[hotspot.state],
            isSelected ? "block" : "hidden group-hover:block group-focus-visible:block"
          )}
        >
          {hotspot.name}
        </span>
      </span>
    </button>
  );
});
