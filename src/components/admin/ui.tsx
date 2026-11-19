"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-cream-50 sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm text-cream-200/65">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "gold",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "gold" | "red" | "ice" | "pine";
}) {
  const tones = {
    gold: "text-gold-light border-gold/30",
    red: "text-christmas-red-light border-christmas-red/30",
    ice: "text-ice-300 border-ice-300/30",
    pine: "text-pine-300 border-pine-300/30",
  } as const;

  return (
    <div className={cn("rounded-2xl border bg-cream-50/5 p-4", tones[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-cream-200/60">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-cream-200/50">{hint}</p>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-cream-300/20 px-6 py-12 text-center text-sm text-cream-200/60">
      {message}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-900/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-cream-300/20 bg-pine-900 shadow-2xl",
          wide ? "max-w-4xl" : "max-w-xl"
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cream-300/10 bg-pine-900 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-cream-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-full border border-cream-300/20 px-2.5 py-1 text-cream-200/70 hover:border-gold/50 hover:text-gold-light"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm leading-relaxed text-cream-100/85">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-cream-300/20 px-4 py-2 text-sm text-cream-100 hover:border-cream-300/50"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-christmas-red px-4 py-2 text-sm font-semibold text-white hover:bg-christmas-red-dark"
        >
          Elimina
        </button>
      </div>
    </Modal>
  );
}

export function Toast({
  message,
  tone = "success",
  onClose,
}: {
  message: string;
  tone?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl",
        tone === "success"
          ? "border-gold/50 bg-pine-900 text-cream-50"
          : "border-christmas-red/50 bg-pine-900 text-christmas-red-light"
      )}
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Chiudi notifica" className="ml-auto opacity-60 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}
