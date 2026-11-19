"use client";

import { cn } from "@/lib/utils";
import type { HotspotState } from "@/types/village";

const legendItems: {
  state: HotspotState;
  label: string;
  dotClass: string;
}[] = [
  {
    state: "available",
    label: "Disponibile oggi",
    dotClass: "bg-gold ring-2 ring-gold/40",
  },
  {
    state: "discovered",
    label: "Da aprire",
    dotClass: "bg-ice-300",
  },
  {
    state: "completed",
    label: "Completato",
    dotClass: "bg-christmas-red-light",
  },
  {
    state: "locked",
    label: "Non ancora disponibile",
    dotClass: "bg-pine-900 border border-cream-300/40",
  },
];

export function HotspotLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-cream-300/20 bg-pine-900/40 px-4 py-3 backdrop-blur-sm",
        className
      )}
      role="list"
      aria-label="Legenda degli stati dei luoghi"
    >
      {legendItems.map((item) => (
        <div key={item.state} className="flex items-center gap-2" role="listitem">
          <span
            aria-hidden="true"
            className={cn("h-3 w-3 rounded-full", item.dotClass)}
          />
          <span className="text-xs text-cream-200/80">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
