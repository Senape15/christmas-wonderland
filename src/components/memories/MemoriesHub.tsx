"use client";

import { useState } from "react";
import Link from "next/link";
import { AlbumView } from "@/components/memories/AlbumView";
import { CollectionView } from "@/components/memories/CollectionView";
import { TimelineView } from "@/components/memories/TimelineView";
import { NavIcon } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils";
import type { AlbumData, CollectionData, TimelineData } from "@/types/memories";

type Tab = "giornate" | "ricordi" | "sfere";

export function MemoriesHub({
  timeline,
  album,
  collection,
}: {
  timeline: TimelineData;
  album: AlbumData;
  collection: CollectionData;
}) {
  const [tab, setTab] = useState<Tab>("giornate");

  const openedDays = timeline.days.filter((day) => day.isOpened).length;

  const tabs: { key: Tab; label: string; icon: "timeline" | "album" | "sphere"; count: string }[] = [
    {
      key: "giornate",
      label: "Giornate",
      icon: "timeline",
      count: `${openedDays}/24`,
    },
    {
      key: "ricordi",
      label: "Ricordi",
      icon: "album",
      count: String(album.entries.length),
    },
    {
      key: "sfere",
      label: "Sfere",
      icon: "sphere",
      count: `${collection.counts.spheresFound}/${collection.counts.spheresTotal}`,
    },
  ];

  return (
    <div>
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-cream-300/12 bg-cream-50/[0.03] p-3 text-center">
          <p className="text-lg font-bold tabular-nums text-cream-50">{openedDays}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream-300/50">
            Giornate
          </p>
        </div>
        <div className="rounded-2xl border border-cream-300/12 bg-cream-50/[0.03] p-3 text-center">
          <p className="text-lg font-bold tabular-nums text-cream-50">
            {album.entries.length}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream-300/50">
            Ricordi
          </p>
        </div>
        <div className="rounded-2xl border border-cream-300/12 bg-cream-50/[0.03] p-3 text-center">
          <p className="text-lg font-bold tabular-nums text-cream-50">
            {collection.counts.spheresFound}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream-300/50">
            Sfere
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Ricordi">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
              tab === item.key
                ? "border-gold bg-gold text-pine-950"
                : "border-cream-300/20 text-cream-200/75 hover:border-gold/50 hover:text-cream-50"
            )}
          >
            <NavIcon name={item.icon} className="h-4 w-4" />
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                tab === item.key ? "bg-pine-950/15" : "bg-cream-50/10"
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "giornate" && <TimelineView data={timeline} />}
      {tab === "ricordi" && <AlbumView data={album} />}
      {tab === "sfere" && (
        <CollectionView data={collection} initialTab="sfere" />
      )}

      <Link
        href="/dashboard/ricordo-24"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.07] p-4 transition-colors hover:border-gold/60 hover:bg-gold/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold-light">
          <NavIcon name="gift" className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-cream-50">
            Il ricordo del 24 dicembre
          </span>
          <span className="block text-[11px] text-cream-300/55">
            Il riepilogo del viaggio e la rivelazione finale
          </span>
        </span>
        <NavIcon name="chevronRight" className="h-4 w-4 text-gold-light" />
      </Link>
    </div>
  );
}
