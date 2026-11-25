import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/auth";
import type {
  VillageData,
  VillageDialogueLine,
  VillageDialogues,
} from "@/types/village";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Frasi del villaggio configurate dall'admin tramite i quiz.
 *
 * Sicurezza: solo giorni già sbloccati (il payload del villaggio ha già
 * rimosso `dayNumber` ai luoghi futuri) e solo la risposta corretta di quiz
 * completati dall'utente. Nessun testo di giorni futuri lascia il server.
 */
export async function getVillageDialogues(
  user: CurrentUser,
  village: VillageData
): Promise<VillageDialogues> {
  const dayByKind = new Map<string, number>();
  for (const hotspot of village.hotspots) {
    if (hotspot.dayNumber !== null) dayByKind.set(hotspot.kind, hotspot.dayNumber);
  }
  if (dayByKind.size === 0) return {};

  const client = await createClient();
  const [quizzesResult, attemptsResult] = await Promise.all([
    client
      .from("quizzes")
      .select("id, day_number, question, hint, is_active")
      .eq("is_active", true),
    client
      .from("user_quiz_attempts")
      .select("quiz_id, is_correct")
      .eq("user_id", user.id)
      .eq("is_correct", true),
  ]);

  const completedIds = new Set(
    (attemptsResult.data ?? [])
      .filter((row) => row.is_correct === true)
      .map((row) => text(row.quiz_id))
  );

  let answerByQuiz = new Map<string, string>();
  if (completedIds.size > 0) {
    const admin = await createAdminClient();
    const answersResult = await admin
      .from("quiz_answers")
      .select("quiz_id, answer_text")
      .eq("is_correct", true)
      .eq("is_active", true)
      .in("quiz_id", [...completedIds]);
    answerByQuiz = new Map(
      (answersResult.data ?? []).map((row) => [
        text(row.quiz_id),
        text(row.answer_text),
      ])
    );
  }

  const dialogues: VillageDialogues = {};

  for (const raw of quizzesResult.data ?? []) {
    const row = raw as Row;
    const day = Number(row.day_number);
    if (!Number.isInteger(day)) continue;

    // Un quiz vale per tutti i luoghi dello stesso giorno; se ha una
    // posizione nota la usiamo, altrimenti la frase comparirà nel luogo del
    // giorno con lo stesso kind.
    const quizId = text(row.id);
    const matches = village.hotspots.filter(
      (hotspot) => hotspot.dayNumber === day
    );
    if (matches.length === 0) continue;

    const answer = answerByQuiz.get(quizId);
    for (const hotspot of matches) {
      const lines: VillageDialogueLine[] = [];
      const question = text(row.question);
      if (question) lines.push(["npc", question]);
      if (hotspot.nicoMessage) lines.push(["nico", hotspot.nicoMessage]);
      if (answer) lines.push(["npc", answer]);
      if (lines.length > 0) dialogues[hotspot.kind] = lines;
    }
  }

  return dialogues;
}
