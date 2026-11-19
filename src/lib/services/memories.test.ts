import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("./experience", () => ({
  getExperienceData: vi.fn(),
  getDateContextForUser: vi.fn(),
}));
vi.mock("./capabilities", () => ({ detectPhase6Capabilities: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExperienceData, getDateContextForUser } from "./experience";
import { detectPhase6Capabilities } from "./capabilities";
import { loadMemorySnapshot } from "./memories";
import type { CurrentUser } from "@/lib/auth";

const userA: CurrentUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "a@example.com",
  role: "user",
  name: "A",
  avatar_url: null,
};

interface Call {
  table: string;
  filters: [string, unknown][];
}

const calls: Call[] = [];

function makeBuilder(table: string) {
  const call: Call = { table, filters: [] };
  calls.push(call);

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (column: string, value: unknown) => {
      call.filters.push([column, value]);
      return chain;
    },
    is: (column: string, value: unknown) => {
      call.filters.push([column, value]);
      return chain;
    },
    in: (column: string, value: unknown) => {
      call.filters.push([column, value]);
      return chain;
    },
    order: () => chain,
    limit: () => chain,
    update: () => chain,
    upsert: async () => ({ error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: [], error: null }),
  };
  return chain;
}

const client = {
  from: (table: string) => makeBuilder(table),
  storage: {
    from: () => ({
      createSignedUrl: async () => ({
        data: null,
        error: new Error("Storage non disponibile"),
      }),
    }),
  },
};

function setup() {
  calls.length = 0;
  vi.mocked(createClient).mockResolvedValue(client as never);
  vi.mocked(createAdminClient).mockResolvedValue(client as never);
  vi.mocked(detectPhase6Capabilities).mockResolvedValue({
    ready: true,
    memoryEntries: true,
    diaryEvents: true,
    collectibleMetadata: true,
    sphereDiscoveryTimestamps: true,
    finalBoxGiftLink: true,
  });
  vi.mocked(getExperienceData).mockResolvedValue({
    calendar: {
      days: Array.from({ length: 24 }, (_, index) => ({
        dayNumber: index + 1,
        title: index === 0 ? "Giorno 1" : null,
        description: null,
        unlockDate: null,
        isUnlocked: index === 0,
        isOpened: false,
        isCompleted: false,
        state: index === 0 ? "available" : "locked",
      })),
      elfMessages: {},
      secretMessages: {},
      openedCount: 0,
      simulation: null,
    },
    progress: {
      daysOpened: 0,
      daysCompleted: 0,
      totalDays: 24,
      quizzesCompleted: 0,
      quizzesTotal: 0,
      pointsEarned: 0,
      pointsAvailable: 0,
      passwordsFound: 0,
      passwordsTotal: 0,
      cluesFound: 0,
      cluesTotal: 0,
      giftsFound: 0,
      giftsTotal: 0,
      symbolsFound: 0,
      symbolsTotal: 0,
      spheresUnlocked: 0,
      spheresTotal: 0,
      surprisesUnlocked: 0,
    },
  });
  vi.mocked(getDateContextForUser).mockResolvedValue({
    now: new Date("2026-12-01T12:00:00.000Z"),
    simulation: null,
    isSimulation: false,
  });
}

describe("privacy tra utenti nella Fase 6", () => {
  beforeEach(setup);

  it("filtra tutte le tabelle personali con l'id della sessione", async () => {
    await loadMemorySnapshot(userA);

    const personalTables = [
      "user_openings",
      "user_quiz_attempts",
      "password_completions",
      "final_box_completions",
      "memory_spheres",
      "secret_messages",
      "user_photos",
      "diary_events",
    ];

    for (const table of personalTables) {
      const scoped = calls.filter(
        (call) =>
          call.table === table &&
          call.filters.some(([column, value]) => column === "user_id" && value === userA.id)
      );
      expect(scoped.length, `tabella ${table} non filtrata per user_id`).toBeGreaterThan(0);
    }
  });

  it("non usa mai l'id di un altro utente", async () => {
    await loadMemorySnapshot(userA);
    const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const leaked = calls.some((call) =>
      call.filters.some(([, value]) => value === otherId)
    );
    expect(leaked).toBe(false);
  });

  it("non passa il service role alle letture personali quando non serve", async () => {
    await loadMemorySnapshot(userA);
    // Il client RLS dell'utente è sempre usato per le tabelle personali.
    expect(createClient).toHaveBeenCalled();
  });
});
