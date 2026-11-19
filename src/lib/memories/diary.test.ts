import { describe, expect, it } from "vitest";
import {
  buildDiaryEvents,
  buildDiaryFilterOptions,
  filterDiaryEvents,
  type DiaryFacts,
} from "./diary";

function facts(overrides: Partial<DiaryFacts> = {}): DiaryFacts {
  return {
    now: "2026-12-10T18:00:00.000Z",
    days: [
      {
        dayNumber: 3,
        title: "La lanterna",
        isUnlocked: true,
        isOpened: true,
        isCompleted: false,
      },
      {
        dayNumber: 4,
        title: "Il bosco",
        isUnlocked: true,
        isOpened: false,
        isCompleted: false,
      },
      {
        dayNumber: 5,
        title: null,
        isUnlocked: false,
        isOpened: false,
        isCompleted: false,
      },
    ],
    openedAtByDay: new Map([[3, "2026-12-03T08:00:00.000Z"]]),
    accessibleContents: [],
    correctQuizzes: [],
    correctQuizAt: new Map(),
    passwordCompletedAt: new Map(),
    gifts: [],
    symbols: [],
    spheres: [],
    memoryEntries: [],
    finalBox: null,
    ...overrides,
  };
}

describe("diario", () => {
  it("crea un evento solo per i giorni aperti", () => {
    const events = buildDiaryEvents(facts());
    expect(events.map((event) => event.eventKey)).toEqual(["day-opened:3"]);
    expect(events[0]!.category).toBe("apertura");
  });

  it("non produce eventi per giorni futuri o non aperti", () => {
    const events = buildDiaryEvents(
      facts({
        accessibleContents: [
          {
            id: "c1",
            day_number: 4,
            kind: "letter",
            title: "Lettera futura",
            content: "…",
            image_url: null,
            password_required: false,
          },
        ],
        gifts: [
          {
            id: "g1",
            day_number: 5,
            name: "Regalo futuro",
            description: "",
            image_url: null,
          },
        ],
      })
    );

    expect(events.some((event) => event.dayNumber === 4)).toBe(false);
    expect(events.some((event) => event.dayNumber === 5)).toBe(false);
  });

  it("deduplica gli eventi con la stessa chiave", () => {
    const events = buildDiaryEvents(
      facts({
        accessibleContents: [
          {
            id: "c1",
            day_number: 3,
            kind: "clue",
            title: "Indizio",
            content: "Un indizio",
            image_url: null,
            password_required: false,
          },
        ],
      })
    );

    const keys = events.map((event) => event.eventKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("content:c1");
  });

  it("ordina cronologicamente", () => {
    const events = buildDiaryEvents(
      facts({
        correctQuizzes: [
          { id: "q1", day_number: 3, question: "Chi?" },
        ],
        correctQuizAt: new Map([["q1", "2026-12-03T09:00:00.000Z"]]),
      })
    );

    const times = events.map((event) => event.occurredAt);
    expect(times).toEqual([...times].sort());
  });

  it("filtra per categoria e per giorno", () => {
    const events = buildDiaryEvents(
      facts({
        correctQuizzes: [
          { id: "q1", day_number: 3, question: "Chi?" },
        ],
        correctQuizAt: new Map([["q1", "2026-12-03T09:00:00.000Z"]]),
      })
    );

    expect(filterDiaryEvents(events, { category: "quiz" })).toHaveLength(1);
    expect(filterDiaryEvents(events, { dayNumber: 3 })).toHaveLength(2);
    expect(filterDiaryEvents(events, { dayNumber: 9 })).toHaveLength(0);
  });

  it("costruisce opzioni di filtro coerenti con gli eventi", () => {
    const events = buildDiaryEvents(facts());
    const options = buildDiaryFilterOptions(events);

    expect(options.categories).toEqual([
      { value: "apertura", label: "Apertura", count: 1 },
    ]);
    expect(options.days).toEqual([
      { value: "3", label: "Giorno 3", count: 1 },
    ]);
  });
});
