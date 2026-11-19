"use client";

import { useMemo, useState } from "react";
import type { AlbumData } from "@/types/memories";
import {
  EmptyState,
  FilterBar,
  MemoryModal,
  PhaseNotice,
} from "./ui";

export function AlbumView({ data }: { data: AlbumData }) {
  const [kind, setKind] = useState("");
  const [day, setDay] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      data.entries.filter((entry) => {
        if (kind && entry.kind !== kind) return false;
        if (day && entry.dayNumber !== Number(day)) return false;
        return true;
      }),
    [data.entries, kind, day]
  );

  const selectedIndex = entries.findIndex((entry) => entry.id === selectedId);
  const selected = selectedIndex >= 0 ? entries[selectedIndex]! : null;

  const move = (delta: number) => {
    if (selectedIndex < 0) return;
    const next = (selectedIndex + delta + entries.length) % entries.length;
    setSelectedId(entries[next]!.id);
  };

  return (
    <div>
      {!data.phase6Ready && <PhaseNotice />}

      <div className="grid gap-4 sm:grid-cols-2">
        <FilterBar
          label="Tipologia"
          options={data.kinds}
          value={kind}
          onChange={setKind}
          allLabel="Tutte le tipologie"
        />
        <FilterBar
          label="Giorno"
          options={data.days}
          value={day}
          onChange={setDay}
          allLabel="Tutti i giorni"
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon="🖼️"
          title="Nessun ricordo da sfogliare"
          description="Le lettere, le foto e i momenti speciali scoprirai durante l'Avvento compariranno qui."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedId(entry.id)}
              className="memory-card group overflow-hidden rounded-2xl p-0 text-left"
            >
              <div className="relative h-36 overflow-hidden bg-pine-950/60">
                {entry.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl opacity-50">
                    🎄
                  </div>
                )}
                {entry.dayNumber !== null && (
                  <span className="absolute right-2 top-2 rounded-full bg-pine-950/85 px-2 py-1 text-[11px] font-semibold text-gold-light">
                    Giorno {entry.dayNumber}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-[11px] uppercase tracking-wide text-gold-light/80">
                  {entry.kind}
                </p>
                <h3 className="mt-1 line-clamp-2 font-display text-sm font-semibold text-cream-50">
                  {entry.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-cream-300/70">
                  {entry.description}
                </p>
                <p className="mt-3 text-[11px] text-cream-300/50">
                  {entry.acquiredAtLabel}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <MemoryModal
          title={selected.title}
          onClose={() => setSelectedId(null)}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-cream-300/70">
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-light">
                {selected.kind}
              </span>
              {selected.dayNumber !== null && (
                <span>Giorno {selected.dayNumber}</span>
              )}
              <span className="ml-auto">Scoperto il {selected.acquiredAtLabel}</span>
            </div>
            {selected.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.imageUrl}
                alt={selected.title}
                className="max-h-80 w-full rounded-2xl object-cover"
              />
            )}
            {selected.content && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-100/90">
                {selected.content}
              </p>
            )}
            <div className="flex items-center justify-between border-t border-gold/20 pt-4">
              <button
                type="button"
                onClick={() => move(-1)}
                className="rounded-full border border-cream-300/25 px-4 py-1.5 text-sm text-cream-200 hover:border-gold hover:text-gold-light"
              >
                ← Precedente
              </button>
              <span className="text-xs text-cream-300/60">
                {selectedIndex + 1} di {entries.length}
              </span>
              <button
                type="button"
                onClick={() => move(1)}
                className="rounded-full border border-cream-300/25 px-4 py-1.5 text-sm text-cream-200 hover:border-gold hover:text-gold-light"
              >
                Successiva →
              </button>
            </div>
          </div>
        </MemoryModal>
      )}
    </div>
  );
}
