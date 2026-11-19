"use client";

import { useEffect, useRef } from "react";
import type { FilterOption } from "@/types/memories";
import { cn } from "@/lib/utils";

export function FilterBar({
  label,
  options,
  value,
  onChange,
  allLabel = "Tutti",
}: {
  label: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
}) {
  if (options.length === 0) return null;

  return (
    <fieldset className="mb-6">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-light/80">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          aria-pressed={value === ""}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === ""
              ? "border-gold bg-gold text-pine-950"
              : "border-cream-300/20 text-cream-200/75 hover:border-gold/50 hover:text-cream-50"
          )}
        >
          {allLabel}
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              value === option.value
                ? "border-gold bg-gold text-pine-950"
                : "border-cream-300/20 text-cream-200/75 hover:border-gold/50 hover:text-cream-50"
            )}
          >
            {option.label}
            <span className="rounded-full bg-cream-300/15 px-1.5 text-[10px]">
              {option.count}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function EmptyState({
  title,
  description,
  icon = "✨",
}: {
  title: string;
  description: string;
  icon?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gold/25 bg-pine-900/40 px-6 py-12 text-center">
      <div className="text-3xl" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold text-cream-100">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cream-300/70">
        {description}
      </p>
    </div>
  );
}

export function PhaseNotice() {
  return (
    <div
      role="status"
      className="mb-6 rounded-2xl border border-ice-300/35 bg-ice-900/40 px-4 py-3 text-sm text-ice-200"
    >
      <strong className="font-semibold">Sezione non ancora attiva.</strong>{" "}
      Per salvare i ricordi è necessario eseguire la migrazione{" "}
      <code className="rounded bg-pine-950/60 px-1">006_memories_and_collections.sql</code>{" "}
      nel progetto Supabase. Fino ad allora questa pagina mostra i dati già
      disponibili delle fasi precedenti.
    </div>
  );
}

export function StatChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-cream-300/15 bg-pine-950/50 px-3 py-2 text-center">
      <div className="font-display text-lg font-bold text-gold-light">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-cream-300/60">
        {label}
      </div>
    </div>
  );
}

export function MemoryModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pine-950/85 p-4 backdrop-blur"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="memory-card max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="font-display text-xl font-bold text-gold-light">{title}</h3>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-cream-300/25 px-3 py-1 text-sm text-cream-200 transition-colors hover:border-gold hover:text-gold-light"
          >
            Chiudi
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
