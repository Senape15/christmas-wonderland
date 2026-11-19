import { describe, expect, it } from "vitest";
import {
  MAX_DELIVERY_ATTEMPTS,
  audienceMatches,
  canManageNotifications,
  canNotifyKind,
  dailyDedupeKey,
  describeDevice,
  isNotificationDue,
  isQuietHour,
  isReminderDue,
  isWithinSendWindow,
  maskEndpoint,
  normalizePreferences,
  normalizeTimeOfDay,
  parseTimeOfDay,
  preferenceEnabledForKind,
  reminderDedupeKey,
  scheduledDedupeKey,
  testDedupeKey,
  toLocalParts,
} from "./rules";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";
import type { NotificationPreferences } from "@/types/notifications";

const prefs = (overrides: Partial<NotificationPreferences> = {}) => ({
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  ...overrides,
});

describe("toLocalParts", () => {
  it("usa il fuso Europe/Rome, non quello del server", () => {
    // 23:30 UTC del 24 dicembre = 00:30 del 25 a Roma (CET, +1).
    const parts = toLocalParts(new Date("2026-12-24T23:30:00.000Z"));
    expect(parts.dateString).toBe("2026-12-25");
    expect(parts.hours).toBe(0);
    expect(parts.minutes).toBe(30);
    expect(parts.minutesOfDay).toBe(30);
  });

  it("gestisce l'ora legale (CEST, +2)", () => {
    const parts = toLocalParts(new Date("2026-07-01T22:30:00.000Z"));
    expect(parts.dateString).toBe("2026-07-02");
    expect(parts.hours).toBe(0);
    expect(parts.minutes).toBe(30);
  });

  it("accetta un fuso esplicito", () => {
    const parts = toLocalParts(new Date("2026-12-10T12:00:00.000Z"), "UTC");
    expect(parts.dateString).toBe("2026-12-10");
    expect(parts.hours).toBe(12);
  });
});

describe("parseTimeOfDay / normalizeTimeOfDay", () => {
  it("legge HH:mm e il formato time di Postgres", () => {
    expect(parseTimeOfDay("08:00")).toBe(480);
    expect(parseTimeOfDay("08:05:00")).toBe(485);
    expect(parseTimeOfDay(" 23:59 ")).toBe(1439);
  });

  it("rifiuta valori non validi", () => {
    expect(parseTimeOfDay("24:00")).toBeNull();
    expect(parseTimeOfDay("8")).toBeNull();
    expect(parseTimeOfDay("")).toBeNull();
    expect(parseTimeOfDay(null)).toBeNull();
  });

  it("normalizza al formato HH:mm con fallback", () => {
    expect(normalizeTimeOfDay("7:05:00", "08:00")).toBe("07:05");
    expect(normalizeTimeOfDay("non-valido", "08:00")).toBe("08:00");
  });
});

describe("isQuietHour", () => {
  it("gestisce un intervallo che attraversa la mezzanotte", () => {
    expect(isQuietHour(22 * 60 + 30, "22:00", "07:00")).toBe(true);
    expect(isQuietHour(6 * 60 + 59, "22:00", "07:00")).toBe(true);
    expect(isQuietHour(7 * 60, "22:00", "07:00")).toBe(false);
    expect(isQuietHour(12 * 60, "22:00", "07:00")).toBe(false);
  });

  it("gestisce un intervallo nello stesso giorno", () => {
    expect(isQuietHour(13 * 60, "12:00", "14:00")).toBe(true);
    expect(isQuietHour(15 * 60, "12:00", "14:00")).toBe(false);
  });

  it("non considera silenzio un intervallo vuoto o non valido", () => {
    expect(isQuietHour(900, "09:00", "09:00")).toBe(false);
    expect(isQuietHour(900, "non-valido", "07:00")).toBe(false);
  });
});

