"use client";

import { useMemo, useState } from "react";
import type { ClueItem } from "@/types/memories";
import {
  EmptyState,
  FilterBar,
  MemoryModal,
  PhaseNotice,
} from "./ui";

export function CluesView({
  data,
}: {
  data: { clues: ClueItem[]; groups: { value: string; label: string; count: number }[]; phase6Ready: boolean };
}) {
  const [group, setGroup] = useState("");
  const [selected, setSelected] = useState<ClueItem | null>(null);

  const clues = useMemo(
    () =>
      data.clues.filter((clue) => {
        if (!group) return true;
        if (group === "senza-gruppo") return clue.group === null;
        return clue.group === group;
      }),
    [data.clues, group]
  );

  return (
    <div>
      {!data.phase6Ready && <PhaseNotice />}

      <FilterBar
        label="Gruppo di indizi"
        options={data.groups}
        value={group}
        onChange={setGroup}
        allLabel="Tutti gli indizi"
      />

      {clues.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nessun indizio raccolto"
          description="Gli indizi scoperti saranno raccolti qui. Potrai rileggerli e collegarli tra loro senza anticipare la soluzione."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {clues.map((clue) => (
            <button
              key={clue.id}
              type="button"
              onClick={() => setSelected(clue)}
              className="memory-card rounded-2xl p-4 text-left"
            >
              <div className="flex items-center gap-2 text-[11px] text-cream-300/60">
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-light">
                  {clue.sourceLabel}
                </span>
                {clue.group && <span>{clue.group}</span>}
              </div>
              <h3 className="mt-2 font-display text-base font-semibold text-cream-50">
                {clue.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-cream-200/75">
                {clue.description}
              </p>
              {clue.related.length > 0 && (
                <p className="mt-2 text-[11px] text-ice-300/80">
                  Collegato a: {clue.related.map((item) => item.title).join(", ")}
                </p>
              )}
              <p className="mt-2 text-[11px] text-cream-300/50">
                Trovato il {clue.acquiredAtLabel}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <MemoryModal title={selected.title} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm leading-relaxed text-cream-100/90">
            <p className="text-xs text-gold-light/80">
              {selected.sourceLabel} · {selected.acquiredAtLabel}
            </p>
            {selected.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.imageUrl} alt={selected.title} className="max-h-72 w-full rounded-2xl object-cover" />
            )}
            <p className="whitespace-pre-wrap">{selected.content}</p>
            {selected.related.length > 0 && (
              <div className="border-t border-gold/20 pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
                  Indizi collegati
                </h4>
                <ul className="mt-2 space-y-1">
                  {selected.related.map((link) => (
                    <li key={link.id} className="text-xs text-cream-200/80">
                      • {link.title}
                      {link.dayNumber !== null ? ` (giorno ${link.dayNumber})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </MemoryModal>
      )}
    </div>
  );
}
