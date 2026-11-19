import { describe, expect, it } from "vitest";
import {
  buildTimelineDays,
  type TimelineDayFacts,
} from "./timeline";
import type { DiaryEventView } from "@/types/memories";

const event = (
  id: string,
  day: number | null
): DiaryEventView => ({
  id,
  eventKey: id,
  category: "apertura",
  title: `Evento ${id}`,
  description: "",
  dayNumber: day,
  imageUrl: null,
  occurredAt: "2026-12-03T08:00:00.000Z",
  occurredAtLabel: "3 dicembre 2026",
  sourceType: "day",
  sourceId: null,
});

const days: TimelineDayFacts[] = [
  {
    dayNumber: 1,
    state: "completed",
    title: "Primo giorno",
    isUnlocked: true,
    isOpened: true,
    isCompleted: true,
  },
  {
    dayNumber: 2,
    state: "opened",
    title: "Secondo giorno",
    isUnlocked: true,
    isOpened: true,
    isCompleted: false,
  },
  {
    dayNumber: 3,
    state: "locked",
    title: null,
    isUnlocked: false,
    isOpened: false,
    isCompleted: false,
  },
];

const counts = {
  objectsByDay: new Map([[1, 2]]),
  quizzesByDay: new Map([[1, 1]]),
  cluesByDay: new Map([[2, 3]]),
  memoriesByDay: new Map([[1, 1]]),
};

describe("cronologia", () => {
  it("mostra stato e conteggi dei giorni sbloccati", () => {
    const timeline = buildTimelineDays(days, [], counts);
    expect(timeline).toHaveLength(3);
    expect(timeline[0]).toMatchObject({
      dayNumber: 1,
      state: "completed",
      title: "Primo giorno",
      objects: 2,
      quizzes: 1,
      memories: 1,
    });
  });

  it("nasconde titoli, eventi e conteggi dei giorni futuri", () => {
    const timeline = buildTimelineDays(days, [event("e1", 3)], counts);
    const future = timeline[2]!;

    expect(future.title).toBeNull();
    expect(future.events).toEqual([]);
    expect(future.objects).toBe(0);
    expect(future.quizzes).toBe(0);
    expect(future.clues).toBe(0);
    expect(future.memories).toBe(0);
  });

  it("associa gli eventi al giorno corretto", () => {
    const timeline = buildTimelineDays(
      days,
      [event("e1", 1), event("e2", 1), event("e3", 2)],
      counts
    );

    expect(timeline[0]!.events.map((item) => item.id)).toEqual(["e1", "e2"]);
    expect(timeline[1]!.events.map((item) => item.id)).toEqual(["e3"]);
  });

  it("ignora eventi senza giorno", () => {
    const timeline = buildTimelineDays(days, [event("e1", null)], counts);
    expect(timeline.every((day) => day.events.length === 0)).toBe(true);
  });
});
