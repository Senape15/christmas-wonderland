import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import type { CalendarDay } from "@/types/calendar";
import type { VillageZone } from "@/types/village";
import {
  deriveHotspotState,
  deriveStoryPhase,
  deriveVillageData,
  getVillageData,
  isSameDayInRome,
} from "./village";

const mockedCreateClient = vi.mocked(createClient);

const NOW = new Date("2026-12-03T10:00:00Z"); // 3 dicembre, 11:00 a Roma

function buildDays({
  unlocked = [],
  opened = [],
}: {
  unlocked?: number[];
  opened?: number[];
} = {}): CalendarDay[] {
  const unlockedSet = new Set(unlocked);
  const openedSet = new Set(opened);

  return Array.from({ length: 24 }, (_, index) => {
    const dayNumber = index + 1;
    const isUnlocked = unlockedSet.has(dayNumber);

    return {
      dayNumber,
      title: isUnlocked ? `Titolo ${dayNumber}` : null,
      description: isUnlocked ? `Descrizione ${dayNumber}` : null,
      unlockDate: isUnlocked
        ? new Date(Date.UTC(2026, 11, dayNumber, 0, 0)).toISOString()
        : null,
      isUnlocked,
      isOpened: isUnlocked && openedSet.has(dayNumber),
    };
  });
}

const ZONES: VillageZone[] = [
  {
    id: "z-2",
    slug: "zeta",
    name: "Zeta",
    description: "",
    positionX: 50,
    positionY: 50,
    sortOrder: 2,
  },
  {
    id: "z-1",
    slug: "alfa",
    name: "Alfa",
    description: "",
    positionX: 10,
    positionY: 10,
    sortOrder: 1,
  },
  {
    id: "z-vuota",
    slug: "vuota",
    name: "Vuota",
    description: "",
    positionX: 90,
    positionY: 90,
    sortOrder: 3,
  },
];

const HOTSPOTS = [
  { id: "h1", zoneSlug: "alfa", slug: "uno", name: "Uno", kind: "tree" as const, x: 10, y: 10, dayNumber: 1, hint: "Teaser uno", nicoMessage: "Nico uno", sortOrder: 1 },
  { id: "h2", zoneSlug: "alfa", slug: "due", name: "Due", kind: "bench" as const, x: 20, y: 20, dayNumber: 2, sortOrder: 2 },
  { id: "h3", zoneSlug: "zeta", slug: "tre", name: "Tre", kind: "lamp" as const, x: 30, y: 30, dayNumber: 3, sortOrder: 3 },
  { id: "h4", zoneSlug: "zeta", slug: "quattro", name: "Quattro", kind: "fountain" as const, x: 40, y: 40, dayNumber: 4, hint: "SPOILER", nicoMessage: "SPOILER", sortOrder: 4 },
  { id: "h5", zoneSlug: "zeta", slug: "cinque", name: "Cinque", kind: "mailbox" as const, x: 50, y: 50, dayNumber: null, hint: "SENZA GIORNO", sortOrder: 5 },
];

describe("isSameDayInRome", () => {
  it("compares calendar days in Europe/Rome, not UTC", () => {
    // 23:30 UTC del 3 dicembre = 00:30 del 4 dicembre a Roma.
    expect(
      isSameDayInRome(
        new Date("2026-12-03T23:30:00Z"),
        new Date("2026-12-04T00:10:00Z")
      )
    ).toBe(true);
  });

  it("recognises the previous day just before midnight in Rome", () => {
    expect(
      isSameDayInRome(
        new Date("2026-12-03T22:00:00Z"), // 23:00 a Roma
        new Date("2026-12-03T23:30:00Z") // 00:30 a Roma del giorno dopo
      )
    ).toBe(false);
  });
});