describe("preferenze per tipologia", () => {
  it("mappa ogni tipologia sulla preferenza corretta", () => {
    const custom = prefs({
      dailyReminders: false,
      reminder: false,
      clues: false,
      quizzes: false,
      special: false,
      finale: false,
    });
    expect(preferenceEnabledForKind(custom, "daily")).toBe(false);
    expect(preferenceEnabledForKind(custom, "reminder")).toBe(false);
    expect(preferenceEnabledForKind(custom, "clue")).toBe(false);
    expect(preferenceEnabledForKind(custom, "quiz")).toBe(false);
    expect(preferenceEnabledForKind(custom, "special")).toBe(false);
    expect(preferenceEnabledForKind(custom, "content")).toBe(false);
    expect(preferenceEnabledForKind(custom, "finale")).toBe(false);
  });

  it("la disattivazione completa blocca ogni tipologia", () => {
    const disabled = prefs({ enabled: false });
    expect(canNotifyKind(disabled, "daily")).toBe(false);
    expect(canNotifyKind(disabled, "finale")).toBe(false);
  });
});

describe("finestra di invio", () => {
  it("non invia prima dell'orario preferito", () => {
    // 07:30 a Roma.
    const now = new Date("2026-12-10T06:30:00.000Z");
    expect(isWithinSendWindow(now, prefs({ preferredTime: "08:00" }))).toBe(false);
  });

  it("invia dopo l'orario preferito e fuori dal silenzio", () => {
    // 09:00 a Roma.
    const now = new Date("2026-12-10T08:00:00.000Z");
    expect(isWithinSendWindow(now, prefs({ preferredTime: "08:00" }))).toBe(true);
  });

  it("non invia durante le ore di silenzio", () => {
    // 23:00 a Roma.
    const now = new Date("2026-12-10T22:00:00.000Z");
    expect(
      isWithinSendWindow(
        now,
        prefs({ preferredTime: "08:00", quietHoursStart: "22:00", quietHoursEnd: "07:00" })
      )
    ).toBe(false);
  });

  it("non invia mai se il servizio è disattivato", () => {
    const now = new Date("2026-12-10T12:00:00.000Z");
    expect(isWithinSendWindow(now, prefs({ enabled: false }))).toBe(false);
  });
});

describe("promemoria", () => {
  it("parte solo quattro ore dopo l'orario preferito", () => {
    // 11:59 a Roma: troppo presto.
    expect(
      isReminderDue(new Date("2026-12-10T10:59:00.000Z"), prefs({ preferredTime: "08:00" }))
    ).toBe(false);
    // 12:00 a Roma: dovuto.
    expect(
      isReminderDue(new Date("2026-12-10T11:00:00.000Z"), prefs({ preferredTime: "08:00" }))
    ).toBe(true);
  });

  it("rispetta la preferenza e le ore di silenzio", () => {
    const now = new Date("2026-12-10T11:00:00.000Z");
    expect(isReminderDue(now, prefs({ reminder: false }))).toBe(false);
    expect(
      isReminderDue(now, prefs({ preferredTime: "08:00", quietHoursStart: "12:00", quietHoursEnd: "18:00" }))
    ).toBe(false);
  });
});

describe("chiavi di deduplica", () => {
  it("sono stabili, distinte per dispositivo e mai casuali", () => {
    expect(dailyDedupeKey("2026-12-10", "sub-1")).toBe("daily:2026-12-10:sub-1");
    expect(reminderDedupeKey("2026-12-10", "sub-1")).toBe("reminder:2026-12-10:sub-1");
    expect(scheduledDedupeKey("notif-1", 2, "sub-1")).toBe(
      "scheduled:notif-1:2:sub-1"
    );
    expect(testDedupeKey(new Date("2026-12-10T12:00:00.000Z"), "sub-1")).toBe(
      "test:1796904000000:sub-1"
    );
    expect(dailyDedupeKey("2026-12-10", "sub-1")).not.toBe(
      dailyDedupeKey("2026-12-10", "sub-2")
    );
  });
});

