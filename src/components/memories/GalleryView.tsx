"use client";

import { useMemo, useState } from "react";
import type { GalleryData } from "@/types/memories";
import { EmptyState, FilterBar, PhaseNotice } from "./ui";

export function GalleryView({ data }: { data: GalleryData }) {
  const [day, setDay] = useState("");
  const [category, setCategory] = useState("");
  const [index, setIndex] = useState<number | null>(null);

  const images = useMemo(
    () =>
      data.images.filter((image) => {
        if (category && image.category !== category) return false;
        if (day && image.dayNumber !== Number(day)) return false;
        return true;
      }),
    [data.images, category, day]
  );

  const current = index !== null ? images[index] : null;
  const move = (delta: number) => {
    if (index === null || images.length === 0) return;
    setIndex((index + delta + images.length) % images.length);
  };

  return (
    <div>
      {!data.phase6Ready && <PhaseNotice />}

      <div className="grid gap-4 sm:grid-cols-2">
        <FilterBar label="Categoria" options={data.categories} value={category} onChange={setCategory} allLabel="Tutte le categorie" />
        <FilterBar label="Giorno" options={data.days} value={day} onChange={setDay} allLabel="Tutti i giorni" />
      </div>

      {images.length === 0 ? (
        <EmptyState icon="📸" title="La galleria è vuota" description="Le immagini dei contenuti, dei regali, dei ricordi e delle sfere compariranno qui." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, imageIndex) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(imageIndex)}
              className="memory-card group relative aspect-square overflow-hidden rounded-xl p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-pine-950/90 to-transparent px-2 pb-2 pt-6 text-left text-[11px] text-cream-100">
                {image.alt}
              </span>
            </button>
          ))}
        </div>
      )}

      {current && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pine-950/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIndex(null);
            if (event.key === "ArrowLeft") move(-1);
            if (event.key === "ArrowRight") move(1);
          }}
          tabIndex={-1}
        >
          <div className="mb-3 flex w-full max-w-3xl items-center justify-between gap-4 text-sm text-cream-200">
            <button type="button" onClick={() => setIndex(null)} className="rounded-full border border-cream-300/25 px-3 py-1">
              Chiudi
            </button>
            <span>{index! + 1} di {images.length}</span>
          </div>
          <div className="relative max-h-[70vh] w-full max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} alt={current.alt} className="max-h-[70vh] w-full rounded-2xl object-contain" />
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Immagine precedente"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-pine-950/80 px-3 py-2 text-lg text-cream-100"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Immagine successiva"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-pine-950/80 px-3 py-2 text-lg text-cream-100"
            >
              →
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-cream-300/70">
            {current.alt} · {current.category}
            {current.dayNumber !== null ? ` · Giorno ${current.dayNumber}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
