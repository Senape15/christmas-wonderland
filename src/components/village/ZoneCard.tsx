"use client";

import { cn } from "@/lib/utils";
import { NavIcon } from "@/components/layout/nav-icons";
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
  locked: "border-cream-300/12 text-cream-200/55 hover:border-cream-300/30",
  available: "border-gold/60 bg-gold/10 text-gold-light hover:bg-gold/20",
  discovered:
    "border-ice-300/40 bg-ice-900/30 text-ice-300 hover:bg-ice-900/50",
  completed:
    "border-christmas-red-light/40 bg-christmas-red/10 text-cream-100 hover:bg-christmas-red/20",
};

/**
 * Riepilogo accessibile di una zona: nome, descrizione e i luoghi.
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
        "group relative flex h-full min-w-[248px] flex-col rounded-3xl border p-4 transition-colors",
        isActive
          ? "border-gold/55 bg-gold/10 shadow-[0_12px_36px_-20px_rgba(212,168,67,0.7)]"
          : "border-cream-300/12 bg-cream-50/[0.03] hover:border-cream-300/25",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onFocusZone(zone.slug)}
        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pine-900"
      >
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "grid h-10 w-10 place-items-center rounded-2xl border",
              isActive
                ? "border-gold/40 bg-gold/15 text-gold-light"
                : "border-cream-300/12 bg-pine-950/40 text-cream-200/70"
            )}
          >
            <NavIcon name="map" className="h-[18px] w-[18px]" />
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-cream-300/10 text-cream-300/45 transition-colors group-hover:border-gold/40 group-hover:text-gold-light">
            <NavIcon name="arrowRight" className="h-3.5 w-3.5" />
          </span>
        </span>

        <span className="mt-3 block font-display text-base font-semibold text-cream-50">
          {zone.name}
        </span>
        <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-cream-200/65">
          {zone.description}
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light/65">
          {hotspots.length} luoghi
        </span>
      </button>

      <ul
        className="mt-auto flex flex-wrap gap-1.5 border-t border-cream-300/10 pt-3"
        aria-label={`Luoghi di ${zone.name}`}
      >
        {hotspots.map((hotspot) => (
          <li key={hotspot.id}>
            <button
              type="button"
              onClick={() => onSelectHotspot(hotspot.id)}
              aria-pressed={selectedId === hotspot.id}
              aria-label={`${hotspot.name}, ${getHotspotStateLabel(hotspot.state)}`}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
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
