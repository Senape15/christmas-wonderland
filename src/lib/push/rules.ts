import { APP_TIMEZONE } from "@/lib/utils";
import type {
  NotificationKind,
  NotificationPreferences,
} from "@/types/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";

/**
 * Regole pure della Fase 7: nessun accesso a rete o database, così sono
 * testabili in modo deterministico.
 *
 * Tutti gli orari sono valutati nel fuso dell'esperienza (Europe/Rome), mai
 * nel fuso del server o del browser.
 */

export const REMINDER_DELAY_MINUTES = 4 * 60;
export const MAX_DELIVERY_ATTEMPTS = 3;

export interface LocalTimeParts {
  /** Data civile `YYYY-MM-DD` nel fuso richiesto. */
  dateString: string;
  hours: number;
  minutes: number;
  minutesOfDay: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function toLocalParts(
  now: Date,
  timeZone: string = APP_TIMEZONE
): LocalTimeParts {
  const formatter =
    timeZone === APP_TIMEZONE
      ? partsFormatter
      : new Intl.DateTimeFormat("en-CA", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        });

  const parts = formatter.formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  const hours = Number(pick("hour")) % 24;
  const minutes = Number(pick("minute"));

  return {
    dateString: `${pick("year")}-${pick("month")}-${pick("day")}`,
    hours,
    minutes,
    minutesOfDay: hours * 60 + minutes,
  };
}

/** Converte `HH:mm` o `HH:mm:ss` (formato Postgres `time`) in minuti. */
export function parseTimeOfDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Normalizza un orario in `HH:mm`; restituisce il default se non valido. */
export function normalizeTimeOfDay(
  value: string | null | undefined,
  fallback: string
): string {
  const minutes = parseTimeOfDay(value);
  if (minutes === null) return fallback;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
}

/**
 * `true` se l'orario cade nelle ore di silenzio. Un intervallo che attraversa
 * la mezzanotte (es. 22:00 → 07:00) è gestito correttamente.
 */
export function isQuietHour(
  minutesOfDay: number,
  start: string,
  end: string
): boolean {
  const startMinutes = parseTimeOfDay(start);
  const endMinutes = parseTimeOfDay(end);
  if (startMinutes === null || endMinutes === null) return false;
  if (startMinutes === endMinutes) return false;

  if (startMinutes < endMinutes) {
    return minutesOfDay >= startMinutes && minutesOfDay < endMinutes;
  }
  return minutesOfDay >= startMinutes || minutesOfDay < endMinutes;
}

/** Preferenza specifica che controlla un tipo di notifica. */
export function preferenceEnabledForKind(
  preferences: NotificationPreferences,
  kind: NotificationKind
): boolean {
  switch (kind) {
    case "daily":
      return preferences.dailyReminders;
    case "reminder":
      return preferences.reminder;
    case "clue":
      return preferences.clues;
    case "quiz":
      return preferences.quizzes;
    case "finale":
      return preferences.finale;
    // I contenuti speciali usano la stessa preferenza delle comunicazioni.
    case "content":
    case "special":
      return preferences.special;
  }
}

/** L'utente ha scelto di non ricevere questo tipo di notifica. */
export function canNotifyKind(
  preferences: NotificationPreferences,
  kind: NotificationKind
): boolean {
  if (!preferences.enabled) return false;
  return preferenceEnabledForKind(preferences, kind);
}

/**
 * Finestra di invio: dopo l'orario preferito e fuori dalle ore di silenzio.
 * Non invia mai a un utente che ha disattivato il servizio.
 */
export function isWithinSendWindow(
  now: Date,
  preferences: NotificationPreferences
): boolean {
  if (!preferences.enabled) return false;

  const local = toLocalParts(now, preferences.timezone || APP_TIMEZONE);
  if (
    isQuietHour(
      local.minutesOfDay,
      preferences.quietHoursStart,
      preferences.quietHoursEnd
    )
  ) {
    return false;
  }

  const preferred = parseTimeOfDay(preferences.preferredTime) ?? 8 * 60;
  const sincePreferred = (local.minutesOfDay - preferred + 24 * 60) % (24 * 60);
  const quietStart = parseTimeOfDay(preferences.quietHoursStart);
  if (quietStart !== null) {
    const quietSincePreferred = (quietStart - preferred + 24 * 60) % (24 * 60);
    if (quietSincePreferred > 0 && sincePreferred >= quietSincePreferred) {
      return false;
    }
  }
  return true;
}

