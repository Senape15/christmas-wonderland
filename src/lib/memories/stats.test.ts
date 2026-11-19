import { describe, expect, it } from "vitest";
import { buildMemoryStatistics, type StatisticsFacts } from "./stats";

const base: StatisticsFacts = {
  daysOpened: 5,
  daysCompleted: 3,
  totalDays: 24,
  memories: 12,
  objects: 4,
  objectsTotal: 8,
  symbols: 2,
  symbolsTotal: 6,
  spheres: 1,
  spheresTotal: 3,
  clues: 5,
  cluesTotal: 10,
  quizzesCompleted: 4,
  quizzesTotal: 8,
  finaleCompleted: false,
  finaleAvailable: false,
};

describe("statistiche", () => {
  it("calcola le percentuali per categoria", () => {
    const stats = buildMemoryStatistics(base);
    const byKey = new Map(stats.categories.map((item) => [item.key, item]));

    expect(byKey.get("oggetti")?.percent).toBe(50);
    expect(byKey.get("simboli")?.percent).toBe(33);
    expect(byKey.get("giorni")?.found).toBe(3);
    expect(byKey.get("memorie")).toBeUndefined();
  });

  it("calcola la percentuale complessiva pesata", () => {
    const stats = buildMemoryStatistics(base);
    const found = 3 + 4 + 2 + 1 + 5 + 4;
    const total = 24 + 8 + 6 + 3 + 10 + 8;
    expect(stats.overallPercent).toBe(Math.round((found / total) * 100));
  });

  it("non conta elementi futuri o totali zero", () => {
    const stats = buildMemoryStatistics({
      ...base,
      objects: 2,
      objectsTotal: 2,
      clues: 0,
      cluesTotal: 0,
      quizzesCompleted: 0,
      quizzesTotal: 0,
    });

    const byKey = new Map(stats.categories.map((item) => [item.key, item]));
    expect(byKey.get("oggetti")?.percent).toBe(100);
    expect(byKey.get("clues")).toBeUndefined();
    expect(stats.overallPercent).toBeGreaterThan(0);
  });

  it("non supera mai il 100% anche con duplicati", () => {
    const stats = buildMemoryStatistics({
      ...base,
      objects: 99,
      symbols: 99,
      clues: 99,
    });

    expect(stats.overallPercent).toBeLessThanOrEqual(100);
    expect(stats.categories.every((item) => item.percent <= 100)).toBe(true);
  });

  it("riporta lo stato del finale senza anticiparlo", () => {
    const stats = buildMemoryStatistics(base);
    expect(stats.finaleAvailable).toBe(false);
    expect(stats.finaleCompleted).toBe(false);
  });
});
