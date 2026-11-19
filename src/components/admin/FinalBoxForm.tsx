"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFinalBox } from "@/lib/admin/special-actions";
import { uploadAdminImage } from "@/lib/admin/actions";
import type { FinalBoxRow } from "@/lib/services/admin";
import { Toast } from "./ui";

const asText = (value: unknown) =>
  value === null || value === undefined
    ? ""
    : typeof value === "string"
      ? value
      : JSON.stringify(value, null, 2);

export function FinalBoxForm({
  initial,
  phase6Ready = false,
  giftOptions = [],
}: {
  initial: FinalBoxRow | null;
  phase6Ready?: boolean;
  giftOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({
    name: asText(initial?.name ?? "La scatola finale"),
    description: asText(initial?.description),
    image_url: asText(initial?.image_url),
    shape: asText(initial?.shape ?? "chest"),
    color: asText(initial?.color ?? "#c41e3a"),
    decorations: asText(initial?.decorations ?? []),
    symbol: asText(initial?.symbol),
    intro_message: asText(initial?.intro_message),
    clues: asText(initial?.clues ?? []),
    objects: asText(initial?.objects ?? []),
    password_enabled: Boolean(initial?.password_enabled),
    password: "",
    password_hint: asText(initial?.password_hint),
    opening_sequence: asText(initial?.opening_sequence ?? []),
    final_message: asText(initial?.final_message),
    reveal_day: asText(initial?.reveal_day ?? 24),
    physical_gift_id: asText(initial?.physical_gift_id),
    is_active: Boolean(initial?.is_active ?? true),
  });

  function set(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function upload(file: File | undefined) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    setUploading(true);
    startTransition(async () => {
      const result = await uploadAdminImage(data);
      setUploading(false);
      if (result.ok && result.data) {
        set("image_url", result.data.url);
        setToast({ message: "Immagine caricata.", tone: "success" });
      } else {
        setToast({ message: result.error ?? "Caricamento fallito.", tone: "error" });
      }
    });
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveFinalBox(form);
      setToast({
        message: result.ok ? "Scatola finale salvata." : (result.error ?? "Errore."),
        tone: result.ok ? "success" : "error",
      });
      if (result.ok) {
        set("password", "");
        router.refresh();
      }
    });
  }

  const input = "w-full rounded-lg border border-cream-300/20 bg-pine-950 px-3 py-2 text-sm outline-none focus:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/60";

  return (
    <form onSubmit={save} className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-cream-300/15 bg-cream-50/[0.03] p-5">
        <h2 className="font-display text-lg font-semibold text-cream-50">Aspetto e identità</h2>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Nome</span>
          <input value={String(form.name)} onChange={(e) => set("name", e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Descrizione</span>
          <textarea rows={3} value={String(form.description)} onChange={(e) => set("description", e.target.value)} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-cream-200/70">Forma</span>
            <select value={String(form.shape)} onChange={(e) => set("shape", e.target.value)} className={input}>
              <option value="cube">Cubo</option>
              <option value="chest">Cassa</option>
              <option value="house">Casa</option>
              <option value="book">Libro</option>
              <option value="custom">Personalizzata</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-cream-200/70">Colore</span>
            <input type="color" value={String(form.color)} onChange={(e) => set("color", e.target.value)} className="h-10 w-full rounded-lg border border-cream-300/20 bg-pine-950" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Immagine</span>
          <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} className="text-xs text-cream-200/60" />
          {uploading && <span className="mt-1 block text-xs text-gold-light">Caricamento…</span>}
          {String(form.image_url) && <span className="mt-1 block truncate text-[11px] text-cream-200/40">{String(form.image_url)}</span>}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Decorazioni (JSON lista)</span>
          <textarea rows={3} value={String(form.decorations)} onChange={(e) => set("decorations", e.target.value)} className={`${input} font-mono`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Simbolo</span>
          <input value={String(form.symbol)} onChange={(e) => set("symbol", e.target.value)} className={input} />
        </label>
      </div>

      <div className="space-y-4 rounded-2xl border border-cream-300/15 bg-cream-50/[0.03] p-5">
        <h2 className="font-display text-lg font-semibold text-cream-50">Narrativa e apertura</h2>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Messaggio introduttivo</span>
          <textarea rows={3} value={String(form.intro_message)} onChange={(e) => set("intro_message", e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Indizi (JSON lista)</span>
          <textarea rows={3} value={String(form.clues)} onChange={(e) => set("clues", e.target.value)} className={`${input} font-mono`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Oggetti contenuti (JSON lista)</span>
          <textarea rows={3} value={String(form.objects)} onChange={(e) => set("objects", e.target.value)} className={`${input} font-mono`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Sequenza di apertura (JSON lista)</span>
          <textarea rows={3} value={String(form.opening_sequence)} onChange={(e) => set("opening_sequence", e.target.value)} className={`${input} font-mono`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-cream-200/70">Giorno di rivelazione</span>
            <select value={String(form.reveal_day)} onChange={(e) => set("reveal_day", e.target.value)} className={input}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Giorno {i + 1}</option>
              ))}
            </select>
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm text-cream-100/80">
            <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-gold" />
            Attiva
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Messaggio finale</span>
          <textarea rows={3} value={String(form.final_message)} onChange={(e) => set("final_message", e.target.value)} className={input} />
        </label>
      </div>

      {phase6Ready && (
        <div className="space-y-4 rounded-2xl border border-gold/25 bg-gold/5 p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-gold-light">
            Regalo fisico del 24 dicembre
          </h2>
          <label className="block">
            <span className="mb-1 block text-xs text-cream-200/70">
              Collega il regalo reale (il pupazzo) configurato tra i regali fisici
            </span>
            <select
              value={String(form.physical_gift_id ?? "")}
              onChange={(e) => set("physical_gift_id", e.target.value)}
              className={input}
            >
              <option value="">Nessun regalo collegato</option>
              {giftOptions.map((gift) => (
                <option key={gift.value} value={gift.value}>
                  {gift.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs leading-relaxed text-cream-200/65">
            Il collegamento compare solo nel riepilogo del 24 dicembre, dopo il gate della scatola finale.
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-gold/25 bg-gold/5 p-5 lg:col-span-2">
        <h2 className="font-display text-lg font-semibold text-gold-light">Password finale (opzionale)</h2>
        <label className="flex items-center gap-2 text-sm text-cream-100/80">
          <input type="checkbox" checked={Boolean(form.password_enabled)} onChange={(e) => set("password_enabled", e.target.checked)} className="h-4 w-4 accent-gold" />
          Richiedi password per l&apos;apertura
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-cream-200/70">Password (solo hash lato server)</span>
            <input type="password" value={String(form.password)} onChange={(e) => set("password", e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-cream-200/70">Suggerimento</span>
            <input value={String(form.password_hint)} onChange={(e) => set("password_hint", e.target.value)} className={input} />
          </label>
        </div>
        <p className="rounded-lg border border-christmas-red/30 bg-christmas-red/5 p-3 text-xs leading-relaxed text-cream-200/70">
          Il nome del colpevole e il regalo finale devono comparire solo nel messaggio del 24 dicembre.
          Nessuna anteprima o notifica può rivelarli in anticipo.
        </p>
      </div>

      <div className="lg:col-span-2 flex justify-end">
        <button type="submit" disabled={pending || uploading} className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-pine-950 disabled:opacity-50">
          {pending ? "Salvataggio…" : "Salva configurazione"}
        </button>
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </form>
  );
}
