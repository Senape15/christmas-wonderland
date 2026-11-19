"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deletePhysicalPassword,
  setPhysicalPassword,
} from "@/lib/admin/special-actions";
import type { PasswordConfig } from "@/lib/services/admin";
import { Toast } from "./ui";

interface PasswordContent {
  id: string;
  title: string;
  dayNumber: number;
}

export function PasswordManager({
  contents,
  configs,
}: {
  contents: PasswordContent[];
  configs: PasswordConfig[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [form, setForm] = useState<Record<string, Record<string, string | boolean>>>({});

  function field(id: string, config: PasswordConfig, name: string, fallback: string | boolean) {
    return form[id]?.[name] ?? fallback;
  }

  function setField(id: string, name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [id]: { ...(current[id] ?? {}), [name]: value } }));
  }

  function save(content: PasswordContent, config: PasswordConfig) {
    startTransition(async () => {
      const maxAttemptsRaw = String(field(content.id, config, "maxAttempts", String(config.maxAttempts ?? "")));
      const result = await setPhysicalPassword({
        contentId: content.id,
        password: String(field(content.id, config, "password", "")),
        hint: String(field(content.id, config, "hint", config.hint)),
        successMessage: String(field(content.id, config, "successMessage", config.successMessage)),
        maxAttempts: maxAttemptsRaw === "" ? null : Number(maxAttemptsRaw),
        isActive: Boolean(field(content.id, config, "isActive", config.isActive)),
      });
      setToast({
        message: result.ok ? "Password salvata (solo hash lato server)." : (result.error ?? "Errore."),
        tone: result.ok ? "success" : "error",
      });
      if (result.ok) {
        setForm((current) => ({
          ...current,
          [content.id]: { ...(current[content.id] ?? {}), password: "" },
        }));
        router.refresh();
      }
    });
  }

  function remove(contentId: string) {
    startTransition(async () => {
      const result = await deletePhysicalPassword(contentId);
      setToast({ message: result.ok ? "Password rimossa." : (result.error ?? "Errore."), tone: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  }

  if (contents.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-cream-300/20 p-5 text-sm text-cream-200/60">
        Nessun contenuto di tipo PASSWORD. Creane uno nella tabella qui sopra per configurare una password.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {contents.map((content) => {
        const config = configs.find((item) => item.contentId === content.id);
        if (!config) return null;
        return (
          <div key={content.id} className="rounded-2xl border border-cream-300/15 bg-cream-50/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-cream-50">{content.title}</p>
                <p className="text-xs text-cream-200/55">
                  Giorno {content.dayNumber} · {config.hasPassword ? "Password configurata" : "Nessuna password"} ·{" "}
                  {config.attempts} tentativi · {config.completed} completamenti
                </p>
              </div>
              {config.hasPassword && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(content.id)}
                  className="rounded-md border border-christmas-red/40 px-3 py-1.5 text-xs text-christmas-red-light"
                >
                  Rimuovi password
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-cream-200/70">Nuova password (non salvata in chiaro)</span>
                <input
                  type="password"
                  value={String(field(content.id, config, "password", ""))}
                  onChange={(event) => setField(content.id, "password", event.target.value)}
                  className="w-full rounded-lg border border-cream-300/20 bg-pine-950 px-3 py-2 text-sm"
                  placeholder={config.hasPassword ? "Lascia vuoto per non cambiarla" : "Inserisci password"}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-cream-200/70">Suggerimento</span>
                <input
                  value={String(field(content.id, config, "hint", config.hint))}
                  onChange={(event) => setField(content.id, "hint", event.target.value)}
                  className="w-full rounded-lg border border-cream-300/20 bg-pine-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs text-cream-200/70">Messaggio di sblocco</span>
                <textarea
                  rows={2}
                  value={String(field(content.id, config, "successMessage", config.successMessage))}
                  onChange={(event) => setField(content.id, "successMessage", event.target.value)}
                  className="w-full rounded-lg border border-cream-300/20 bg-pine-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-cream-200/70">Tentativi massimi (vuoto = illimitati)</span>
                <input
                  type="number"
                  min={1}
                  value={String(field(content.id, config, "maxAttempts", String(config.maxAttempts ?? "")))}
                  onChange={(event) => setField(content.id, "maxAttempts", event.target.value)}
                  className="w-full rounded-lg border border-cream-300/20 bg-pine-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="mt-6 flex items-center gap-2 text-sm text-cream-100/80">
                <input
                  type="checkbox"
                  checked={Boolean(field(content.id, config, "isActive", config.isActive))}
                  onChange={(event) => setField(content.id, "isActive", event.target.checked)}
                  className="h-4 w-4 accent-gold"
                />
                Attiva verifica password
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={() => save(content, config)}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-pine-950 disabled:opacity-50"
              >
                Salva password
              </button>
            </div>
          </div>
        );
      })}
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}
