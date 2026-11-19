import "server-only";

import * as webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_TIMEZONE } from "@/lib/utils";
import { fallbackBody } from "./messages";
import { buildAutomaticJobs } from "./generate";
import { readVapidConfig, type VapidConfig } from "./config";
import {
  MAX_DELIVERY_ATTEMPTS,
  audienceMatches,
  canNotifyKind,
  isNotificationDue,
  isWithinSendWindow,
  normalizePreferences,
  resolveScheduledDeliveryStatus,
  scheduledJobDedupeKey,
  testDedupeKey,
  toLocalParts,
} from "./rules";
import type {
  DispatchSummary,
  NotificationKind,
  NotificationPreferences,
  ScheduledNotificationView,
} from "@/types/notifications";

/**
 * Invio Web Push lato server.
 *
 * Chiave privata VAPID: solo qui (modulo `server-only`). Il client riceve
 * esclusivamente `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
 *
 * Le scritture usano il service role: `notification_deliveries` non ha policy
 * di scrittura per gli utenti.
 */

const RETRY_DELAY_MS = 10 * 60 * 1000;

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface SendResult {
  ok: boolean;
  statusCode?: number;
  expired: boolean;
  error?: string;
}

export type PushSender = (
  target: PushTarget,
  payload: string,
  options: { tag: string }
) => Promise<SendResult>;

/** Sender reale. Iniettabile per i test. */
export function createWebPushSender(config: VapidConfig): PushSender {
  let configured = false;

  return async (target, payload, options) => {
    if (!configured) {
      webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
      configured = true;
    }

    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: target.keys },
        payload,
        { TTL: 3600, urgency: "normal", topic: options.tag.slice(0, 32) }
      );
      return { ok: true, expired: false };
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      const expired = statusCode === 404 || statusCode === 410;
      return {
        ok: false,
        statusCode,
        expired,
        error: error instanceof Error ? error.message : "Errore di invio sconosciuto",
      };
    }
  };
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  is_active: boolean;
}

interface PreferenceRow {
  user_id: string;
  enabled: boolean | null;
  daily_reminders: boolean | null;
  reminder: boolean | null;
  clues: boolean | null;
  quizzes: boolean | null;
  special: boolean | null;
  finale: boolean | null;
  preferred_time: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  kind: string;
  audience: string;
  target_user_id: string | null;
  day_number: number | null;
  scheduled_for: string | null;
  status: string;
  attempts: number;
  is_active: boolean;
  url: string;
  dedupe_key: string | null;
}

interface DeliveryJob {
  userId: string;
  subscription: SubscriptionRow;
  kind: string;
  title: string;
  body: string;
  url: string;
  tag: string;
  dedupeKey: string;
  notificationId: string | null;
}

type DeliveryOutcome = "sent" | "failed" | "expired" | "skipped";

function emptySummary(): DispatchSummary {
  return {
    configured: false,
    generated: 0,
    claimed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    expired: 0,
    errors: [],
  };
}

function buildPayload(job: DeliveryJob): string {
  return JSON.stringify({
    title: job.title,
    body: job.body,
    url: job.url || "/dashboard",
    kind: job.kind,
    tag: job.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });
}

function isKind(value: string): value is NotificationKind {
  return [
    "daily",
    "reminder",
    "content",
    "clue",
    "quiz",
    "special",
    "finale",
  ].includes(value);
}

