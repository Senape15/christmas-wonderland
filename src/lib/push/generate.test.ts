import { describe, expect, it } from "vitest";
import { buildAutomaticJobs } from "./generate";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";
import type { NotificationPreferences } from "@/types/notifications";

const prefs = (overrides: Partial<NotificationPreferences> = {}) => ({
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  ...overrides,
});

// 10 dicembre 2026, 09:00 a Roma (CET, +1).
const MORNING = new Date("2026-12-10T08:00:00.000Z");
// 10 dicembre 2026, 12:30 a Roma: oltre il ritardo del promemoria.
const AFTERNOON = new Date("2026-12-10T11:30:00.000Z");

const subscription = { id: "sub-1", userId: "user-1" };

describe("buildAutomaticJobs", () => {
  it("non genera nulla fuori dal periodo 1–24 dicembre", () => {
    const jobs = buildAutomaticJobs({
      now: MORNING,
      today: { dayNumber: null, unlocked: false, dateString: "2027-01-10" },
      subscriptions: [subscription],
      preferencesByUser: new Map([["user-1", prefs()]]),
      openedDaysByUser: new Map(),
    });
    expect(jobs).toEqual([]);
  });

  it("non genera nulla per un giorno non ancora sbloccato", () => {
    const jobs = buildAutomaticJobs({
      now: MORNING,
      today: { dayNumber: 11, unlocked: false, dateString: "2026-12-11" },
      subscriptions: [subscription],
      preferencesByUser: new Map([["user-1", prefs()]]),
      openedDaysByUser: new Map(),
    });
    expect(jobs).toEqual([]);
  });

  it("genera la notifica giornaliera dopo l'orario preferito", () => {
    const jobs = buildAutomaticJobs({
      now: MORNING,
      today: { dayNumber: 10, unlocked: true, dateString: "2026-12-10" },
      subscriptions: [subscription],
      preferencesByUser: new Map([["user-1", prefs()]]),
      openedDaysByUser: new Map(),
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      kind: "daily",
      subscriptionId: "sub-1",
      userId: "user-1",
      url: "/dashboard?giorno=10",
      dedupeKey: "daily:2026-12-10:sub-1",
    });
    expect(jobs[0].tag).toBe("daily-2026-12-10");
  });

  it("rispetta le preferenze: nessuna notifica se disattivate", () => {
    const jobs = buildAutomaticJobs({
      now: MORNING,
      today: { dayNumber: 10, unlocked: true, dateString: "2026-12-10" },
      subscriptions: [subscription],
      preferencesByUser: new Map([["user-1", prefs({ enabled: false })]]),
      openedDaysByUser: new Map(),
    });
    expect(jobs).toEqual([]);
  });

  it("non invia la giornaliera se la preferenza è spenta", () => {
    const jobs = buildAutomaticJobs({
      now: MORNING,
      today: { dayNumber: 10, unlocked: true, dateString: "2026-12-10" },
      subscriptions: [subscription],
      preferencesByUser: new Map([["user-1", prefs({ dailyReminders: false })]]),
      openedDaysByUser: new Map(),
    });
    expect(jobs).toEqual([]);
  });

  it("invia il promemoria solo se la casella non è stata aperta", () => {
    const notOpened = buildAutomaticJobs({
      now: AFTERNOON,
      today: { dayNumber: 10, unlocked: true, dateString: "2026-12-10" },
      subscriptions: [subscription],
      preferencesByUser: new Map([["user-1", prefs()]]),
      openedDaysByUser: new Map(),
    });
    expect(notOpened.map((job) => job.kind)).toEqual(["daily", "reminder"]);

    const opened = buildAutomaticJobs({
      now: AFTERNOON,
      today: { dayNumber: 10, unlocked: true, dateString: "2026-12-10" },
      subscriptions: [subscription],
      preferencesByUser: new Map([["user-1", prefs()]]),
      openedDaysByUser: new Map([["user-1", new Set([10])]]),
    });
    expect(opened.map((job) => job.kind)).toEqual(["daily"]);
  });

  it("non invia il promemoria prima del ritardo previsto", () => {
    // 10:00 a Roma: solo tre ore dopo le 08:00? No: 08:00 + 4h = 12:00.
    const jobs = buildAutomaticJobs({
      now: new Date("2026-12-10T09:00:00.000Z"),
      today: { dayNumber: 10, unlocked: true, dateString: "2026-12-10" },
      subscriptions: [subscription],
      preferencesByUser: new Map([["user-1", prefs()]]),
      openedDaysByUser: new Map(),
    });
    expect(jobs.map((job) => job.kind)).toEqual(["daily"]);
  });

  it("genera una consegna distinta per ogni dispositivo dello stesso utente", () => {
    const jobs = buildAutomaticJobs({
      now: MORNING,
      today: { dayNumber: 10, unlocked: true, dateString: "2026-12-10" },
      subscriptions: [
        { id: "sub-1", userId: "user-1" },
        { id: "sub-2", userId: "user-1" },
      ],
      preferencesByUser: new Map([["user-1", prefs()]]),
      openedDaysByUser: new Map(),
    });

    expect(jobs).toHaveLength(2);
    expect(new Set(jobs.map((job) => job.dedupeKey)).size).toBe(2);
    expect(jobs.map((job) => job.subscriptionId)).toEqual(["sub-1", "sub-2"]);
  });

  it("ignora le subscription senza preferenze note", () => {
    const jobs = buildAutomaticJobs({
      now: MORNING,
      today: { dayNumber: 10, unlocked: true, dateString: "2026-12-10" },
      subscriptions: [{ id: "sub-9", userId: "sconosciuto" }],
      preferencesByUser: new Map(),
      openedDaysByUser: new Map(),
    });
    expect(jobs).toEqual([]);
  });
});
