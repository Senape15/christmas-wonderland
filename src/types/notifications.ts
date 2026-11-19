/**
 * Contratti condivisi della Fase 7 (PWA, Web Push, preferenze).
 *
 * Sono usati sia dal server sia dai componenti client: non devono contenere
 * segreti né chiavi VAPID private.
 */

export const NOTIFICATION_KINDS = [
  "daily",
  "reminder",
  "content",
  "clue",
  "quiz",
  "special",
  "finale",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_AUDIENCES = [
  "all",
  "admins",
  "day_openers",
  "not_opened",
  "user",
] as const;

export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  daily: "Notifica giornaliera",
  reminder: "Promemoria casella",
  content: "Nuovo contenuto",
  clue: "Nuovo indizio",
  quiz: "Quiz",
  special: "Comunicazione speciale",
  finale: "Finale",
};

export const NOTIFICATION_AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  all: "Tutti gli utenti con notifiche attive",
  admins: "Solo amministratori",
  day_openers: "Chi ha aperto il giorno indicato",
  not_opened: "Chi non ha ancora aperto il giorno indicato",
  user: "Un singolo utente",
};

export const NOTIFICATION_STATUSES = [
  "pending",
  "sending",
  "sent",
  "failed",
  "skipped",
] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface NotificationPreferences {
  enabled: boolean;
  dailyReminders: boolean;
  reminder: boolean;
  clues: boolean;
  quizzes: boolean;
  special: boolean;
  finale: boolean;
  /** `HH:mm` nel fuso `timezone`. */
  preferredTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  dailyReminders: true,
  reminder: true,
  clues: true,
  quizzes: true,
  special: true,
  finale: true,
  preferredTime: "08:00",
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  timezone: "Europe/Rome",
};

/** Dispositivo iscritto, con endpoint già mascherato per il client. */
export interface PushSubscriptionView {
  id: string;
  endpointHint: string;
  platform: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  isActive: boolean;
}

export interface NotificationOverview {
  preferences: NotificationPreferences;
  subscriptions: PushSubscriptionView[];
  /** `false` se le chiavi VAPID non sono configurate sul server. */
  pushConfigured: boolean;
  /** `false` se la migrazione 007 non è ancora applicata. */
  migrationReady: boolean;
}

export interface NotificationDeliveryView {
  id: string;
  notificationId: string | null;
  userEmail: string;
  kind: string;
  title: string;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
}

export interface ScheduledNotificationView {
  id: string;
  title: string;
  body: string;
  kind: string;
  audience: string;
  dayNumber: number | null;
  scheduledFor: string | null;
  status: string;
  recipients: number;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
}

export interface NotificationOpsSnapshot {
  pushConfigured: boolean;
  migrationReady: boolean;
  activeSubscriptions: number;
  activeUsers: number;
  scheduled: ScheduledNotificationView[];
  deliveries: NotificationDeliveryView[];
  lastError: string | null;
}

export interface PushResult {
  ok: boolean;
  error: string | null;
  message?: string;
}

export interface DispatchSummary {
  configured: boolean;
  generated: number;
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
  expired: number;
  errors: string[];
}
