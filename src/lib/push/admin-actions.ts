"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { reportServerError } from "@/lib/server-error";
import {
  dispatchNotificationNow,
  runNotificationCycle,
  sendTestNotificationToUser,
} from "@/lib/push/dispatch";
import type { PushResult } from "@/types/notifications";

/**
 * Azioni amministrative di invio.
 *
 * Ogni funzione richiama requireAdmin(): la semplice presenza della pagina
 * /admin/notifications non è una protezione sufficiente.
 */

const idSchema = z.string().uuid();

export interface AdminSendResult extends PushResult {
  sent?: number;
}

export async function adminSendNotificationNow(
  notificationId: string,
  resend = false
): Promise<AdminSendResult> {
  try {
    await requireAdmin();
    const parsed = idSchema.safeParse(notificationId);
    if (!parsed.success) return { ok: false, error: "Notifica non valida." };

    const result = await dispatchNotificationNow(parsed.data, { resend });
    revalidatePath("/admin/notifications");
    return {
      ok: result.ok,
      error: result.error,
      message: result.message,
      sent: result.sent,
    };
  } catch (error) {
    return {
      ok: false,
      error: reportServerError("push/admin-actions", error),
    };
  }
}

export async function adminSendTestNotification(): Promise<AdminSendResult> {
  try {
    const user = await requireAdmin();
    const result = await sendTestNotificationToUser(user.id);
    revalidatePath("/admin/notifications");
    return { ok: result.ok, error: result.error, message: result.message };
  } catch (error) {
    return {
      ok: false,
      error: reportServerError("push/admin-actions", error),
    };
  }
}

export async function adminRunNotificationCycle(): Promise<AdminSendResult> {
  try {
    await requireAdmin();
    const summary = await runNotificationCycle();

    if (!summary.configured) {
      return {
        ok: false,
        error:
          "Chiavi VAPID non configurate: nessuna notifica può essere inviata.",
      };
    }

    revalidatePath("/admin/notifications");
    return {
      ok: true,
      error: null,
      message: `Ciclo completato: ${summary.sent} inviate, ${summary.failed} fallite, ${summary.skipped} saltate, ${summary.expired} dispositivi scaduti.`,
      sent: summary.sent,
    };
  } catch (error) {
    return {
      ok: false,
      error: reportServerError("push/admin-actions", error),
    };
  }
}
