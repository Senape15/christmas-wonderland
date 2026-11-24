"use client";

import Link from "next/link";
import { NavIcon } from "@/components/layout/nav-icons";
import { ProgressBar, ProgressRing } from "@/components/dashboard/ui";
import type { UserProgress } from "@/types/experience";

interface ProgressPanelProps {
  progress: UserProgress;
}

/**
 * Riepilogo dei progressi.
 *
 * I conteggi arrivano già filtrati dal server: includono solo i giorni
 * sbloccati e non duplicano premi o completamenti. L'anello e la barra sono
 * decorativi; gli stessi valori restano leggibili nel testo e nella lista.
 */
export function ProgressPanel({ progress }: ProgressPanelProps) {
  const percent =
    progress.totalDays > 0
      ? Math.round((progress.daysOpened / progress.totalDays) * 100)
      : 0;
  const completionPercent =
    progress.totalDays > 0
      ? Math.round((progress.daysCompleted / progress.totalDays) * 100)
      : 0;

  const stats: { label: string; value: string }[] = [
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
      className="overflow-hidden rounded-[28px] border border-cream-300/15 bg-gradient-to-br from-pine-800/55 via-pine-900/60 to-pine-950/85 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-4 sm:gap-5">
        <ProgressRing
          percent={percent}
          size={82}
          stroke={7}
          label={`${progress.daysOpened} giorni aperti su ${progress.totalDays}`}
        />
        <div className="min-w-0 flex-1 sm:min-w-[220px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light/75">
            Il tuo cammino
          </p>
          <h2
            id="progressi-titolo"
            className="mt-1 font-display text-xl font-bold text-cream-50 sm:text-2xl"
          >
            Progressi dell&apos;Avvento
          </h2>
          <p className="mt-1 text-sm text-cream-300/65">
            {progress.daysOpened} di {progress.totalDays} giorni aperti ·{" "}
            {progress.daysCompleted} completati
          </p>
          <div className="mt-3 max-w-xl">
            <ProgressBar
              value={progress.daysOpened}
              total={progress.totalDays}
              label={`${progress.daysOpened} giorni aperti su ${progress.totalDays}`}
            />
            <p className="mt-1.5 text-[11px] text-cream-300/50">
              Attività obbligatorie completate: {completionPercent}%
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/statistiche"
          className="order-last inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-cream-300/20 bg-cream-50/5 px-3.5 py-2 text-xs font-semibold text-cream-100 transition-colors hover:border-gold/45 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:order-none sm:ml-auto sm:w-auto"
        >
          Statistiche
          <NavIcon name="arrowRight" className="h-3.5 w-3.5" />
        </Link>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-cream-300/10 bg-pine-950/35 px-3 py-2.5"
          >
            <dt className="text-[10px] uppercase leading-tight tracking-[0.12em] text-cream-300/50">
              {stat.label}
            </dt>
            <dd className="mt-1 text-sm font-bold tabular-nums text-cream-50">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
