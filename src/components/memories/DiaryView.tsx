"use client";

import { useMemo, useState } from "react";
import type { DiaryData } from "@/types/memories";
import { EmptyState, FilterBar, PhaseNotice } from "./ui";
import { cn } from "@/lib/utils";

export function DiaryView({ data }: { data: DiaryData }) {
  const [category, setCategory] = useState("");
  const [day, setDay] = useState("");

  const events = useMemo(
    () =>
      data.events.filter((event) => {
        if (category && event.category !== category) return false;
        if (day && event.dayNumber !== Number(day)) return false;
        return true;
      }),
    [data.events, category, day]
  );

  return (
    <div>
      {!data.phase6Ready && <PhaseNotice />}

      <div className="grid gap-4 sm:grid-cols-2">
        <FilterBar
          label="Categoria"
          options={data.categories}
          value={category}
          onChange={setCategory}
          allLabel="Tutte le categorie"
        />
        <FilterBar
          label="Giorno"
          options={data.days}
          value={day}
          onChange={setDay}
          allLabel="Tutti i giorni"
        />
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon="📖"
          title="Il diario è ancora vuoto"
          description="Ogni apertura, indizio o traguardo verrà annotato qui automaticamente. Torna dopo aver aperto la prima casella."
        />
      ) : (
        <ol className="relative space-y-4 border-l border-gold/25 pl-5 sm:pl-7">
          {events.map((event) => (
            <li key={event.eventKey} className="relative">
              <span
                className="absolute -left-[26px] top-5 h-3 w-3 rounded-full border-2 border-gold bg-pine-900 sm:-left-[34px]"
                aria-hidden="true"
              />
              <article className="memory-card rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 font-semibold uppercase tracking-wide text-gold-light">
                    {event.category}
                  </span>
                  {event.dayNumber !== null && (
                    <span className="rounded-full bg-cream-300/10 px-2 py-0.5 text-cream-200/80">
                      Giorno {event.dayNumber}
                    </span>
                  )}
                  <time
                    dateTime={event.occurredAt}
                    className={cn("ml-auto text-cream-300/60")}
                  >
                    {event.occurredAtLabel}
                  </time>
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-cream-50">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="mt-1 text-sm leading-relaxed text-cream-200/75">
                    {event.description}
                  </p>
                )}
                {event.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    loading="lazy"
                    className="mt-3 max-h-56 w-full rounded-xl object-cover"
                  />
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
