"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { reportServerError } from "@/lib/server-error";
import { createClient } from "@/lib/supabase/server";
import { detectPushCapabilities } from "@/lib/services/capabilities";
import { isPreferredTimeSendable } from "@/lib/push/rules";
import { APP_TIMEZONE } from "@/lib/utils";
import type { PushResult } from "@/types/notifications";

/**
 * Server Actions delle preferenze e delle subscription Web Push.
 *
 * L'identità arriva SEMPRE dalla sessione: il client non può dichiarare per
 * quale utente iscrivere un dispositivo. Le policy RLS della 007 limitano
 * comunque ogni scrittura a `auth.uid() = user_id`.
 */

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Orario non valido (usa HH:mm).");

const preferencesSchema = z
  .object({
    enabled: z.boolean(),
    dailyReminders: z.boolean(),
    reminder: z.boolean(),
    clues: z.boolean(),
    quizzes: z.boolean(),
    special: z.boolean(),
    finale: z.boolean(),
    preferredTime: timeSchema,
    quietHoursStart: timeSchema,
    quietHoursEnd: timeSchema,
  })
  .strict();

const subscriptionSchema = z
  .object({
    endpoint: z.string().url().max(2048),
    keys: z
      .object({
        p256dh: z.string().min(16).max(512),
        auth: z.string().min(8).max(256),
      })
      .strict(),
  })
  .strict();

const endpointSchema = z.object({ endpoint: z.string().url().max(2048) }).strict();

function unavailable(): PushResult {
  return {
    ok: false,
    error:
      "Esegui la migrazione 007_push_notifications.sql nel SQL Editor di Supabase per attivare le notifiche.",
  };
}

export async function saveNotificationPreferences(
  input: unknown
): Promise<PushResult> {
  try {
    const user = await requireUser();
    const capabilities = await detectPushCapabilities();
    if (!capabilities.ready) return unavailable();

    const parsed = preferencesSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "preferenze"}: ${issue.message}`)
          .join("; "),
      };
    }

    const values = parsed.data;
    if (!isPreferredTimeSendable({
      enabled: values.enabled,
      dailyReminders: values.dailyReminders,
      reminder: values.reminder,
      clues: values.clues,
      quizzes: values.quizzes,
      special: values.special,
      finale: values.finale,
      preferredTime: values.preferredTime,
      quietHoursStart: values.quietHoursStart,
      quietHoursEnd: values.quietHoursEnd,
      timezone: APP_TIMEZONE,
    })) {
      return {
        ok: false,
        error: "L'orario preferito non può cadere nelle ore di silenzio.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        enabled: values.enabled,
        daily_reminders: values.dailyReminders,
        reminder: values.reminder,
        clues: values.clues,
        quizzes: values.quizzes,
        special: values.special,
        finale: values.finale,
        preferred_time: values.preferredTime,
        quiet_hours_start: values.quietHoursStart,
        quiet_hours_end: values.quietHoursEnd,
        timezone: APP_TIMEZONE,
      },
      { onConflict: "user_id" }
    );

    if (error) return { ok: false, error: `Salvataggio fallito: ${error.message}` };

    revalidatePath("/dashboard/impostazioni");
    return { ok: true, error: null, message: "Preferenze salvate." };
  } catch (error) {
    return {
      ok: false,
      error: reportServerError("push/actions", error),
    };
  }
}

export async function registerPushSubscription(
  input: unknown
): Promise<PushResult> {
  try {
    const user = await requireUser();
    const capabilities = await detectPushCapabilities();
    if (!capabilities.ready) return unavailable();

    const parsed = subscriptionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Dati del dispositivo non validi." };
    }

    const headerList = await headers();
    const userAgent = (headerList.get("user-agent") ?? "").slice(0, 400);

    const supabase = await createClient();
    const { error } = await supabase.from("notification_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        keys_p256dh: parsed.data.keys.p256dh,
        keys_auth: parsed.data.keys.auth,
        user_agent: userAgent,
        platform: "web",
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) return { ok: false, error: `Registrazione fallita: ${error.message}` };

    // Iscrizione = consenso: attiva le notifiche senza sovrascrivere le
    // preferenze già scelte dall'utente.
    await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: user.id, timezone: APP_TIMEZONE },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

    revalidatePath("/dashboard/impostazioni");
    return { ok: true, error: null, message: "Notifiche attive su questo dispositivo." };
  } catch (error) {
    return {
      ok: false,
      error: reportServerError("push/actions", error),
    };
  }
}

export async function removePushSubscription(
  input: unknown
): Promise<PushResult> {
  try {
    const user = await requireUser();
    const capabilities = await detectPushCapabilities();
    if (!capabilities.ready) return unavailable();

    const parsed = endpointSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Dispositivo non valido." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("notification_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", parsed.data.endpoint);

    if (error) return { ok: false, error: `Rimozione fallita: ${error.message}` };

    revalidatePath("/dashboard/impostazioni");
    return { ok: true, error: null, message: "Dispositivo rimosso." };
  } catch (error) {
    return {
      ok: false,
      error: reportServerError("push/actions", error),
    };
  }
}

/** Rimuove un dispositivo tramite id: il client non vede mai l'endpoint. */
export async function removePushSubscriptionById(
  subscriptionId: string
): Promise<PushResult> {
  try {
    const user = await requireUser();
    const capabilities = await detectPushCapabilities();
    if (!capabilities.ready) return unavailable();

    const parsed = z.string().uuid().safeParse(subscriptionId);
    if (!parsed.success) return { ok: false, error: "Dispositivo non valido." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("notification_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("id", parsed.data);

    if (error) return { ok: false, error: `Rimozione fallita: ${error.message}` };

    revalidatePath("/dashboard/impostazioni");
    return { ok: true, error: null, message: "Dispositivo rimosso." };
  } catch (error) {
    return {
      ok: false,
      error: reportServerError("push/actions", error),
    };
  }
}

/** Rimuove TUTTI i dispositivi dell'utente (disattivazione completa). */
export async function removeAllPushSubscriptions(): Promise<PushResult> {
  try {
    const user = await requireUser();
    const capabilities = await detectPushCapabilities();
    if (!capabilities.ready) return unavailable();

    const supabase = await createClient();
    const { error } = await supabase
      .from("notification_subscriptions")
      .delete()
      .eq("user_id", user.id);

    if (error) return { ok: false, error: `Rimozione fallita: ${error.message}` };

    revalidatePath("/dashboard/impostazioni");
    return { ok: true, error: null, message: "Tutti i dispositivi sono stati rimossi." };
  } catch (error) {
    return {
      ok: false,
      error: reportServerError("push/actions", error),
    };
  }
}
