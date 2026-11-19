import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server client before importing the module under test
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getVisibleAdventDays,
  getAdventDay,
  openAdventDay,
} from "./advent";

const mockedCreateClient = vi.mocked(createClient);

function makeSupabaseMock() {
  const chain: Record<string, unknown> = {};
  const from = vi.fn(() => chain);
  const supabase = { from, auth: { getUser: vi.fn() } };
  return { supabase, chain, from };
}

describe("advent service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVisibleAdventDays", () => {
    it("returns only days whose unlock_date has passed", async () => {
      const { supabase, chain } = makeSupabaseMock();
      const now = new Date("2026-12-03T12:00:00Z");

      chain.select = vi.fn().mockReturnThis();
      chain.order = vi.fn().mockResolvedValue({
        data: [
          { day_number: 1, unlock_date: new Date("2026-12-01T00:00:00Z") },
          { day_number: 2, unlock_date: new Date("2026-12-02T00:00:00Z") },
          { day_number: 3, unlock_date: new Date("2026-12-03T00:00:00Z") },
          { day_number: 4, unlock_date: new Date("2026-12-04T00:00:00Z") }, // future
          { day_number: 5, unlock_date: new Date("2026-12-05T00:00:00Z") }, // future
        ],
        error: null,
      });
      mockedCreateClient.mockResolvedValue(supabase as never);

      vi.setSystemTime(now);
      const result = await getVisibleAdventDays();

      expect(result.map((d) => d.day_number)).toEqual([1, 2, 3]);
      vi.useRealTimers();
    });

    it("returns an empty array on DB error", async () => {
      const { supabase, chain } = makeSupabaseMock();
      chain.select = vi.fn().mockReturnThis();
      chain.order = vi.fn().mockResolvedValue({ data: null, error: new Error("db down") });
      mockedCreateClient.mockResolvedValue(supabase as never);

      const result = await getVisibleAdventDays();
      expect(result).toEqual([]);
    });
  });

  describe("getAdventDay", () => {
    it("returns null for a future day (no data leak)", async () => {
      const { supabase, chain } = makeSupabaseMock();
      chain.select = vi.fn().mockReturnThis();
      chain.eq = vi.fn().mockReturnThis();
      chain.single = vi.fn().mockResolvedValue({
        data: { day_number: 24, unlock_date: new Date("2026-12-24T00:00:00Z") },
        error: null,
      });
      mockedCreateClient.mockResolvedValue(supabase as never);

      vi.setSystemTime(new Date("2026-12-10T00:00:00Z"));
      const result = await getAdventDay(24);
      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it("returns the day when unlocked", async () => {
      const { supabase, chain } = makeSupabaseMock();
      chain.select = vi.fn().mockReturnThis();
      chain.eq = vi.fn().mockReturnThis();
      chain.single = vi.fn().mockResolvedValue({
        data: { day_number: 1, unlock_date: new Date("2026-12-01T00:00:00Z") },
        error: null,
      });
      mockedCreateClient.mockResolvedValue(supabase as never);

      vi.setSystemTime(new Date("2026-12-10T00:00:00Z"));
      const result = await getAdventDay(1);
      expect(result?.day_number).toBe(1);
      vi.useRealTimers();
    });
  });

  describe("openAdventDay", () => {
    it("refuses to open a future day", async () => {
      const { supabase, chain } = makeSupabaseMock();
      chain.select = vi.fn().mockReturnThis();
      chain.eq = vi.fn().mockReturnThis();
      chain.single = vi.fn().mockResolvedValue({
        data: { day_number: 24, unlock_date: new Date("2026-12-24T00:00:00Z") },
        error: null,
      });
      mockedCreateClient.mockResolvedValue(supabase as never);

      vi.setSystemTime(new Date("2026-12-10T00:00:00Z"));
      const result = await openAdventDay("user-1", 24);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/non è ancora sbloccato/);
      // The insert must never be attempted
      expect(supabase.from).toHaveBeenCalledTimes(1); // only advent_days read
      vi.useRealTimers();
    });

    it("records the opening for an unlocked day", async () => {
      const { supabase, chain } = makeSupabaseMock();
      chain.select = vi.fn().mockReturnThis();
      chain.eq = vi.fn().mockReturnThis();
      chain.single = vi.fn().mockResolvedValue({
        data: { day_number: 1, unlock_date: new Date("2026-12-01T00:00:00Z") },
        error: null,
      });
      const insert = vi.fn().mockResolvedValue({ error: null });
      chain.insert = insert;
      mockedCreateClient.mockResolvedValue(supabase as never);

      vi.setSystemTime(new Date("2026-12-10T00:00:00Z"));
      const result = await openAdventDay("user-1", 1);

      expect(result.ok).toBe(true);
      expect(insert).toHaveBeenCalledWith({
        user_id: "user-1",
        day_number: 1,
      });
      vi.useRealTimers();
    });
  });
});