async function deliver(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  sender: PushSender,
  job: DeliveryJob,
  summary: DispatchSummary
): Promise<DeliveryOutcome> {
  const insert = await supabase
    .from("notification_deliveries")
    .insert({
      notification_id: job.notificationId,
      user_id: job.userId,
      subscription_id: job.subscription.id,
      kind: job.kind,
      title: job.title,
      dedupe_key: job.dedupeKey,
      status: "pending",
      attempts: 0,
    })
    .select("id")
    .maybeSingle();

  let deliveryId: string | null = null;
  let attempts = 0;

  if (!insert.error && insert.data) {
    deliveryId = insert.data.id as string;
    summary.claimed += 1;
  } else {
    // Deduplica: la consegna esiste già. Riproviamo solo se è fallita da
    // abbastanza tempo e i tentativi non sono esauriti.
    const existing = await supabase
      .from("notification_deliveries")
      .select("id, status, attempts, updated_at")
      .eq("dedupe_key", job.dedupeKey)
      .maybeSingle();

    const row = existing.data;
    if (!row) {
      summary.errors.push(
        `Consegna non registrata: ${insert.error?.message ?? "errore sconosciuto"}`
      );
      return "skipped";
    }

    const tooManyAttempts = (row.attempts ?? 0) >= MAX_DELIVERY_ATTEMPTS;
    const tooSoon =
      Date.now() - new Date(row.updated_at as string).getTime() < RETRY_DELAY_MS;
    if (row.status !== "failed" || tooManyAttempts || tooSoon) {
      summary.skipped += 1;
      return "skipped";
    }

    attempts = (row.attempts ?? 0) + 1;
    const retry = await supabase
      .from("notification_deliveries")
      .update({ status: "pending", attempts, error: null })
      .eq("id", row.id);
    if (retry.error) {
      summary.errors.push(`Retry non registrato: ${retry.error.message}`);
      return "skipped";
    }
    deliveryId = row.id as string;
    summary.claimed += 1;
  }

  const result = await sender(
    {
      endpoint: job.subscription.endpoint,
      keys: {
        p256dh: job.subscription.keys_p256dh,
        auth: job.subscription.keys_auth,
      },
    },
    buildPayload(job),
    { tag: job.tag }
  );

  if (result.ok) {
    await supabase
      .from("notification_deliveries")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .eq("id", deliveryId);
    summary.sent += 1;
    return "sent";
  }

  if (result.expired) {
    await supabase
      .from("notification_deliveries")
      .update({
        status: "failed",
        error: "Subscription scaduta (404/410).",
      })
      .eq("id", deliveryId);
    await supabase
      .from("notification_subscriptions")
      .update({ is_active: false })
      .eq("id", job.subscription.id);
    summary.expired += 1;
    return "expired";
  }

  await supabase
    .from("notification_deliveries")
    .update({
      status: "failed",
      attempts: Math.max(attempts, 1),
      error: (result.error ?? "Invio fallito").slice(0, 300),
    })
    .eq("id", deliveryId);
  summary.failed += 1;
  return "failed";
}

function audienceAndPreferenceMatch(options: {
  notification: NotificationRow;
  subscription: SubscriptionRow;
  preferences: NotificationPreferences;
  isAdmin: boolean;
  openedDay: boolean;
}): boolean {
  const { notification, subscription, preferences, isAdmin, openedDay } = options;
  if (!preferences.enabled) return false;
  if (!isKind(notification.kind)) return false;
  if (!canNotifyKind(preferences, notification.kind)) return false;

  return audienceMatches({
    audience: notification.audience,
    targetUserId: notification.target_user_id,
    userId: subscription.user_id,
    isAdmin,
    openedDay,
  });
}

async function loadCommon(supabase: Awaited<ReturnType<typeof createAdminClient>>) {
  const [subscriptions, preferences, users, days, openings] = await Promise.all([
    supabase
      .from("notification_subscriptions")
      .select("id, user_id, endpoint, keys_p256dh, keys_auth, is_active")
      .eq("is_active", true),
    supabase.from("notification_preferences").select("*"),
    supabase.from("users").select("id, role"),
    supabase.from("advent_days").select("day_number, unlock_date"),
    supabase.from("user_openings").select("user_id, day_number"),
  ]);

  if (subscriptions.error) {
    throw new Error(`Lettura subscription fallita: ${subscriptions.error.message}`);
  }

  const preferencesByUser = new Map<string, NotificationPreferences>();
  for (const row of (preferences.data ?? []) as PreferenceRow[]) {
    preferencesByUser.set(row.user_id, normalizePreferences(row));
  }

  const roleByUser = new Map<string, string>();
  for (const row of users.data ?? []) {
    roleByUser.set(row.id, row.role);
  }

  const unlockedDays = new Map<number, Date>();
  for (const row of days.data ?? []) {
    unlockedDays.set(row.day_number, new Date(row.unlock_date));
  }

  const openedDaysByUser = new Map<string, Set<number>>();
  for (const row of openings.data ?? []) {
    const set = openedDaysByUser.get(row.user_id) ?? new Set<number>();
    set.add(row.day_number);
    openedDaysByUser.set(row.user_id, set);
  }

  return {
    subscriptions: (subscriptions.data ?? []) as SubscriptionRow[],
    preferencesByUser,
    roleByUser,
    unlockedDays,
    openedDaysByUser,
  };
}

function todayContext(now: Date, unlockedDays: Map<number, Date>) {
  const local = toLocalParts(now, APP_TIMEZONE);
  const month = Number(local.dateString.slice(5, 7));
  const day = Number(local.dateString.slice(8, 10));
  const dayNumber = month === 12 && day >= 1 && day <= 24 ? day : null;
  const unlock = dayNumber ? unlockedDays.get(dayNumber) : undefined;

  return {
    dayNumber,
    unlocked: Boolean(unlock && unlock.getTime() <= now.getTime()),
    dateString: local.dateString,
  };
}

