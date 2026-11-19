"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { openAdventDay } from "@/lib/services/advent";

export interface OpenDayResult {
  ok: boolean;
  error: string | null;
}

/**
 * Records the opening of an unlocked Advent day for the current user.
 * The real date check stays server-side in openAdventDay().
 */
export async function openCalendarDay(
  dayNumber: number
): Promise<OpenDayResult> {
  const user = await requireUser();

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 24) {
    return { ok: false, error: "Giorno non valido." };
  }

  const result = await openAdventDay(user.id, dayNumber);
  if (result.ok) {
    revalidatePath("/dashboard");
  }

  return result;
}