/**
 * Il promemoria parte solo se la casella non è stata aperta e sono passate
 * almeno `REMINDER_DELAY_MINUTES` dall'orario preferito.
 */
export function isReminderDue(
  now: Date,
  preferences: NotificationPreferences
): boolean {
  if (!canNotifyKind(preferences, "reminder")) return false;
  if (!isWithinSendWindow(now, preferences)) return false;

  const local = toLocalParts(now, preferences.timezone || APP_TIMEZONE);
  const preferred = parseTimeOfDay(preferences.preferredTime) ?? 8 * 60;
  // Un orario preferito tardo non deve impedire per sempre il promemoria:
  // le 24 ore sono circolari (es. 22:00 + 4h = 02:00 del giorno dopo).
  const elapsed = (local.minutesOfDay - preferred + 24 * 60) % (24 * 60);
  return elapsed >= REMINDER_DELAY_MINUTES;
}

/** L'orario preferito deve cadere fuori dalle ore di silenzio. */
export function isPreferredTimeSendable(
  preferences: NotificationPreferences
): boolean {
  const preferred = parseTimeOfDay(preferences.preferredTime) ?? 8 * 60;
  return !isQuietHour(
    preferred,
    preferences.quietHoursStart,
    preferences.quietHoursEnd
  );
}

export function dailyDedupeKey(dateString: string, subscriptionId: string): string {
  return `daily:${dateString}:${subscriptionId}`;
}

export function reminderDedupeKey(dateString: string, subscriptionId: string): string {
  return `reminder:${dateString}:${subscriptionId}`;
}

export function scheduledDedupeKey(
  notificationId: string,
  attempt: number,
  subscriptionId: string
): string {
  return `scheduled:${notificationId}:${attempt}:${subscriptionId}`;
}

/**
 * I retry automatici devono riutilizzare la stessa chiave: se una notifica
 * parzialmente riuscita torna `pending`, i dispositivi già raggiunti restano
 * `sent` con la stessa chiave e non ricevono duplicati. Il "Reinvia" esplicito
 * dell'admin usa invece un tentativo diverso.
 */
export function scheduledJobDedupeKey(
  notificationId: string,
  subscriptionId: string,
  resend: boolean,
  attempt: number
): string {
  return scheduledDedupeKey(notificationId, resend ? attempt : 0, subscriptionId);
}

export function testDedupeKey(now: Date, subscriptionId: string): string {
  return `test:${now.getTime()}:${subscriptionId}`;
}

export interface DueNotificationRow {
  id: string;
  isActive: boolean;
  status: string;
  scheduledFor: string | null;
  dayNumber: number | null;
  attempts: number;
}

/**
 * Una notifica programmata è "dovuta" quando:
 *  - è attiva e non è già stata inviata/scartata;
 *  - non ha esaurito i tentativi;
 *  - ha una data esplicita già passata, oppure è legata a un giorno già
 *    sbloccato (mai giorni futuri).
 */
export function isNotificationDue(
  row: DueNotificationRow,
  now: Date,
  unlockedDays: ReadonlyMap<number, Date>
): boolean {
  if (!row.isActive) return false;
  if (row.status === "sent" || row.status === "skipped") return false;
  if (row.attempts >= MAX_DELIVERY_ATTEMPTS) return false;

  // Il vincolo sul giorno vale anche quando è presente una data programmata:
  // un amministratore non deve poter anticipare un contenuto futuro solo
  // impostando `scheduled_for` nel passato.
  if (row.dayNumber !== null) {
    const unlock = unlockedDays.get(row.dayNumber);
    if (!unlock || unlock.getTime() > now.getTime()) return false;
  }

  if (row.scheduledFor) {
    const scheduled = new Date(row.scheduledFor);
    if (Number.isNaN(scheduled.getTime())) return false;
    return scheduled.getTime() <= now.getTime();
  }

  return row.dayNumber !== null;
}

/**
 * Stato di una notifica programmata dopo un ciclo di invio.
 *
 * Se almeno un dispositivo è fallito, la notifica resta ritentabile anche
 * quando altri dispositivi hanno ricevuto il messaggio: il dedupe_key evita
 * di inviare due volte a chi ha già ricevuto.
 */