/** Ciclo completo: notifiche automatiche + programmate dovute. */
export async function runNotificationCycle(
  now: Date = new Date()
): Promise<DispatchSummary> {
  const summary = emptySummary();
  const config = readVapidConfig();
  if (!config) return summary;

  summary.configured = true;
  const supabase = await createAdminClient();
  const sender = createWebPushSender(config);
  const common = await loadCommon(supabase);
  if (common.subscriptions.length === 0) return summary;

  const today = todayContext(now, common.unlockedDays);

  const generated = buildAutomaticJobs({
    now,
    today,
    subscriptions: common.subscriptions.map((subscription) => ({
      id: subscription.id,
      userId: subscription.user_id,
    })),
    preferencesByUser: common.preferencesByUser,
    openedDaysByUser: common.openedDaysByUser,
  });

  summary.generated = generated.length;

  for (const job of generated) {
    const subscription = common.subscriptions.find(
      (item) => item.id === job.subscriptionId
    );
    if (!subscription) continue;

    await deliver(
      supabase,
      sender,
      {
        userId: job.userId,
        subscription,
        kind: job.kind,
        title: job.title,
        body: job.body,
        url: job.url,
        tag: job.tag,
        dedupeKey: job.dedupeKey,
        notificationId: null,
      },
      summary
    );
  }

  const notifications = await supabase
    .from("scheduled_notifications")
    .select("*")
    .eq("is_active", true)
    .in("status", ["pending", "failed", "sending"]);

  for (const raw of (notifications.data ?? []) as NotificationRow[]) {
    const due = isNotificationDue(
      {
        id: raw.id,
        isActive: raw.is_active,
        status: raw.status,
        scheduledFor: raw.scheduled_for,
        dayNumber: raw.day_number,
        attempts: raw.attempts ?? 0,
      },
      now,
      common.unlockedDays
    );
    if (!due) continue;

    const result = await sendScheduledNotification(supabase, sender, raw, {
      now,
      attempt: raw.attempts ?? 0,
      ignoreWindow: false,
      common,
    });

    summary.sent += result.sent;
    summary.failed += result.failed;
    summary.skipped += result.skipped;
    summary.expired += result.expired;
    summary.claimed += result.claimed;
    if (result.error) summary.errors.push(result.error);
  }

  return summary;
}

interface SendScheduledResult {
  sent: number;
  failed: number;
  skipped: number;
  expired: number;
  claimed: number;
  eligible: number;
  error?: string;
}

async function sendScheduledNotification(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  sender: PushSender,
  notification: NotificationRow,
  options: {
    now: Date;
    attempt: number;
    ignoreWindow: boolean;
    resend?: boolean;
    common?: Awaited<ReturnType<typeof loadCommon>>;
  }
): Promise<SendScheduledResult> {
  const common = options.common ?? (await loadCommon(supabase));
  const deliverySummary = emptySummary();
  let eligible = 0;

  const title = notification.title;
  const body = notification.body || fallbackBody(notification.kind);
  const url = notification.url || "/dashboard";

  for (const subscription of common.subscriptions) {
    const preferences =
      common.preferencesByUser.get(subscription.user_id) ??
      normalizePreferences(null);
    const isAdmin = common.roleByUser.get(subscription.user_id) === "admin";
    const openedDay = notification.day_number
      ? (common.openedDaysByUser.get(subscription.user_id)?.has(notification.day_number) ??
        false)
      : false;

    if (
      !audienceAndPreferenceMatch({
        notification,
        subscription,
        preferences,
        isAdmin,
        openedDay,
      })
    ) {
      continue;
    }

    // Le notifiche automatiche rispettano la finestra oraria; un invio
    // esplicito dell'admin o una data programmata la ignorano.
    if (!options.ignoreWindow && !notification.scheduled_for) {
      if (!isWithinSendWindow(options.now, preferences)) continue;
    }

    eligible += 1;

    await deliver(
      supabase,
      sender,
      {
        userId: subscription.user_id,
        subscription,
        kind: notification.kind,
        title,
        body,
        url,
        tag: `notification-${notification.id}`,
        dedupeKey: scheduledJobDedupeKey(
          notification.id,
          subscription.id,
          Boolean(options.resend),
          options.attempt
        ),
        notificationId: notification.id,
      },
      deliverySummary
    );
  }

  const failed = deliverySummary.failed + deliverySummary.expired;
  const resolved = resolveScheduledDeliveryStatus({
    sent: deliverySummary.sent,
    failed,
    eligible,
    attempt: options.attempt,
  });
  const { status, attempts, lastError } = resolved;

  const update = await supabase
    .from("scheduled_notifications")
    .update({
      status,
      attempts,
      recipients_count: deliverySummary.sent,
      sent_at: deliverySummary.sent > 0 ? new Date().toISOString() : null,
      last_error: lastError,
    })
    .eq("id", notification.id);

  if (update.error) {
    deliverySummary.errors.push(
      `Aggiornamento notifica fallito: ${update.error.message}`
    );
  }

  return {
    sent: deliverySummary.sent,
    failed: deliverySummary.failed,
    skipped: deliverySummary.skipped,
    expired: deliverySummary.expired,
    claimed: deliverySummary.claimed,
    eligible,
    error: deliverySummary.errors[0],
  };
}

