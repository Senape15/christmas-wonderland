import { describe, expect, it } from "vitest";
import {
  buildDayRequirements,
  deriveDayState,
  isDayComplete,
  summarizeProgress,
  type CompletionFacts,
} from "./completion";

const requirements = buildDayRequirements(
  [
    { id: "q1", day_number: 1, is_active: true, is_required: true },
    { id: "q2", day_number: 1, is_active: true, is_required: false },
    { id: "q3", day_number: 2, is_active: true, is_required: true },
    { id: "q4", day_number: 3, is_active: false, is_required: true },
  ],
  [{ id: "c1", day_number: 1 }]
);

function facts(overrides: Partial<CompletionFacts> = {}): CompletionFacts {
  return {
    openedDays: new Set<number>(),
    correctQuizIds: new Set<string>(),
    completedContentIds: new Set<string>(),
    ...overrides,
  };
}

describe("completamento del giorno", () => {
  it("deriva i quattro stati", () => {
    expect(
      deriveDayState({
        dayNumber: 1,
        isUnlocked: false,
        isOpened: false,
        facts: facts(),
        requirements,
      }).state
    ).toBe("locked");

    expect(
      deriveDayState({
        dayNumber: 1,
        isUnlocked: true,
        isOpened: false,
        facts: facts(),
        requirements,
      }).state
    ).toBe("available");

    expect(
      deriveDayState({
        dayNumber: 1,
        isUnlocked: true,
        isOpened: true,
        facts: facts({ openedDays: new Set([1]) }),
        requirements,
      }).state
    ).toBe("opened");

    expect(
      deriveDayState({
        dayNumber: 1,
        isUnlocked: true,
        isOpened: true,
        facts: facts({
          openedDays: new Set([1]),
          correctQuizIds: new Set(["q1"]),
          completedContentIds: new Set(["c1"]),
        }),
        requirements,
      }).state
    ).toBe("completed");
  });

  it("non richiede i quiz facoltativi", () => {
    const complete = isDayComplete(
      1,
      facts({
        openedDays: new Set([1]),
        correctQuizIds: new Set(["q1"]),
        completedContentIds: new Set(["c1"]),
      }),
      requirements
    );

    expect(complete).toBe(true);
  });

  it("non completa un giorno non aperto", () => {
    expect(
      isDayComplete(
        1,
        facts({
          correctQuizIds: new Set(["q1"]),
          completedContentIds: new Set(["c1"]),
        }),
        requirements
      )
    ).toBe(false);
  });

  it("non considera attività disattivate", () => {
    expect(requirements.get(3)).toBeUndefined();
  });
});

describe("riepilogo progressi", () => {
  it("conta solo i giorni sbloccati e non duplica i premi", () => {
    const progress = summarizeProgress({
      days: Array.from({ length: 24 }, (_, index) => ({
        dayNumber: index + 1,
        isUnlocked: index < 3,
        isOpened: index < 2,
        isCompleted: index === 0,
      })),
      quizzes: [
        { id: "q1", day_number: 1, points: 5, is_active: true },
        { id: "q2", day_number: 2, points: 3, is_active: true },
        { id: "q3", day_number: 24, points: 10, is_active: true },
      ],
      contents: [
        { id: "c1", day_number: 1, kind: "password", is_active: true },
        { id: "c2", day_number: 2, kind: "clue", is_active: true },
        { id: "c3", day_number: 3, kind: "clue", is_active: true },
      ],
      passwordContentIds: new Set(["c1"]),
      gifts: [
        { id: "g1", day_number: 1 },
        { id: "g2", day_number: 24 },
      ],
      symbols: [
        { id: "s1", day_number: 1 },
        { id: "s2", day_number: 2 },
      ],
      spheres: [
        { id: "m1", day_number: 1, is_unlocked: true },
        { id: "m2", day_number: 2, is_unlocked: false },
      ],
      correctQuizIds: new Set(["q1"]),
      completedContentIds: new Set(["c1"]),
      finalBoxCompleted: false,
    });

    expect(progress.daysOpened).toBe(2);
    expect(progress.daysCompleted).toBe(1);
    expect(progress.quizzesCompleted).toBe(1);
    expect(progress.quizzesTotal).toBe(2); // il quiz del giorno 24 non è sbloccato
    expect(progress.pointsEarned).toBe(5);
    expect(progress.pointsAvailable).toBe(8);
    expect(progress.passwordsFound).toBe(1);
    expect(progress.passwordsTotal).toBe(1);
    expect(progress.cluesFound).toBe(1); // solo il giorno 2 è aperto
    expect(progress.cluesTotal).toBe(2);
    expect(progress.giftsFound).toBe(1);
    expect(progress.giftsTotal).toBe(1);
    expect(progress.symbolsFound).toBe(2);
    expect(progress.symbolsTotal).toBe(2);
    expect(progress.spheresUnlocked).toBe(1);
    expect(progress.spheresTotal).toBe(2);
    expect(progress.surprisesUnlocked).toBe(2); // password + quiz
  });

  it("non conta indizi e simboli nascosti né sfere di giorni futuri", () => {
    const progress = summarizeProgress({
      days: [
        {
          dayNumber: 1,
          isUnlocked: true,
          isOpened: true,
          isCompleted: false,
        },
        {
          dayNumber: 2,
          isUnlocked: false,
          isOpened: false,
          isCompleted: false,
        },
      ],
      quizzes: [
        {
          id: "q1",
          day_number: 1,
          points: 4,
          is_active: true,
          unlock_conditions: { requiresDays: [2] },
        },
      ],
      contents: [
        {
          id: "c1",
          day_number: 1,
          kind: "clue",
          is_active: true,
          activation_conditions: { afterDay: 2 },
        },
      ],
      passwordContentIds: new Set(),
      gifts: [],
      symbols: [
        {
          id: "s1",
          day_number: 1,
          discovery_conditions: { requiresDays: [2] },
        },
      ],
      spheres: [
        { id: "m1", day_number: 1, is_unlocked: true },
        { id: "m2", day_number: 2, is_unlocked: true },
      ],
      correctQuizIds: new Set(),
      completedContentIds: new Set(),
      finalBoxCompleted: false,
      conditionState: {
        now: new Date("2026-12-01T12:00:00Z"),
        openedDays: new Set([1]),
        completedQuizIds: new Set(),
        completedContentIds: new Set(),
      },
    });

    expect(progress.cluesTotal).toBe(0);
    expect(progress.symbolsTotal).toBe(0);
    expect(progress.spheresTotal).toBe(1);
    expect(progress.spheresUnlocked).toBe(1);
    expect(progress.quizzesTotal).toBe(0);
    expect(progress.pointsAvailable).toBe(0);
  });
});
