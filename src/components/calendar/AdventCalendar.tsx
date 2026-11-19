"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
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
    "cursor-not-allowed border-cream-300/10 bg-pine-950/50 text-cream-300/40",
  available:
    "cursor-pointer border-gold/60 bg-gold/15 text-gold-light hover:bg-gold/25",
  opened:
    "cursor-pointer border-ice-300/50 bg-ice-900/40 text-ice-300 hover:bg-ice-900/60",
  completed:
    "cursor-pointer border-christmas-red-light/60 bg-christmas-red/80 text-cream-50 shadow-[var(--shadow-glow-red)] hover:bg-christmas-red",
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
          <h2 className="text-xl font-bold text-cream-50">
            Il Calendario dell&apos;Avvento
          </h2>
          <p className="mt-1 text-sm text-cream-300/70">
            {counts.opened} di 24 giorni aperti · {counts.completed} completati
            {!hasUnlockedDay && " · il primo giorno si aprirà il 1° dicembre"}
          </p>
        </div>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm font-semibold text-gold-light">
          {counts.opened}/24
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
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
                !isLocked && !isPending && !reducedMotion ? { scale: 1.04 } : undefined
              }
              whileTap={
                !isLocked && !isPending && !reducedMotion ? { scale: 0.97 } : undefined
              }
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pine-900",
                STATE_STYLE[day.state],
                isPending && "animate-pulse"
              )}
            >
              <span className="text-lg leading-none">{day.dayNumber}</span>
              {isPending ? (
                <span className="text-[10px] uppercase tracking-wide">…</span>
              ) : day.state === "completed" ? (
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide">
                  <CheckIcon />
                  Fatto
                </span>
              ) : day.state === "opened" ? (
                <span className="text-[10px] uppercase tracking-wide">Aperto</span>
              ) : day.state === "available" ? (
                <span className="text-[10px] uppercase tracking-wide">Apri</span>
              ) : (
                <LockIcon />
              )}
            </motion.button>
          );
        })}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-cream-300/70">
        <LegendDot state="locked" />
        <LegendDot state="available" />
        <LegendDot state="opened" />
        <LegendDot state="completed" />
      </ul>

      {error && (
        <p role="alert" className="text-sm text-christmas-red-light">
          {error}
        </p>
      )}
    </div>
  );
}

function LegendDot({ state }: { state: DayState }) {
  const styles: Record<DayState, string> = {
    locked: "border-cream-300/20 bg-pine-950/60",
    available: "border-gold/60 bg-gold/20",
    opened: "border-ice-300/50 bg-ice-900/40",
    completed: "border-christmas-red-light/60 bg-christmas-red/70",
  };

  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("h-3 w-3 rounded-sm border", styles[state])}
      />
      {STATE_LABEL[state]}
    </li>
  );
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
