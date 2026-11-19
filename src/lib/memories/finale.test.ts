import { describe, expect, it } from "vitest";
import {
  buildFinaleJourney,
  FINALE_GATE_MESSAGE,
  resolveFinaleGate,
} from "./finale";

describe("finale del 24 dicembre", () => {
  it("non rende disponibile il riepilogo prima dello sblocco del giorno", () => {
    const gate = resolveFinaleGate({
      revealDay: 24,
      dayUnlocked: false,
      completed: false,
    });

    expect(gate.available).toBe(false);
    expect(gate.completed).toBe(false);
    expect(gate.gateMessage).toBe(FINALE_GATE_MESSAGE);
  });

  it("considera completato solo se sbloccato e completato", () => {
    expect(
      resolveFinaleGate({
        revealDay: 24,
        dayUnlocked: true,
        completed: true,
      }).completed
    ).toBe(true);

    expect(
      resolveFinaleGate({
        revealDay: 24,
        dayUnlocked: false,
        completed: true,
      }).completed
    ).toBe(false);
  });

  it("non espone il messaggio finale nel gate", () => {
    const gate = resolveFinaleGate({
      revealDay: 24,
      dayUnlocked: false,
      completed: false,
    });
    expect(gate.gateMessage).not.toMatch(/grinch/i);
  });

  it("normalizza i conteggi del viaggio", () => {
    expect(
      buildFinaleJourney({
        daysCompleted: 12,
        memories: 20,
        objects: 4,
        symbols: 2,
        spheres: 1,
        clues: 5,
        quizzes: 3,
      })
    ).toEqual({
      daysCompleted: 12,
      memories: 20,
      objects: 4,
      symbols: 2,
      spheres: 1,
      clues: 5,
      quizzes: 3,
    });

    expect(
      buildFinaleJourney({
        daysCompleted: -2,
        memories: Number.NaN,
        objects: 3.9,
        symbols: 0,
        spheres: 0,
        clues: 0,
        quizzes: 0,
      }).daysCompleted
    ).toBe(0);
  });
});
