import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/types/database";
import type { CalendarData, CalendarDay, ElfMessage } from "@/types/calendar";

export type AdventDay = Row<"advent_days">;

const ADVENT_DAYS = 24;

type VisibleAdventDay = Pick<
  AdventDay,
  "day_number" | "title" | "description" | "unlock_date"
>;

/**
 * Returns the advent days visible to the current user.
 * SECURITY: RLS guarantees only unlocked days are returned;
 * the unlock_date <= now() check happens in the database policy,
 * never in the client. This double-check is defense in depth.
 */
export async function getVisibleAdventDays(): Promise<AdventDay[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advent_days")
    .select("*")
    .order("day_number", { ascending: true });

  if (error) return [];

  const now = new Date();
  return data.filter((d) => new Date(d.unlock_date) <= now);
}

/**
 * Returns a single day only if it is unlocked (server-side date check).
 * Future gift data is never sent to the client.
 */
export async function getAdventDay(
  dayNumber: number
): Promise<AdventDay | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advent_days")
    .select("*")
    .eq("day_number", dayNumber)
    .single();

  if (error || !data) return null;
  if (new Date(data.unlock_date) > new Date()) return null;

  return data;
}

/**
 * Records that the user opened a given day.
 * Returns an error if the day is not yet unlocked (server-side enforcement).
 */
export async function openAdventDay(
  userId: string,
  dayNumber: number
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();

  const day = await getAdventDay(dayNumber);
  if (!day) {
    return { ok: false, error: "Questo giorno non è ancora sbloccato." };
  }

  const { error } = await supabase.from("user_openings").insert({
    user_id: userId,
    day_number: dayNumber,
  });

  if (error) {
    // Unique constraint violation = already opened, not a real error
    if (error.code === "23505") {
      return { ok: true, error: null };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

/**
 * Expands the unlocked day rows returned by RLS into the full 1..24 calendar.
 * Locked days deliberately carry no title/description: the database never
 * exposes future rows, so the UI must not invent or reveal them.
 */
export function buildCalendarDays(
  visibleDays: VisibleAdventDay[],
  openedDayNumbers: Iterable<number>,
  now: Date = new Date()
): CalendarDay[] {
  const opened = new Set(openedDayNumbers);
  const byDayNumber = new Map(
    visibleDays.map((day) => [day.day_number, day])
  );

  return Array.from({ length: ADVENT_DAYS }, (_, index) => {
    const dayNumber = index + 1;
    const day = byDayNumber.get(dayNumber);

    if (!day) {
      return {
        dayNumber,
        title: null,
        description: null,
        unlockDate: null,
        isUnlocked: false,
        isOpened: false,
      };
    }

    // Defense in depth: RLS already filters on unlock_date <= now().
    const isUnlocked = new Date(day.unlock_date) <= now;

    return {
      dayNumber,
      title: isUnlocked ? day.title : null,
      description: isUnlocked ? day.description : null,
      unlockDate: isUnlocked ? day.unlock_date : null,
      isUnlocked,
      isOpened: isUnlocked && opened.has(dayNumber),
    };
  });
}

export async function getOpenedDayNumbers(userId: string): Promise<number[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_openings")
    .select("day_number")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map((row) => row.day_number);
}

export async function getElfMessages(): Promise<Record<number, ElfMessage>> {
  const supabase = await createClient();

  // RLS returns messages only for days whose unlock_date has passed.
  const { data, error } = await supabase
    .from("elf_messages")
    .select("day_number, author, message")
    .order("day_number", { ascending: true });

  if (error || !data) return {};

  const messages: Record<number, ElfMessage> = {};
  for (const row of data) {
    messages[row.day_number] = { author: row.author, message: row.message };
  }
  return messages;
}

export async function getSecretMessages(
  userId: string
): Promise<Record<number, string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("secret_messages")
    .select("day_number, content")
    .eq("user_id", userId);

  if (error || !data) return {};

  const messages: Record<number, string> = {};
  for (const row of data) {
    messages[row.day_number] = row.content;
  }
  return messages;
}

/**
 * Everything the dashboard calendar needs, in one request.
 * Secret messages are filtered again to unlocked days even though the
 * owner-scoped policy already prevents reading other users' messages.
 */
export async function getCalendarData(userId: string): Promise<CalendarData> {
  const [visibleDays, openedDays, elfMessages, secretMessages] = await Promise.all([
    getVisibleAdventDays(),
    getOpenedDayNumbers(userId),
    getElfMessages(),
    getSecretMessages(userId),
  ]);

  const days = buildCalendarDays(visibleDays, openedDays);
  const unlockedDays = new Set(
    days.filter((day) => day.isUnlocked).map((day) => day.dayNumber)
  );

  const unlockedSecretMessages: Record<number, string> = {};
  for (const [dayKey, content] of Object.entries(secretMessages)) {
    const dayNumber = Number(dayKey);
    if (unlockedDays.has(dayNumber)) {
      unlockedSecretMessages[dayNumber] = content;
    }
  }

  return {
    days,
    elfMessages,
    secretMessages: unlockedSecretMessages,
    openedCount: days.filter((day) => day.isOpened).length,
  };
}
