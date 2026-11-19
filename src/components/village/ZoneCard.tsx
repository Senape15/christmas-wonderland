"use client";

import { cn } from "@/lib/utils";
import { getHotspotStateLabel } from "@/lib/story";
import type { VillageHotspot, VillageZone } from "@/types/village";

interface ZoneCardProps {
  zone: VillageZone;
  hotspots: readonly VillageHotspot[];
  isActive: boolean;
  selectedId: string | null;
  onFocusZone: (slug: string) => void;
  onSelectHotspot: (id: string) => void;
  className?: string;
}

const STATE_DOT: Record<VillageHotspot["state"], string> = {
  locked: "bg-pine-800 border border-cream-300/40",
  available: "bg-gold",
  discovered: "bg-ice-300",
  completed: "bg-christmas-red-light",
};

const STATE_CHIP: Record<VillageHotspot["state"], string> = {
  locked: "border-cream-300/15 text-cream-200/60 hover:border-cream-300/30",
  available: "border-gold/60 bg-gold/10 text-gold-light hover:bg-gold/20",
  discovered: "border-ice-300/40 bg-ice-900/30 text-ice-300 hover:bg-ice-900/50",
  completed: "border-christmas-red-light/40 bg-christmas-red/10 text-cream-100 hover:bg-christmas-red/20",
};

/**
 * Riepilogo accessibile di una zona: nome, descrizione e i quattro luoghi.
 *
 * Non è un unico bottone (i bottoni non si annidano): il titolo della zona è un
 * pulsante che inquadra l'area sulla mappa, mentre ogni luogo è un pulsante
 * indipendente che apre la sua scheda narrativa.
 */
export function ZoneCard({
  zone,
  hotspots,
  isActive,
  selectedId,
  onFocusZone,
  onSelectHotspot,
  className,
}: ZoneCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-xl border p-4 transition-colors",
        isActive
          ? "border-gold/60 bg-gold/10 shadow-[var(--shadow-glow-gold)]"
          : "border-cream-300/20 bg-cream-50/5",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onFocusZone(zone.slug)}
        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pine-900"
      >
        <span className="flex items-center gap-2">
          <span className="font-display text-base font-semibold text-cream-50">
            {zone.name}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "text-xs transition-transform",
              isActive ? "text-gold" : "text-cream-200/50"
            )}
          >
            ↗
          </span>
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-cream-200/70">
          {zone.description}
        </span>
      </button>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Luoghi di ${zone.name}`}>
        {hotspots.map((hotspot) => (
          <li key={hotspot.id}>
            <button
              type="button"
              onClick={() => onSelectHotspot(hotspot.id)}
              aria-pressed={selectedId === hotspot.id}
              aria-label={`${hotspot.name}, ${getHotspotStateLabel(hotspot.state)}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                STATE_CHIP[hotspot.state]
              )}
            >
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[hotspot.state])}
              />
              {hotspot.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
