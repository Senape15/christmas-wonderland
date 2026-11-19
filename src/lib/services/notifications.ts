import "server-only";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured } from "@/lib/push/config";
import { describeDevice, maskEndpoint, normalizePreferences } from "@/lib/push/rules";
import { detectPushCapabilities } from "./capabilities";
import type {
  NotificationDeliveryView,
  NotificationOverview,
  NotificationOpsSnapshot,
  PushSubscriptionView,
} from "@/types/notifications";

/**
 * Letture della Fase 7.
 *
 * Le preferenze e i dispositivi personali passano dal client RLS dell'utente
 * (filtro esplicito `user_id`, difesa in profondità oltre alla policy). Il
 * pannello admin usa il service role solo per leggere il log delle consegne,
 * che non ha policy di lettura per gli utenti normali.
 */

interface SubscriptionRow {
  id: string;
  endpoint: string;
  platform: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export async function getNotificationOverview(
  userId: string
): Promise<NotificationOverview> {
  const capabilities = await detectPushCapabilities();
  const supabase = await createClient();

  if (!capabilities.ready) {
    return {
      preferences: normalizePreferences(null),
      subscriptions: [],
      pushConfigured: isPushConfigured(),
      migrationReady: false,
    };
  }

  const [preferences, subscriptions] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("notification_subscriptions")
      .select("id, endpoint, platform, user_agent, is_active, created_at, last_seen_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (preferences.error) {
    throw new Error(`Lettura preferenze fallita: ${preferences.error.message}`);
  }
  if (subscriptions.error) {
    throw new Error(`Lettura dispositivi fallita: ${subscriptions.error.message}`);
  }

  const subscriptionsView: PushSubscriptionView[] = (
    (subscriptions.data ?? []) as SubscriptionRow[]
  ).map((row) => ({
    id: row.id,
    endpointHint: maskEndpoint(row.endpoint),
    platform: row.platform ?? "web",
    deviceLabel: describeDevice(row.user_agent),
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at ?? row.created_at,
    isActive: row.is_active,
  }));

  return {
    preferences: normalizePreferences(preferences.data),
    subscriptions: subscriptionsView,
    pushConfigured: isPushConfigured(),
    migrationReady: true,
  };
}

export async function getNotificationOps(): Promise<NotificationOpsSnapshot> {
  await requireAdmin();
  const capabilities = await detectPushCapabilities();
  const pushConfigured = isPushConfigured();

  if (!capabilities.ready) {
    return {
      pushConfigured,
      migrationReady: false,
      activeSubscriptions: 0,
      activeUsers: 0,
      scheduled: [],
      deliveries: [],
      lastError: null,
    };
  }

  const supabase = await createAdminClient();

  const [subscriptions, users, scheduled, deliveries] = await Promise.all([
    supabase
      .from("notification_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("scheduled_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notification_deliveries")
      .select("id, notification_id, user_id, kind, title, status, attempts, error, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const emailById = new Map<string, string>();
  if ((deliveries.data ?? []).length > 0) {
    const mail = await supabase.from("users").select("id, email");
    for (const row of mail.data ?? []) emailById.set(row.id, row.email);
  }

  const deliveriesView: NotificationDeliveryView[] = (deliveries.data ?? []).map(
    (row) => ({
      id: row.id,
      notificationId: row.notification_id,
      userEmail: emailById.get(row.user_id) ?? "utente",
      kind: row.kind,
      title: row.title,
      status: row.status,
      attempts: row.attempts,
      error: row.error,
      createdAt: row.created_at,
    })
  );

  const scheduledView = (scheduled.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    kind: String(row.kind ?? "special"),
    audience: String(row.audience ?? "all"),
    dayNumber: row.day_number,
    scheduledFor: row.scheduled_for,
    status: String(row.status ?? "pending"),
    recipients: Number(row.recipients_count ?? 0),
    attempts: Number(row.attempts ?? 0),
    lastError: row.last_error,
    sentAt: row.sent_at,
  }));

  const lastFailure =
    deliveriesView.find((row) => row.status === "failed" && row.error)?.error ??
    scheduledView.find((row) => row.status === "failed" && row.lastError)?.lastError ??
    null;

  return {
    pushConfigured,
    migrationReady: true,
    activeSubscriptions: subscriptions.count ?? 0,
    activeUsers: users.count ?? 0,
    scheduled: scheduledView,
    deliveries: deliveriesView,
    lastError: lastFailure,
  };
}