describe("deriveHotspotState", () => {
  const unlockedDay = (overrides: Partial<CalendarDay> = {}): CalendarDay => ({
    dayNumber: 3,
    title: "Titolo",
    description: "Descrizione",
    unlockDate: "2026-12-02T23:30:00Z", // 00:30 del 3 dicembre a Roma
    isUnlocked: true,
    isOpened: false,
    ...overrides,
  });

  it("keeps future days locked", () => {
    expect(
      deriveHotspotState(
        { ...unlockedDay(), isUnlocked: false, unlockDate: null },
        NOW
      )
    ).toBe("locked");
  });

  it("marks today's unlocked day as available", () => {
    expect(deriveHotspotState(unlockedDay(), NOW)).toBe("available");
  });

  it("marks a past recovered day as discovered", () => {
    expect(
      deriveHotspotState(
        unlockedDay({ unlockDate: "2026-12-01T23:30:00Z" }),
        NOW
      )
    ).toBe("discovered");
  });

  it("marks opened days as completed", () => {
    expect(deriveHotspotState(unlockedDay({ isOpened: true }), NOW)).toBe(
      "completed"
    );
  });

  it("treats a missing day as locked", () => {
    expect(deriveHotspotState(undefined, NOW)).toBe("locked");
  });
});

describe("deriveStoryPhase", () => {
  it("is in attesa before the first unlock", () => {
    expect(deriveStoryPhase(buildDays())).toBe("attesa");
  });

  it("is in corso once a day is unlocked", () => {
    expect(deriveStoryPhase(buildDays({ unlocked: [1] }))).toBe("in-corso");
  });

  it("is completo only when all 24 days are opened", () => {
    const all = Array.from({ length: 24 }, (_, index) => index + 1);
    expect(deriveStoryPhase(buildDays({ unlocked: all, opened: all }))).toBe(
      "completo"
    );
  });
});

describe("deriveVillageData", () => {
  const days = buildDays({ unlocked: [1, 2, 3], opened: [1] });

  const village = deriveVillageData({
    zones: ZONES,
    hotspots: HOTSPOTS,
    days,
    now: NOW,
    hasDatabaseMapping: true,
  });

  const bySlug = new Map(village.hotspots.map((hotspot) => [hotspot.slug, hotspot]));

  it("derives the four states from the real calendar", () => {
    expect(bySlug.get("uno")?.state).toBe("completed");
    expect(bySlug.get("due")?.state).toBe("discovered");
    expect(bySlug.get("tre")?.state).toBe("available");
    expect(bySlug.get("quattro")?.state).toBe("locked");
  });

  it("never sends the day mapping, teaser or Nico message of locked places", () => {
    for (const slug of ["quattro", "cinque"]) {
      const hotspot = bySlug.get(slug);

      expect(hotspot?.state).toBe("locked");
      expect(hotspot?.dayNumber).toBeNull();
      expect(hotspot?.hint).toBe("");
      expect(hotspot?.nicoMessage).toBe("");
    }
  });

  it("keeps the configured narrative text for unlocked places", () => {
    expect(bySlug.get("uno")?.hint).toBe("Teaser uno");
    expect(bySlug.get("uno")?.nicoMessage).toBe("Nico uno");
    expect(bySlug.get("uno")?.dayNumber).toBe(1);
  });

  it("shows only zones that contain points, ordered by sort_order", () => {
    expect(village.zones.map((zone) => zone.slug)).toEqual(["alfa", "zeta"]);
  });

  it("orders hotspots by sort_order", () => {
    expect(village.hotspots.map((hotspot) => hotspot.slug)).toEqual([
      "uno",
      "due",
      "tre",
      "quattro",
      "cinque",
    ]);
  });

  it("derives phase and star light from unlocked days", () => {
    expect(village.phase).toBe("in-corso");
    expect(village.starLit).toBe(false);
    expect(village.hasDatabaseMapping).toBe(true);
  });

  it("keeps the star lit before December", () => {
    const waiting = deriveVillageData({
      zones: ZONES,
      hotspots: HOTSPOTS,
      days: buildDays(),
      now: new Date("2026-11-17T12:00:00Z"),
      hasDatabaseMapping: true,
    });

    expect(waiting.phase).toBe("attesa");
    expect(waiting.starLit).toBe(true);
    expect(waiting.hotspots.every((hotspot) => hotspot.state === "locked")).toBe(
      true
    );
  });
});

