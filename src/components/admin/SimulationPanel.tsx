"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearSimulation, saveSimulation } from "@/lib/admin/special-actions";
import { buildSimulationPreview, isSimulationDateValid } from "@/lib/admin/simulation";
import type { DayOverviewRow, SimulationState } from "@/lib/services/admin";
import { SectionHeader, Toast } from "./ui";

export function SimulationPanel({
  days,
  simulation,
}: {
  days: DayOverviewRow[];
  simulation: SimulationState;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(simulation.date ?? "2026-12-24");
  const [note, setNote] = useState(simulation.note);
  const [active, setActive] = useState(simulation.active);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const preview = useMemo(
    () =>
      isSimulationDateValid(date)
        ? buildSimulationPreview(
            days.map((day) => ({
              day_number: day.dayNumber,
              title: day.title,
              unlock_date: day.unlockDate,
            })),
            date
          )
        : [],
    [days, date]
  );
  const unlockedCount = preview.filter((day) => day.wouldBeUnlocked).length;

  function save() {
    startTransition(async () => {
      const result = await saveSimulation({ date, note, active });
      setToast({
        message: result.ok ? "Simulazione salvata (solo anteprima admin)." : (result.error ?? "Errore."),
        tone: result.ok ? "success" : "error",
      });
      if (result.ok) router.refresh();
    });
  }

  function clear() {
    startTransition(async () => {
      const result = await clearSimulation();
      setToast({ message: result.ok ? "Simulazione rimossa." : (result.error ?? "Errore."), tone: result.ok ? "success" : "error" });
      if (result.ok) {
        setActive(false);
        router.refresh();
      }
    });
  }

  const input = "w-full rounded-lg border border-cream-300/20 bg-pine-950 px-3 py-2 text-sm";

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Simulazione date"
        description="Anteprima amministrativa: verifica quali contenuti sarebbero visibili in una data, senza modificarli."
      />

      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm leading-relaxed text-cream-100/85">
        <p className="font-semibold text-gold-light">Nessun dato reale viene modificato.</p>
        <p className="mt-1 text-cream-200/70">
          La simulazione non cambia la data di sistema, i progressi degli utenti, i giorni aperti,
          le sorprese sbloccate né i controlli server-side: serve solo a mostrare un&apos;anteprima.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Data da simulare</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-cream-200/70">Nota interna</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={input} placeholder="Es. verifica giornata 12" />
        </label>
        <label className="flex items-center gap-2 text-sm text-cream-100/80">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-gold" />
          Simulazione attiva
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={save} disabled={pending || !isSimulationDateValid(date)} className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-pine-950 disabled:opacity-50">
          Salva simulazione
        </button>
        <button type="button" onClick={clear} disabled={pending} className="rounded-lg border border-cream-300/25 px-5 py-2 text-sm text-cream-100 disabled:opacity-50">
          Rimuovi simulazione
        </button>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-cream-50">Anteprima al {date}</h2>
            <p className="text-sm text-cream-200/60">
              {unlockedCount} di {days.length} giorni sarebbero sbloccati.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {preview.map((day) => (
            <div
              key={day.dayNumber}
              className={`rounded-xl border p-3 ${
                day.wouldBeUnlocked
                  ? "border-ice-300/40 bg-ice-300/10"
                  : "border-cream-300/15 bg-cream-50/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold text-gold-light">
                  {String(day.dayNumber).padStart(2, "0")}
                </span>
                <span className="text-[10px] uppercase text-cream-200/50">
                  {day.wouldBeUnlocked ? "disponibile" : "bloccato"}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-cream-100/85" title={day.title}>{day.title}</p>
            </div>
          ))}
        </div>
      </section>

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}
