"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NavIcon } from "@/components/layout/nav-icons";
import type { DayState, ExperienceDay } from "@/types/experience";

interface AdventCalendarProps {
  days: ExperienceDay[];
  /** Giorno in caricamento (disabilitato durante l'apertura). */
  pendingDay: number | null;
  error: string | null;
  onOpenDay: (dayNumber: number) => void;
}

const STATE_LABEL: Record<DayState, string> = {
  locked: "Bloccato",
  available: "Disponibile",
  opened: "Aperto",
  completed: "Completato",
};

const STATE_STYLE: Record<DayState, string> = {
  locked:
    "cursor-not-allowed border-cream-300/10 bg-pine-950/45 text-cream-300/35",
  available:
    "cursor-pointer border-gold/70 bg-gradient-to-b from-gold/25 to-gold/5 text-gold-light shadow-[0_10px_30px_-12px_rgba(212,168,67,0.45)] hover:from-gold/35",
  opened:
    "cursor-pointer border-ice-300/45 bg-gradient-to-b from-ice-900/70 to-ice-900/30 text-ice-300 hover:from-ice-900/90",
  completed:
    "cursor-pointer border-christmas-red-light/50 bg-gradient-to-b from-christmas-red/85 to-christmas-red-dark/80 text-cream-50 shadow-[0_10px_30px_-14px_rgba(196,30,58,0.6)] hover:from-christmas-red",
};

/**
 * Calendario dei 24 giorni con i quattro stati dell'esperienza.
 *
 * I giorni bloccati non ricevono titolo né descrizione dal server: la casella
 * mostra solo il numero. L'apertura è delegata al genitore, che chiama la
 * Server Action e mostra l'esperienza animata.
 */
export function AdventCalendar({
  days,
  pendingDay,
  error,
  onOpenDay,
}: AdventCalendarProps) {
  const reducedMotion = useReducedMotion();

  const counts = useMemo(() => {
    let opened = 0;
    let completed = 0;
    for (const day of days) {
      if (day.isOpened) opened += 1;
      if (day.state === "completed") completed += 1;
    }
    return { opened, completed };
  }, [days]);

  const hasUnlockedDay = days.some((day) => day.isUnlocked);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light/75">
            Dicembre, un giorno alla volta
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-cream-50 sm:text-2xl">
            Il Calendario dell&apos;Avvento
          </h2>
          <p className="mt-1 text-sm text-cream-300/65">
            {counts.opened} di 24 giorni aperti · {counts.completed} completati
            {!hasUnlockedDay && " · il primo giorno si aprirà il 1° dicembre"}
          </p>
        </div>
        <span className="rounded-full border border-gold/35 bg-gold/10 px-3.5 py-1.5 text-sm font-bold tabular-nums text-gold-light">
          {counts.opened}/24
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 sm:gap-2 lg:grid-cols-12">
        {days.map((day) => {
          const isPending = pendingDay === day.dayNumber;
          const isLocked = day.state === "locked";

          return (
            <motion.button
              key={day.dayNumber}
              type="button"
              disabled={isLocked || isPending}
              onClick={() => onOpenDay(day.dayNumber)}
              aria-label={`Giorno ${day.dayNumber}, ${STATE_LABEL[day.state].toLowerCase()}${
                day.isUnlocked && day.title ? `: ${day.title}` : ""
              }`}
              whileHover={
                !isLocked && !isPending && !reducedMotion
                  ? { y: -2, scale: 1.02 }
                  : undefined
              }
              whileTap={
                !isLocked && !isPending && !reducedMotion ? { scale: 0.97 } : undefined
              }
              className={cn(
                "relative flex aspect-square min-h-12 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border px-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pine-950 sm:rounded-2xl",
                STATE_STYLE[day.state],
                isPending && "animate-pulse"
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-1.5 h-px rounded-full bg-current opacity-20"
              />
              <span className="text-base font-bold leading-none tabular-nums sm:text-lg">
                {day.dayNumber}
              </span>
              {isPending ? (
                <span className="text-[8px] uppercase tracking-[0.12em] opacity-80">
                  Apro…
                </span>
              ) : day.state === "completed" ? (
                <span className="flex items-center gap-0.5 text-[8px] uppercase tracking-[0.1em]">
                  <NavIcon name="check" className="h-2.5 w-2.5" />
                  Fatto
                </span>
              ) : day.state === "opened" ? (
                <span className="text-[8px] uppercase tracking-[0.1em]">Aperto</span>
              ) : day.state === "available" ? (
                <span className="text-[8px] font-semibold uppercase tracking-[0.1em]">
                  Apri
                </span>
              ) : (
                <NavIcon name="lock" className="h-2.5 w-2.5 opacity-60" />
              )}
            </motion.button>
          );
        })}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-cream-300/65">
        <LegendDot state="locked" />
        <LegendDot state="available" />
        <LegendDot state="opened" />
        <LegendDot state="completed" />
      </ul>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-christmas-red/35 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red-light"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function LegendDot({ state }: { state: DayState }) {
  const styles: Record<DayState, string> = {
    locked: "border-cream-300/20 bg-pine-950/60",
    available: "border-gold/60 bg-gold/40",
    opened: "border-ice-300/50 bg-ice-900/70",
    completed: "border-christmas-red-light/60 bg-christmas-red/80",
  };

  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("h-2.5 w-2.5 rounded-[4px] border", styles[state])}
      />
      {STATE_LABEL[state]}
    </li>
  );
}
