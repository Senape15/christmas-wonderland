import { describe, expect, it } from "vitest";
import { evaluateConditions, parseConditions } from "./conditions";

const NOW = new Date("2026-12-10T12:00:00Z");

function state(overrides: Partial<Parameters<typeof evaluateConditions>[1]> = {}) {
  return {
    now: NOW,
    openedDays: new Set<number>(),
    completedQuizIds: new Set<string>(),
    completedContentIds: new Set<string>(),
    ...overrides,
  };
}

describe("condizioni di sblocco", () => {
  it("è disponibile senza condizioni", () => {
    expect(evaluateConditions({}, state()).met).toBe(true);
    expect(evaluateConditions(null, state()).met).toBe(true);
  });

  it("richiede i giorni aperti", () => {
    const value = { requiresDays: [3, 4] };
    expect(evaluateConditions(value, state()).met).toBe(false);
    expect(
      evaluateConditions(value, state({ openedDays: new Set([3]) })).met
    ).toBe(false);
    expect(
      evaluateConditions(value, state({ openedDays: new Set([3, 4]) })).met
    ).toBe(true);
    expect(
      evaluateConditions({ afterDay: 3 }, state({ openedDays: new Set([3]) }))
        .met
    ).toBe(true);
  });

  it("richiede i quiz risolti", () => {
    const value = { requiresQuiz: "quiz-1" };
    expect(evaluateConditions(value, state()).met).toBe(false);
    expect(
      evaluateConditions(value, state({ completedQuizIds: new Set(["quiz-1"]) }))
        .met
    ).toBe(true);

    const multiple = { requiresQuizzes: ["quiz-1", "quiz-2"] };
    expect(
      evaluateConditions(
        multiple,
        state({ completedQuizIds: new Set(["quiz-1"]) })
      ).met
    ).toBe(false);
  });

  it("richiede le password trovate", () => {
    const value = { requiresPassword: "content-1" };
    expect(evaluateConditions(value, state()).met).toBe(false);
    expect(
      evaluateConditions(
        value,
        state({ completedContentIds: new Set(["content-1"]) })
      ).met
    ).toBe(true);
  });

  it("rispetta availableFrom come data civile di Roma", () => {
    const value = { availableFrom: "2026-12-10" };
    expect(evaluateConditions(value, state()).met).toBe(true);
    // 9 dicembre 22:00 UTC = 23:00 a Roma: non ancora il 10.
    expect(
      evaluateConditions(value, state({ now: new Date("2026-12-09T22:00:00Z") }))
        .met
    ).toBe(false);
    expect(
      evaluateConditions(value, state({ now: new Date("2026-12-09T22:00:00Z") }))
        .reason
    ).toMatch(/momento/);
    // 9 dicembre 23:30 UTC = 10 dicembre 00:30 a Roma.
    expect(
      evaluateConditions(value, state({ now: new Date("2026-12-09T23:30:00Z") }))
        .met
    ).toBe(true);
  });

  it("fallisce in modo sicuro con date non valide", () => {
    expect(
      evaluateConditions({ availableFrom: "non-una-data" }, state()).met
    ).toBe(false);
  });

  it("normalizza le forme singolari e plurali", () => {
    const parsed = parseConditions({
      requiresDays: [1, 2, 2],
      afterDay: 3,
      requiresQuiz: "q1",
      requiresPassword: ["c1", "c2"],
    });

    expect(parsed.requiresDays).toEqual([1, 2, 3]);
    expect(parsed.requiresQuizIds).toEqual(["q1"]);
    expect(parsed.requiresPasswordContentIds).toEqual(["c1", "c2"]);
  });
});
