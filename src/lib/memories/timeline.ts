import type { DayState } from "@/types/experience";
import type { DiaryEventView, TimelineDay } from "@/types/memories";

/**
 * Cronologia 1–24.
 *
 * Per ogni giorno:
 *  - i giorni futuri non espongono titolo, eventi o conteggi (solo numero e stato);
 *  - i giorni sbloccati mostrano stato, memorie, eventi, oggetti, quiz e indizi;
 *  - non vengono inventati eventi: tutto deriva dai progressi reali.
 */

export interface TimelineDayFacts {
  dayNumber: number;
  state: DayState;
  title: string | null;
  isUnlocked: boolean;
  isOpened: boolean;
  isCompleted: boolean;
}

export interface TimelineCounts {
  objectsByDay: ReadonlyMap<number, number>;
  quizzesByDay: ReadonlyMap<number, number>;
  cluesByDay: ReadonlyMap<number, number>;
  memoriesByDay: ReadonlyMap<number, number>;
}

export function buildTimelineDays(
  days: readonly TimelineDayFacts[],
  events: readonly DiaryEventView[],
  counts: TimelineCounts
): TimelineDay[] {
  const eventsByDay = new Map<number, DiaryEventView[]>();
  for (const event of events) {
    if (event.dayNumber === null) continue;
    const list = eventsByDay.get(event.dayNumber) ?? [];
    list.push(event);
    eventsByDay.set(event.dayNumber, list);
  }

  return days
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const locked = !day.isUnlocked || day.state === "locked";
      const dayEvents = locked ? [] : (eventsByDay.get(day.dayNumber) ?? []);

      return {
        dayNumber: day.dayNumber,
        state: day.state,
        isUnlocked: day.isUnlocked,
        isOpened: day.isOpened,
        isCompleted: day.isCompleted,
        // I giorni futuri non espongono alcun titolo.
        title: locked ? null : day.title,
        events: dayEvents,
        objects: locked ? 0 : (counts.objectsByDay.get(day.dayNumber) ?? 0),
        quizzes: locked ? 0 : (counts.quizzesByDay.get(day.dayNumber) ?? 0),
        clues: locked ? 0 : (counts.cluesByDay.get(day.dayNumber) ?? 0),
        memories: locked ? 0 : (counts.memoriesByDay.get(day.dayNumber) ?? 0),
      };
    });
}
