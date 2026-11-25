"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { AdventCalendar } from "@/components/calendar/AdventCalendar";
import { DayExperience } from "@/components/experience/DayExperience";
import { openDayExperienceAction } from "@/lib/experience-actions";
import type {
  DayExperience as DayExperienceData,
  ExperienceData,
} from "@/types/experience";

interface CalendarViewProps {
  experience: ExperienceData;
  /** Deep link `/dashboard/calendario?giorno=N` dal villaggio o dai ricordi. */
  initialDay?: number | null;
}

/**
 * I 24 giorni dell'Avvento con l'apertura della sorpresa.
 *
 * La Server Action verifica data, sblocco e proprietà dei dati: il client
 * riceve solo i contenuti già disponibili per questo utente.
 */
export function CalendarView({
  experience,
  initialDay = null,
}: CalendarViewProps) {
  const router = useRouter();
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openExperience, setOpenExperience] =
    useState<DayExperienceData | null>(null);

  const calendar = experience.calendar;
  const progress = experience.progress;
  const percent =
    progress.totalDays > 0
      ? Math.round((progress.daysOpened / progress.totalDays) * 100)
      : 0;

  const handleOpenDay = async (dayNumber: number) => {
    if (pendingDay !== null) return;

    setPendingDay(dayNumber);
    setError(null);

    try {
      const result = await openDayExperienceAction(dayNumber);
      if (result.ok) {
        setOpenExperience(result.data);
        // Aggiorna calendario, stati e progressi senza chiudere l'esperienza.
        router.refresh();
      } else {
        setError(result.error ?? "Non è stato possibile aprire questo giorno.");
      }
    } finally {
      setPendingDay(null);
    }
  };

  const handleCloseExperience = () => {
    setOpenExperience(null);
    setError(null);
  };

  // Deep link: apre solo giorni già sbloccati e una sola volta per navigazione.
  // La verifica reale resta nella Server Action.
  const handledDayRef = useRef<number | null>(null);
  useEffect(() => {
    if (initialDay === null || handledDayRef.current === initialDay) return;
    const day = calendar.days.find((item) => item.dayNumber === initialDay);
    if (!day?.isUnlocked) return;
    handledDayRef.current = initialDay;
    queueMicrotask(() => {
      void handleOpenDay(initialDay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDay]);

  return (
    <div className="space-y-4">
      {calendar.simulation && (
        <div
          role="status"
          className="rounded-2xl border border-ice-300/35 bg-ice-900/35 px-4 py-3 text-sm leading-relaxed text-ice-300"
        >
          <strong className="font-semibold">Anteprima amministratore.</strong>{" "}
          Stai vedendo il calendario come se fosse {calendar.simulation.date}.
          Nessuna apertura, risposta o progresso reale viene salvato.
        </div>
      )}

      <div className="rounded-[28px] border border-cream-300/12 bg-pine-900/35 p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-xs text-cream-300/60">
              <span>Giorni aperti</span>
              <span className="font-semibold tabular-nums text-cream-100">
                {progress.daysOpened}/{progress.totalDays}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.totalDays}
              aria-valuenow={progress.daysOpened}
              aria-label={`${progress.daysOpened} giorni aperti su ${progress.totalDays}`}
              className="mt-2 h-2 overflow-hidden rounded-full bg-pine-950/70"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-christmas-red"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <span className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-xs font-semibold tabular-nums text-gold-light">
            {percent}%
          </span>
        </div>

        <AdventCalendar
          days={calendar.days}
          pendingDay={pendingDay}
          error={error}
          onOpenDay={handleOpenDay}
        />
      </div>

      <p className="text-center text-xs leading-relaxed text-cream-300/45">
        Tocca una casella per aprire la sorpresa del giorno. I giorni futuri
        restano chiusi fino alla loro data.
      </p>

      <AnimatePresence>
        {openExperience && (
          <DayExperience
            key={openExperience.dayNumber}
            experience={openExperience}
            onClose={handleCloseExperience}
            onRefresh={() => router.refresh()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
