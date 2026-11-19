"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { UserProgress } from "@/types/experience";

interface ProgressPanelProps {
  progress: UserProgress;
}

/**
 * Riepilogo dei progressi.
 *
 * I conteggi arrivano già filtrati dal server: includono solo i giorni
 * sbloccati e non duplicano premi o completamenti. La barra è decorativa e
 * il testo accanto riporta sempre gli stessi valori in forma accessibile.
 */
export function ProgressPanel({ progress }: ProgressPanelProps) {
  const reducedMotion = useReducedMotion();
  const percent =
    progress.totalDays > 0
      ? Math.round((progress.daysOpened / progress.totalDays) * 100)
      : 0;
  const completionPercent =
    progress.totalDays > 0
      ? Math.round((progress.daysCompleted / progress.totalDays) * 100)
      : 0;

  const stats: { label: string; value: string; hint?: string }[] = [
    {
      label: "Giorni aperti",
      value: `${progress.daysOpened}/${progress.totalDays}`,
    },
    {
      label: "Giorni completati",
      value: `${progress.daysCompleted}/${progress.totalDays}`,
    },
    {
      label: "Quiz risolti",
      value: `${progress.quizzesCompleted}/${progress.quizzesTotal}`,
    },
    {
      label: "Password trovate",
      value: `${progress.passwordsFound}/${progress.passwordsTotal}`,
    },
    {
      label: "Indizi scoperti",
      value: `${progress.cluesFound}/${progress.cluesTotal}`,
    },
    {
      label: "Regali scoperti",
      value: `${progress.giftsFound}/${progress.giftsTotal}`,
    },
    {
      label: "Simboli raccolti",
      value: `${progress.symbolsFound}/${progress.symbolsTotal}`,
    },
    {
      label: "Sfere dei ricordi",
      value: `${progress.spheresUnlocked}/${progress.spheresTotal}`,
    },
    {
      label: "Sorprese sbloccate",
      value: `${progress.surprisesUnlocked}`,
    },
    {
      label: "Punti",
      value:
        progress.pointsAvailable > 0
          ? `${progress.pointsEarned}/${progress.pointsAvailable}`
          : `${progress.pointsEarned}`,
    },
  ];

  return (
    <section
      aria-labelledby="progressi-titolo"
      className="rounded-2xl border border-cream-300/20 bg-pine-800/40 p-5 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            id="progressi-titolo"
            className="text-sm font-semibold uppercase tracking-wider text-gold-light"
          >
            I tuoi progressi
          </h3>
          <p className="mt-1 text-sm text-cream-300/70">
            {progress.daysOpened} di {progress.totalDays} giorni aperti ·{" "}
            {progress.daysCompleted} completati
          </p>
        </div>
        <span className="text-2xl font-bold text-gold">{percent}%</span>
      </div>

      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-pine-950/60"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.totalDays}
        aria-valuenow={progress.daysOpened}
        aria-valuetext={`${progress.daysOpened} giorni aperti su ${progress.totalDays}`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-christmas-red to-gold"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: reducedMotion ? 0 : 1, ease: "easeOut" }}
        />
      </div>
      <p className="mt-1 text-xs text-cream-300/55">
        Completamento delle attività obbligatorie: {completionPercent}%
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-cream-300/15 bg-pine-950/40 px-3 py-2"
          >
            <dt className="text-[11px] uppercase tracking-wide text-cream-300/60">
              {stat.label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-cream-50">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
