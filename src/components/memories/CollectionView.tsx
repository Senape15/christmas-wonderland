"use client";

import { useState, useTransition } from "react";
import type { CollectionData, SphereItem } from "@/types/memories";
import { openMemorySphereAction } from "@/lib/memories-actions";
import {
  EmptyState,
  MemoryModal,
  PhaseNotice,
  StatChip,
} from "./ui";
import { cn } from "@/lib/utils";

type Tab = "oggetti" | "simboli" | "sfere";

const RARITY_STYLE: Record<string, string> = {
  comune: "bg-cream-300/10 text-cream-200/80",
  raro: "bg-ice-500/20 text-ice-300",
  speciale: "bg-christmas-red/25 text-christmas-red-light",
  leggendario: "bg-gold/25 text-gold-light",
};

export function CollectionView({
  data,
  initialTab = "oggetti",
}: {
  data: CollectionData;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [openSphere, setOpenSphere] = useState<SphereItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleOpenSphere = (sphere: SphereItem) => {
    setError(null);
    startTransition(async () => {
      const result = await openMemorySphereAction({ sphereId: sphere.id });
      if (result.ok && result.sphere) {
        setOpenSphere(result.sphere);
      } else {
        setError(result.error ?? "Non è stato possibile aprire la sfera.");
      }
    });
  };

  const tabs: { key: Tab; label: string; count: string }[] = [
    {
      key: "oggetti",
      label: "Oggetti",
      count: `${data.counts.objectsFound}/${data.counts.objectsTotal}`,
    },
    {
      key: "simboli",
      label: "Simboli",
      count: `${data.counts.symbolsFound}/${data.counts.symbolsTotal}`,
    },
    {
      key: "sfere",
      label: "Sfere",
      count: `${data.counts.spheresFound}/${data.counts.spheresTotal}`,
    },
  ];

  return (
    <div>
      {!data.phase6Ready && <PhaseNotice />}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatChip label="Oggetti" value={`${data.counts.objectsFound}/${data.counts.objectsTotal}`} />
        <StatChip label="Simboli" value={`${data.counts.symbolsFound}/${data.counts.symbolsTotal}`} />
        <StatChip label="Sfere" value={`${data.counts.spheresFound}/${data.counts.spheresTotal}`} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Collezioni">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              tab === item.key
                ? "border-gold bg-gold text-pine-950"
                : "border-cream-300/20 text-cream-200/75 hover:border-gold/50"
            )}
          >
            {item.label} <span className="opacity-70">{item.count}</span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-christmas-red/40 bg-christmas-red/10 px-4 py-2 text-sm text-christmas-red-light">
          {error}
        </p>
      )}

      {tab === "oggetti" &&
        (data.objects.length === 0 ? (
          <EmptyState icon="🎁" title="Nessun oggetto trovato" description="Gli oggetti scoperti nelle caselle e nei regali appariranno qui." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.objects.map((item) => (
              <article
                key={item.id}
                className={cn(
                  "memory-card rounded-2xl p-4",
                  item.silhouette && "memory-silhouette"
                )}
              >
                <div className="mb-3 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-pine-950/70">
                  {item.imageUrl && !item.silhouette ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl" aria-hidden="true">
                      {item.silhouette ? "❔" : "🎁"}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-sm font-semibold text-cream-50">
                  {item.silhouette ? "Oggetto misterioso" : item.name}
                </h3>
                {!item.silhouette && (
                  <>
                    <p className="mt-1 text-xs leading-relaxed text-cream-300/70">
                      {item.description}
                    </p>
                    {item.specialDescription && (
                      <p className="mt-2 rounded-lg bg-gold/10 px-2 py-1 text-xs italic text-gold-light">
                        {item.specialDescription}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={cn("rounded-full px-2 py-0.5", RARITY_STYLE[item.rarity] ?? RARITY_STYLE.comune)}>
                        {item.rarity}
                      </span>
                      <span className="text-cream-300/60">{item.category}</span>
                      {item.dayNumber !== null && (
                        <span className="ml-auto text-cream-300/60">Giorno {item.dayNumber}</span>
                      )}
                    </div>
                  </>
                )}
                {item.acquiredAtLabel && (
                  <p className="mt-2 text-[11px] text-cream-300/50">
                    Ottenuto il {item.acquiredAtLabel}
                  </p>
                )}
              </article>
            ))}
          </div>
        ))}

      {tab === "simboli" &&
        (data.symbols.length === 0 ? (
          <EmptyState icon="⭐" title="Nessun simbolo trovato" description="I simboli natalizi si sbloccano aprendo i regali e rispettando le condizioni di scoperta." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.symbols.map((symbol) => (
              <article
                key={symbol.id}
                className={cn(
                  "memory-card rounded-2xl p-4 text-center",
                  symbol.silhouette && "memory-silhouette"
                )}
              >
                <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-gold/30 bg-pine-950/70 text-3xl">
                  {symbol.silhouette ? "❔" : symbol.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={symbol.imageUrl} alt={symbol.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    "⭐"
                  )}
                </div>
                <h3 className="font-display text-sm font-semibold text-cream-50">
                  {symbol.silhouette ? "Da scoprire" : symbol.name}
                </h3>
                {!symbol.silhouette && (
                  <p className="mt-1 text-xs text-cream-300/70">{symbol.description}</p>
                )}
                <p className="mt-2 text-[11px] text-gold-light/70">
                  {symbol.dayNumber !== null ? `Giorno ${symbol.dayNumber}` : "Senza giorno"}
                </p>
              </article>
            ))}
          </div>
        ))}

      {tab === "sfere" &&
        (data.spheres.length === 0 ? (
          <EmptyState icon="🔮" title="Nessuna sfera sbloccata" description="Le sfere della memoria compaiono quando apri i giorni che le contengono e soddisfi le loro condizioni." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.spheres.map((sphere) => (
              <article
                key={sphere.id}
                className={cn(
                  "memory-card rounded-2xl p-5 text-center",
                  sphere.isNew && "memory-card-new"
                )}
              >
                <div className="memory-sphere mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-ice-300/50 bg-ice-500/10 text-3xl">
                  <span className="memory-sphere-sparkle" aria-hidden="true">✨</span>
                </div>
                <h3 className="font-display text-sm font-semibold text-cream-50">
                  {sphere.title}
                </h3>
                {sphere.note && (
                  <p className="mt-1 line-clamp-2 text-xs text-cream-300/70">{sphere.note}</p>
                )}
                <p className="mt-2 text-[11px] text-cream-300/50">
                  {sphere.dayNumber !== null ? `Giorno ${sphere.dayNumber}` : "Ricordo speciale"}
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenSphere(sphere)}
                  disabled={pending}
                  className="mt-4 rounded-full border border-gold/60 px-4 py-1.5 text-xs font-semibold text-gold-light transition-colors hover:bg-gold hover:text-pine-950 disabled:opacity-50"
                >
                  {pending ? "Apertura…" : sphere.isNew ? "Apri la nuova sfera" : "Rileggi"}
                </button>
              </article>
            ))}
          </div>
        ))}

      {openSphere && (
        <MemoryModal title={openSphere.title} onClose={() => setOpenSphere(null)}>
          <div className="space-y-3 text-sm leading-relaxed text-cream-100/90">
            <p className="text-xs text-gold-light/80">
              {openSphere.unlockedAtLabel
                ? `Sbloccata il ${openSphere.unlockedAtLabel}`
                : "Sfera della memoria"}
            </p>
            {openSphere.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={openSphere.photoUrl} alt={openSphere.title} className="max-h-72 w-full rounded-2xl object-cover" />
            )}
            <p className="whitespace-pre-wrap">{openSphere.note ?? "Un ricordo speciale del tuo Avvento."}</p>
          </div>
        </MemoryModal>
      )}
    </div>
  );
}