function query(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(result));
  chain.then = (
    onFulfilled: (value: unknown) => unknown,
    onRejected: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return chain;
}

function mockTables(results: Record<string, { data: unknown; error: unknown }>) {
  const from = vi.fn((table: string) => query(results[table] ?? { data: null, error: null }));
  mockedCreateClient.mockResolvedValue({ from } as never);
  return from;
}

describe("getVillageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to the illustrated catalog when the tables are missing", async () => {
    mockTables({
      village_locations: { data: null, error: new Error("missing table") },
      village_hotspots: { data: null, error: new Error("missing table") },
      village_hotspot_messages: { data: null, error: new Error("missing table") },
    });

    const village = await getVillageData(
      { days: buildDays({ unlocked: [1], opened: [1] }), elfMessages: {}, secretMessages: {}, openedCount: 1 },
      NOW
    );

    expect(village.hasDatabaseMapping).toBe(false);
    expect(village.zones).toHaveLength(6);
    expect(village.hotspots).toHaveLength(24);
    expect(village.hotspots.every((hotspot) => hotspot.dayNumber === null)).toBe(
      true
    );
    expect(village.hotspots.every((hotspot) => hotspot.state === "locked")).toBe(
      true
    );
  });

  it("uses the database mapping and unlock-gated messages", async () => {
    mockTables({
      village_locations: {
        data: [
          {
            id: "loc-1",
            slug: "alfa",
            name: "Alfa",
            description: "Zona",
            position_x: 50,
            position_y: 50,
            sort_order: 1,
          },
        ],
        error: null,
      },
      village_hotspots: {
        data: [
          {
            id: "hot-1",
            location_id: "loc-1",
            slug: "uno",
            name: "Uno",
            kind: "tree",
            position_x: 50,
            position_y: 50,
            day_number: 1,
            sort_order: 1,
          },
          {
            id: "hot-2",
            location_id: "loc-1",
            slug: "invalido",
            name: "Invalido",
            kind: "non-esiste",
            position_x: 40,
            position_y: 40,
            day_number: 2,
            sort_order: 2,
          },
          {
            id: "hot-3",
            location_id: "loc-mancante",
            slug: "orfano",
            name: "Orfano",
            kind: "bench",
            position_x: 30,
            position_y: 30,
            day_number: 3,
            sort_order: 3,
          },
        ],
        error: null,
      },
      village_hotspot_messages: {
        data: [
          {
            hotspot_id: "hot-1",
            hint: "Teaser dal database",
            nico_message: "Messaggio dal database",
            nico_expression: "surprised",
          },
        ],
        error: null,
      },
    });

    const village = await getVillageData(
      { days: buildDays({ unlocked: [1], opened: [1] }), elfMessages: {}, secretMessages: {}, openedCount: 1 },
      NOW
    );

    expect(village.hasDatabaseMapping).toBe(true);
    expect(village.zones.map((zone) => zone.slug)).toEqual(["alfa"]);
    expect(village.hotspots).toHaveLength(1);

    const hotspot = village.hotspots[0];
    expect(hotspot.state).toBe("completed");
    expect(hotspot.hint).toBe("Teaser dal database");
    expect(hotspot.nicoMessage).toBe("Messaggio dal database");
    expect(hotspot.nicoExpression).toBe("surprised");
  });

  it("falls back when the database has no hotspots", async () => {
    mockTables({
      village_locations: {
        data: [
          {
            id: "loc-1",
            slug: "alfa",
            name: "Alfa",
            description: "",
            position_x: 50,
            position_y: 50,
            sort_order: 1,
          },
        ],
        error: null,
      },
      village_hotspots: { data: [], error: null },
      village_hotspot_messages: { data: [], error: null },
    });

    const village = await getVillageData(
      { days: buildDays(), elfMessages: {}, secretMessages: {}, openedCount: 0 },
      NOW
    );

    expect(village.hasDatabaseMapping).toBe(false);
    expect(village.hotspots).toHaveLength(24);
  });
});