describe("isNotificationDue", () => {
  const now = new Date("2026-12-10T12:00:00.000Z");
  const unlocked = new Map<number, Date>([
    [1, new Date("2026-12-01T00:00:00.000Z")],
    [10, new Date("2026-12-10T00:00:00.000Z")],
    [11, new Date("2026-12-11T00:00:00.000Z")],
  ]);

  const base = {
    id: "n1",
    isActive: true,
    status: "pending",
    scheduledFor: null,
    dayNumber: null,
    attempts: 0,
  };

  it("una data futura non è dovuta", () => {
    expect(
      isNotificationDue(
        { ...base, scheduledFor: "2026-12-11T09:00:00.000Z" },
        now,
        unlocked
      )
    ).toBe(false);
  });

  it("una data passata è dovuta", () => {
    expect(
      isNotificationDue(
        { ...base, scheduledFor: "2026-12-10T09:00:00.000Z" },
        now,
        unlocked
      )
    ).toBe(true);
  });

  it("un giorno non ancora sbloccato non è dovuto", () => {
    expect(isNotificationDue({ ...base, dayNumber: 11 }, now, unlocked)).toBe(false);
    expect(isNotificationDue({ ...base, dayNumber: 10 }, now, unlocked)).toBe(true);
  });

  it("non reinserisce notifiche già inviate, scartate o esaurite", () => {
    expect(
      isNotificationDue({ ...base, status: "sent", dayNumber: 10 }, now, unlocked)
    ).toBe(false);
    expect(
      isNotificationDue({ ...base, status: "skipped", dayNumber: 10 }, now, unlocked)
    ).toBe(false);
    expect(
      isNotificationDue(
        { ...base, dayNumber: 10, attempts: MAX_DELIVERY_ATTEMPTS },
        now,
        unlocked
      )
    ).toBe(false);
    expect(isNotificationDue({ ...base, isActive: false, dayNumber: 10 }, now, unlocked)).toBe(
      false
    );
  });

  it("senza data né giorno non è dovuta", () => {
    expect(isNotificationDue(base, now, unlocked)).toBe(false);
  });
});

describe("pubblico delle notifiche", () => {
  const base = {
    audience: "all",
    targetUserId: null,
    userId: "user-1",
    isAdmin: false,
    openedDay: false,
  };

  it("seleziona i destinatari in base al pubblico", () => {
    expect(audienceMatches(base)).toBe(true);
    expect(audienceMatches({ ...base, audience: "admins" })).toBe(false);
    expect(audienceMatches({ ...base, audience: "admins", isAdmin: true })).toBe(true);
    expect(audienceMatches({ ...base, audience: "day_openers" })).toBe(false);
    expect(audienceMatches({ ...base, audience: "day_openers", openedDay: true })).toBe(true);
    expect(audienceMatches({ ...base, audience: "not_opened" })).toBe(true);
    expect(audienceMatches({ ...base, audience: "not_opened", openedDay: true })).toBe(false);
    expect(audienceMatches({ ...base, audience: "user", targetUserId: "user-1" })).toBe(true);
    expect(audienceMatches({ ...base, audience: "user", targetUserId: "user-2" })).toBe(false);
  });

  it("solo un admin può gestire le notifiche", () => {
    expect(canManageNotifications("admin")).toBe(true);
    expect(canManageNotifications("user")).toBe(false);
    expect(canManageNotifications(null)).toBe(false);
  });
});

describe("privacy dei dati dispositivo", () => {
  it("non espone l'endpoint completo", () => {
    const endpoint =
      "https://fcm.googleapis.com/fcm/send/abcdefghijklmnopqrstuvwxyz-1234";
    const masked = maskEndpoint(endpoint);
    expect(masked).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(masked).toContain("fcm.googleapis.com");
    expect(masked.endsWith("1234")).toBe(true);
  });

  it("gestisce un endpoint non valido senza lanciare", () => {
    expect(maskEndpoint("non-un-url")).toBe("dispositivo sconosciuto");
  });

  it("descrive il dispositivo dallo User-Agent", () => {
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")).toBe(
      "iPhone · Safari"
    );
    expect(describeDevice("Mozilla/5.0 (Linux; Android 14) Chrome/120")).toBe(
      "Android · Chrome"
    );
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0) Edg/120")).toBe("Windows · Edge");
    expect(describeDevice("")).toBe("Dispositivo");
  });
});

describe("normalizePreferences", () => {
  it("applica i default quando la riga manca", () => {
    expect(normalizePreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("mantiene i valori presenti e completa i mancanti", () => {
    const normalized = normalizePreferences({
      enabled: false,
      preferred_time: "09:30:00",
      quiet_hours_start: null,
      timezone: null,
    });
    expect(normalized.enabled).toBe(false);
    expect(normalized.preferredTime).toBe("09:30");
    expect(normalized.quietHoursStart).toBe(DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart);
    expect(normalized.timezone).toBe(DEFAULT_NOTIFICATION_PREFERENCES.timezone);
    expect(normalized.dailyReminders).toBe(true);
  });
});
