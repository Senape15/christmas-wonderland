import { describe, it, expect, vi, afterEach } from "vitest";
import { formatDate, formatTodayLabel, getAppYear, isDateUnlocked } from "./utils";

describe("utils", () => {
  describe("formatDate", () => {
    it("formats a date in Italian by default", () => {
      const result = formatDate("2026-12-25");
      expect(result.toLowerCase()).toContain("dicembre");
      expect(result).toContain("2026");
    });
  });

  describe("formatTodayLabel", () => {
    it("formats the date in Italian with a capitalized weekday and month", () => {
      expect(formatTodayLabel(new Date("2026-12-25T12:00:00Z"))).toBe(
        "Venerdì, 25 Dicembre 2026"
      );
    });

    it("uses the Europe/Rome timezone, not UTC", () => {
      // 23:30 UTC del 24 dicembre = 00:30 del 25 dicembre a Roma.
      expect(formatTodayLabel(new Date("2026-12-24T23:30:00Z"))).toBe(
        "Venerdì, 25 Dicembre 2026"
      );
    });
  });

  describe("getAppYear", () => {
    it("returns the year in Europe/Rome across the UTC boundary", () => {
      // 31 dicembre 23:30 UTC = 1 gennaio 00:30 a Roma.
      expect(getAppYear(new Date("2026-12-31T23:30:00Z"))).toBe(2027);
      expect(getAppYear(new Date("2026-11-17T12:00:00Z"))).toBe(2026);
    });
  });

  describe("isDateUnlocked", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns true for a past date", () => {
      vi.setSystemTime(new Date("2026-12-10T12:00:00Z"));
      expect(isDateUnlocked("2026-12-01T00:00:00Z")).toBe(true);
    });

    it("returns false for a future date", () => {
      vi.setSystemTime(new Date("2026-12-10T12:00:00Z"));
      expect(isDateUnlocked("2026-12-25T00:00:00Z")).toBe(false);
    });

    it("returns true for exactly now", () => {
      vi.setSystemTime(new Date("2026-12-10T12:00:00Z"));
      expect(isDateUnlocked("2026-12-10T12:00:00Z")).toBe(true);
    });
  });
});