export function resolveScheduledDeliveryStatus(input: {
  sent: number;
  failed: number;
  eligible: number;
  attempt: number;
}): {
  status: "sent" | "failed" | "skipped" | "pending";
  attempts: number;
  lastError: string | null;
} {
  if (input.failed > 0) {
    return {
      status: "failed",
      attempts: Math.min(input.attempt + 1, MAX_DELIVERY_ATTEMPTS),
      lastError:
        input.sent > 0
          ? `${input.failed} dispositivi non raggiunti: nuovo tentativo programmato.`
          : "Nessun dispositivo raggiunto: nuovo tentativo programmato.",
    };
  }
  if (input.sent > 0) {
    return { status: "sent", attempts: input.attempt, lastError: null };
  }
  if (input.eligible === 0) {
    return {
      status: "skipped",
      attempts: input.attempt,
      lastError: "Nessun destinatario idoneo (pubblico, preferenze o dispositivi).",
    };
  }
  return {
    status: "pending",
    attempts: input.attempt,
    lastError: "Retry programmato: nessun invio in questo ciclo.",
  };
}

export interface AudienceInput {
  audience: string;
  targetUserId: string | null;
  userId: string;
  isAdmin: boolean;
  openedDay: boolean;
}

/** Seleziona i destinatari di una notifica programmata. */
export function audienceMatches(row: AudienceInput): boolean {
  switch (row.audience) {
    case "admins":
      return row.isAdmin;
    case "day_openers":
      return row.openedDay;
    case "not_opened":
      return !row.openedDay;
    case "user":
      return row.targetUserId === row.userId;
    case "all":
    default:
      return true;
  }
}

/** Solo gli amministratori possono inviare notifiche ad altri utenti. */
export function canManageNotifications(role: string | null | undefined): boolean {
  return role === "admin";
}

/**
 * URL delle notifiche: solo percorsi interni. Un URL assoluto o una stringa
 * tipo `//evil.example` verrebbe usata dal Service Worker per navigare a un
 * sito esterno quando l'utente clicca la notifica.
 */
export function isSafeInternalUrl(value: unknown): value is string {
  return typeof value === "string" && /^\/(?!\/)[^\s\\]*$/.test(value);
}

/**
 * Maschera l'endpoint: è una credenziale di fatto, non deve mai raggiungere
 * il client in chiaro né finire nei log.
 */
export function maskEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const tail = endpoint.slice(-4);
    return `${url.hostname}/…${tail}`;
  } catch {
    return "dispositivo sconosciuto";
  }
}

/** Etichetta leggibile del dispositivo ricavata dallo User-Agent. */
export function describeDevice(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const platform = /iphone|ipod/i.test(ua)
    ? "iPhone"
    : /ipad/i.test(ua)
      ? "iPad"
      : /android/i.test(ua)
        ? "Android"
        : /windows/i.test(ua)
          ? "Windows"
          : /macintosh|mac os x/i.test(ua)
            ? "Mac"
            : /linux/i.test(ua)
              ? "Linux"
              : "Dispositivo";

  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\//i.test(ua)
      ? "Opera"
      : /chrome|crios/i.test(ua)
        ? "Chrome"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /safari/i.test(ua)
            ? "Safari"
            : "";

  return browser ? `${platform} · ${browser}` : platform;
}

/** Preferenze con default applicati (riga assente o parziale). */
export function normalizePreferences(
  row:
    | {
        enabled?: boolean | null;
        daily_reminders?: boolean | null;
        reminder?: boolean | null;
        clues?: boolean | null;
        quizzes?: boolean | null;
        special?: boolean | null;
        finale?: boolean | null;
        preferred_time?: string | null;
        quiet_hours_start?: string | null;
        quiet_hours_end?: string | null;
        timezone?: string | null;
      }
    | null
    | undefined
): NotificationPreferences {
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES;
  if (!row) return { ...defaults };

  return {
    enabled: row.enabled ?? defaults.enabled,
    dailyReminders: row.daily_reminders ?? defaults.dailyReminders,
    reminder: row.reminder ?? defaults.reminder,
    clues: row.clues ?? defaults.clues,
    quizzes: row.quizzes ?? defaults.quizzes,
    special: row.special ?? defaults.special,
    finale: row.finale ?? defaults.finale,
    preferredTime: normalizeTimeOfDay(row.preferred_time, defaults.preferredTime),
    quietHoursStart: normalizeTimeOfDay(
      row.quiet_hours_start,
      defaults.quietHoursStart
    ),
    quietHoursEnd: normalizeTimeOfDay(row.quiet_hours_end, defaults.quietHoursEnd),
    timezone: row.timezone || defaults.timezone,
  };
}
