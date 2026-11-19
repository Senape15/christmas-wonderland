import { canNotifyKind, isWithinSendWindow, isReminderDue } from "./rules";
import { DAILY_BODY, DAILY_TITLE, REMINDER_BODY } from "./messages";
import type { NotificationPreferences } from "@/types/notifications";

/**
 * Costruzione delle notifiche automatiche (giornaliera e promemoria).
 *
 * Funzione pura: riceve lo stato già filtrato dal server e restituisce i job
 * da inviare. Non conosce Supabase, quindi è testabile in modo esaustivo.
 */

export interface AutomaticSubscription {
  id: string;
  userId: string;
}

export interface TodayContext {
  /** `null` fuori dal periodo 1–24 dicembre o se il giorno non esiste. */
  dayNumber: number | null;
  unlocked: boolean;
  /** Data civile `YYYY-MM-DD` a Roma, usata per la deduplica. */
  dateString: string;
}

export interface AutomaticInput {
  now: Date;
  today: TodayContext;
  subscriptions: AutomaticSubscription[];
  preferencesByUser: ReadonlyMap<string, NotificationPreferences>;
  openedDaysByUser: ReadonlyMap<string, ReadonlySet<number>>;
}

export interface GeneratedJob {
  subscriptionId: string;
  userId: string;
  kind: "daily" | "reminder";
  title: string;
  body: string;
  url: string;
  tag: string;
  dedupeKey: string;
}

export function buildAutomaticJobs(input: AutomaticInput): GeneratedJob[] {
  const { now, today, subscriptions } = input;
  if (!today.dayNumber || !today.unlocked) return [];

  const jobs: GeneratedJob[] = [];
  const url = `/dashboard?giorno=${today.dayNumber}`;

  for (const subscription of subscriptions) {
    const preferences = input.preferencesByUser.get(subscription.userId);
    if (!preferences) continue;

    if (canNotifyKind(preferences, "daily") && isWithinSendWindow(now, preferences)) {
      jobs.push({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        kind: "daily",
        title: DAILY_TITLE,
        body: DAILY_BODY,
        url,
        tag: `daily-${today.dateString}`,
        dedupeKey: `daily:${today.dateString}:${subscription.id}`,
      });
    }

    const opened =
      input.openedDaysByUser.get(subscription.userId)?.has(today.dayNumber) ?? false;

    if (!opened && isReminderDue(now, preferences)) {
      jobs.push({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        kind: "reminder",
        title: DAILY_TITLE,
        body: REMINDER_BODY,
        url,
        tag: `reminder-${today.dateString}`,
        dedupeKey: `reminder:${today.dateString}:${subscription.id}`,
      });
    }
  }

  return jobs;
}
