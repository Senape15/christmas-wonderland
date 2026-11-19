import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { buildCalendarDays } from "./advent";

const NOW = new Date("2026-12-02T12:00:00Z");

const visibleDays = [
  {
    day_number: 1,
    title: "Uno",
    description: "Primo giorno",
    unlock_date: "2026-12-01T00:00:00Z",
  },
  {
    day_number: 2,
    title: "Due",
    description: "Secondo giorno",
    unlock_date: "2026-12-02T00:00:00Z",
  },
  {
    // RLS should never return a future row, but the builder must not leak it.
    day_number: 3,
    title: "Tre",
    description: "Giorno futuro",
    unlock_date: "2026-12-03T00:00:00Z",
  },
];

describe("buildCalendarDays", () => {
  it("always returns the full 1..24 calendar", () => {
    const days = buildCalendarDays(visibleDays, [], NOW);

    expect(days).toHaveLength(24);
    expect(days.map((day) => day.dayNumber)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1)
    );
  });

  it("exposes title and description only for unlocked days", () => {
    const days = buildCalendarDays(visibleDays, [], NOW);
    const first = days[0];
    const third = days[2];
    const fourth = days[3];

    expect(first.isUnlocked).toBe(true);
    expect(first.title).toBe("Uno");
    expect(first.description).toBe("Primo giorno");

    expect(third.isUnlocked).toBe(false);
    expect(third.title).toBeNull();
    expect(third.description).toBeNull();
    expect(third.unlockDate).toBeNull();

    expect(fourth.isUnlocked).toBe(false);
    expect(fourth.title).toBeNull();
  });

  it("marks a day as opened only when it is unlocked", () => {
    const days = buildCalendarDays(visibleDays, [1, 3], NOW);

    expect(days[0].isOpened).toBe(true);
    expect(days[1].isOpened).toBe(false);
    expect(days[2].isOpened).toBe(false);
  });

  it("ignores opened day numbers outside 1..24", () => {
    const days = buildCalendarDays(visibleDays, [0, 25, 1], NOW);
    const opened = days.filter((day) => day.isOpened);

    expect(opened.map((day) => day.dayNumber)).toEqual([1]);
  });
});
