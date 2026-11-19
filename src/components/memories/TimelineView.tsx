"use client";

import Link from "next/link";
import type { TimelineData } from "@/types/memories";
import { EmptyState, PhaseNotice } from "./ui";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<string, string> = {
  locked: "Da venire",
  available: "Disponibile",
  opened: "Aperto",
  completed: "Completato",
};

const STATE_STYLE: Record<string, string> = {
  locked: "border-cream-300/10 bg-pine-950/50 text-cream-300/40",
  available: "border-gold/50 bg-gold/10 text-gold-light",
  opened: "border-ice-300/40 bg-ice-500/10 text-ice-300",
  completed: "border-pine-400/50 bg-pine-600/20 text-pine-200",
};

export function TimelineView({ data }: { data: TimelineData }) {
  const unlocked = data.days.filter((day) => day.isUnlocked);

  return (
    <div>
      {!data.phase6Ready && <PhaseNotice />}

      {unlocked.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="La cronologia inizia presto"
          description="I giorni si sbloccheranno uno alla volta. Qui compariranno stati, ricordi, oggetti, quiz e indizi di ogni tappa."
        />
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2">
          {data.days.map((day) => (
            <li
              key={day.dayNumber}
              className={cn(
                "memory-card rounded-2xl p-4",
                !day.isUnlocked && "border-cream-300/10 bg-pine-950/40 opacity-60"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-pine-950/60 font-display text-sm font-bold text-gold-light">
                    {day.dayNumber}
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold text-cream-50">
                      {day.title ?? `Giorno ${day.dayNumber}`}
                    </p>
                    <p className="text-[11px] text-cream-300/50">Dicembre</p>
                  </div>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STATE_STYLE[day.state])}>
                  {STATE_LABEL[day.state]}
                </span>
              </div>

              {day.isUnlocked && (
                <>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-cream-200/75">
                    <span>📖 {day.memories} ricordi</span>
                    <span>🎁 {day.objects} oggetti</span>
                    <span>❓ {day.quizzes} quiz</span>
                    <span>🔍 {day.clues} indizi</span>
                  </div>
                  {day.events.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-gold/15 pt-3 text-xs text-cream-200/75">
                      {day.events.slice(0, 3).map((event) => (
                        <li key={event.eventKey}>• {event.title}</li>
                      ))}
                      {day.events.length > 3 && (
                        <li className="text-cream-300/50">
                          …e altri {day.events.length - 3} nel diario
                        </li>
                      )}
                    </ul>
                  )}
                  {day.isOpened && (
                    <Link
                      href={`/dashboard?giorno=${day.dayNumber}`}
                      className="mt-3 inline-block rounded-full border border-gold/50 px-3 py-1 text-[11px] font-semibold text-gold-light hover:bg-gold hover:text-pine-950"
                    >
                      Rivivi il giorno →
                    </Link>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
