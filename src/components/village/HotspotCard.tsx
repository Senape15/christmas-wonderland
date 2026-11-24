"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Nico } from "@/components/nico/Nico";
import {
  getHotspotHint,
  getHotspotNicoMessage,
  getHotspotStateLabel,
  getNicoExpressionForState,
} from "@/lib/story";
import type { VillageHotspot } from "@/types/village";

interface HotspotCardProps {
  hotspot: VillageHotspot;
  zoneName: string;
  isOpening: boolean;
  error: string | null;
  onOpen: (dayNumber: number) => void;
  onClose: () => void;
}

const STATE_BADGE: Record<VillageHotspot["state"], string> = {
  locked: "border-cream-300/25 bg-pine-900/70 text-cream-200/80",
  available: "border-gold/60 bg-gold/15 text-gold-light",
  discovered: "border-ice-300/50 bg-ice-900/50 text-ice-300",
  completed: "border-christmas-red-light/50 bg-christmas-red/20 text-cream-50",
};

/**
 * Scheda narrativa di un punto del villaggio.
 *
 * Per i punti bloccati mostra solo testo coerente con la storia: il giorno,
 * il teaser e i messaggi configurati non sono mai presenti nei dati ricevuti.
 */
export function HotspotCard({
  hotspot,
  zoneName,
  isOpening,
  error,
  onOpen,
  onClose,
}: HotspotCardProps) {
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const dayNumber = hotspot.dayNumber;
  const canOpen =
    (hotspot.state === "available" || hotspot.state === "discovered") &&
    dayNumber !== null;

  const expression = getNicoExpressionForState(
    hotspot.state,
    hotspot.nicoExpression
  );

  return (
    <motion.section
      key={hotspot.id}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      aria-labelledby={titleId}
      aria-live="polite"
      className="relative overflow-hidden rounded-[28px] border border-cream-300/20 bg-pine-950/95 p-4 pb-5 shadow-[0_-18px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-5"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gold/10 to-transparent"
      />
      <span
        aria-hidden="true"
        className="mx-auto mb-3 block h-1 w-10 rounded-full bg-cream-300/20 sm:hidden"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi la scheda del luogo"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-cream-300/20 text-cream-200/70 transition-colors hover:border-gold/50 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
          <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <p className="text-xs uppercase tracking-[0.18em] text-cream-200/60">
        {zoneName}
      </p>
      <h3 id={titleId} className="mt-1 pr-10 font-display text-lg font-semibold text-cream-50">
        {hotspot.name}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
            STATE_BADGE[hotspot.state]
          )}
        >
          {getHotspotStateLabel(hotspot.state)}
        </span>
        {dayNumber !== null && hotspot.state !== "locked" && (
          <span className="rounded-full border border-cream-300/20 bg-cream-50/5 px-2.5 py-1 text-[11px] text-cream-200/80">
            Giorno {hotspot.dayNumber}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-cream-100/85">
        {getHotspotHint(hotspot, hotspot.state)}
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-cream-300/15 bg-pine-900/60 p-3">
        <Nico
          expression={expression}
          animated={false}
          ariaLabel={`Nico, espressione ${expression}`}
          className="h-12 w-12 shrink-0"
        />
        <p className="pt-1 text-sm italic leading-snug text-cream-100/90">
          {getHotspotNicoMessage(hotspot, hotspot.state)}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red-light">
          {error}
        </p>
      )}

      {canOpen && dayNumber !== null && (
        <button
          type="button"
          onClick={() => onOpen(dayNumber)}
          disabled={isOpening}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark px-4 py-2.5 text-sm font-bold text-pine-950 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-pine-950 disabled:cursor-wait disabled:opacity-70"
        >
          {isOpening ? "Apertura…" : `Apri il giorno ${dayNumber}`}
        </button>
      )}

      {hotspot.state === "completed" && (
        <a
          href="#calendario"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cream-300/25 px-4 py-2.5 text-sm font-medium text-cream-100 transition-colors hover:border-gold/50 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Rivedi nel calendario
        </a>
      )}

      {hotspot.state === "locked" && (
        <p className="mt-4 rounded-xl border border-cream-300/15 bg-cream-50/5 px-3 py-2 text-xs leading-relaxed text-cream-200/70">
          Questo luogo non è ancora associato a una tappa della storia. Torna a
          esplorare quando la neve si sarà posata.
        </p>
      )}
    </motion.section>
  );
}