/** Invio immediato richiesto dall'admin (bypassa data e finestra oraria). */
export async function dispatchNotificationNow(
  notificationId: string,
  options: { resend?: boolean; now?: Date } = {}
): Promise<{ ok: boolean; error: string | null; message: string; sent: number }> {
  const config = readVapidConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "Chiavi VAPID non configurate: il delivery Web Push è disattivato.",
      message: "",
      sent: 0,
    };
  }

  const supabase = await createAdminClient();
  const notification = await supabase
    .from("scheduled_notifications")
    .select("*")
    .eq("id", notificationId)
    .maybeSingle();

  if (notification.error) {
    return { ok: false, error: notification.error.message, message: "", sent: 0 };
  }
  const row = notification.data as NotificationRow | null;
  if (!row) return { ok: false, error: "Notifica non trovata.", message: "", sent: 0 };
  if (row.status === "sent" && !options.resend) {
    return {
      ok: false,
      error: 'Notifica già inviata. Usa "Reinvia" per una nuova consegna.',
      message: "",
      sent: 0,
    };
  }

  const attempt = options.resend
    ? (row.attempts ?? 0) + 1
    : (row.attempts ?? 0);
  const result = await sendScheduledNotification(
    supabase,
    createWebPushSender(config),
    row,
    {
      now: options.now ?? new Date(),
      attempt,
      ignoreWindow: true,
      resend: options.resend,
    }
  );

  if (result.error) {
    return { ok: false, error: result.error, message: "", sent: result.sent };
  }
  if (result.sent === 0) {
    return {
      ok: false,
      error:
        "Nessun destinatario idoneo: nessun dispositivo attivo o preferenze disattivate.",
      message: "",
      sent: 0,
    };
  }

  return {
    ok: true,
    error: null,
    message: `Notifica inviata a ${result.sent} dispositivo/i.`,
    sent: result.sent,
  };
}

/** Notifica di prova: solo ai dispositivi dell'amministratore che la chiede. */
export async function sendTestNotificationToUser(
  userId: string,
  now: Date = new Date()
): Promise<{ ok: boolean; error: string | null; message: string }> {
  const config = readVapidConfig();
  if (!config) {
    return {
      ok: false,
      error: "Chiavi VAPID non configurate: il delivery Web Push è disattivato.",
      message: "",
    };
  }

  const supabase = await createAdminClient();
  const subscriptions = await supabase
    .from("notification_subscriptions")
    .select("id, user_id, endpoint, keys_p256dh, keys_auth, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (subscriptions.error) {
    return { ok: false, error: subscriptions.error.message, message: "" };
  }

  const rows = (subscriptions.data ?? []) as SubscriptionRow[];
  if (rows.length === 0) {
    return {
      ok: false,
      error:
        "Nessun dispositivo attivo. Attiva le notifiche dalle impostazioni del tuo account.",
      message: "",
    };
  }

  const sender = createWebPushSender(config);
  const summary = emptySummary();
  for (const subscription of rows) {
    await deliver(
      supabase,
      sender,
      {
        userId,
        subscription,
        kind: "test",
        title: "Prova notifiche · Christmas Wonderland",
        body: "Se vedi questo messaggio, il delivery Web Push funziona. 🎄",
        url: "/dashboard/impostazioni",
        tag: "test-notification",
        dedupeKey: testDedupeKey(now, subscription.id),
        notificationId: null,
      },
      summary
    );
  }

  if (summary.sent === 0) {
    return {
      ok: false,
      error:
        summary.errors[0] ??
        "Invio di prova fallito. Controlla le chiavi VAPID e la subscription.",
      message: "",
    };
  }

  return {
    ok: true,
    error: null,
    message: `Notifica di prova inviata a ${summary.sent} dispositivo/i.`,
  };
}

/** Righe per il pannello admin, senza endpoint in chiaro. */
export function toScheduledView(row: Record<string, unknown>): ScheduledNotificationView {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    kind: String(row.kind ?? "special"),
    audience: String(row.audience ?? "all"),
    dayNumber: (row.day_number as number | null) ?? null,
    scheduledFor: (row.scheduled_for as string | null) ?? null,
    status: String(row.status ?? "pending"),
    recipients: Number(row.recipients_count ?? 0),
    attempts: Number(row.attempts ?? 0),
    lastError: (row.last_error as string | null) ?? null,
    sentAt: (row.sent_at as string | null) ?? null,
  };
}
