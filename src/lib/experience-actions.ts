"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { loadDayExperience } from "@/lib/services/experience";
import {
  verifyContentPassword,
  verifyFinalBoxPassword,
  verifyQuizAnswer,
} from "@/lib/services/verification";
import type {
  DayExperienceResult,
  FinalBoxActionResult,
  PasswordActionResult,
  QuizActionResult,
} from "@/types/experience";

/**
 * Server Actions dell'esperienza quotidiana.
 *
 * Ogni azione:
 *  - ricava l'utente dalla sessione (mai da un id inviato dal client);
 *  - valida gli input con Zod;
 *  - delega la verifica ai servizi server-only;
 *  - invalida la dashboard solo dopo un esito positivo.
 *
 * Hash delle password, risposte corrette, tentativi e completamenti non
 * attraversano mai questo confine: al browser tornano solo esiti e messaggi
 * configurati dall'amministratore.
 */

const daySchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(24),
});

const passwordSchema = z.object({
  contentId: z.string().uuid(),
  password: z.string().min(1).max(200),
});

const quizSchema = z.object({
  quizId: z.string().uuid(),
  answerId: z.string().uuid(),
});

const finalBoxSchema = z.object({
  boxId: z.string().uuid(),
  password: z.string().min(1).max(200),
});

export async function openDayExperienceAction(
  dayNumber: unknown
): Promise<DayExperienceResult> {
  const parsed = daySchema.safeParse({ dayNumber });
  if (!parsed.success) {
    return { ok: false, data: null, error: "Giorno non valido." };
  }

  const user = await requireUser();
  const result = await loadDayExperience(user, parsed.data.dayNumber, {
    recordOpening: true,
  });

  if (result.ok) {
    revalidatePath("/dashboard");
  }

  return result;
}

export async function submitContentPasswordAction(
  contentId: unknown,
  password: unknown
): Promise<PasswordActionResult> {
  const parsed = passwordSchema.safeParse({ contentId, password });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dati non validi.",
      message: null,
      remainingAttempts: null,
      completed: false,
      simulation: false,
    };
  }

  const user = await requireUser();
  const result = await verifyContentPassword(
    user,
    parsed.data.contentId,
    parsed.data.password
  );

  if (result.ok && !result.simulation) {
    revalidatePath("/dashboard");
  }

  return result;
}

export async function submitQuizAnswerAction(
  quizId: unknown,
  answerId: unknown
): Promise<QuizActionResult> {
  const parsed = quizSchema.safeParse({ quizId, answerId });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dati non validi.",
      correct: null,
      message: null,
      correctAnswerText: null,
      points: 0,
      completed: false,
      simulation: false,
    };
  }

  const user = await requireUser();
  const result = await verifyQuizAnswer(
    user,
    parsed.data.quizId,
    parsed.data.answerId
  );

  if (result.ok && result.correct && !result.simulation) {
    revalidatePath("/dashboard");
  }

  return result;
}

export async function submitFinalBoxPasswordAction(
  boxId: unknown,
  password: unknown
): Promise<FinalBoxActionResult> {
  const parsed = finalBoxSchema.safeParse({ boxId, password });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dati non validi.",
      message: null,
      completed: false,
      simulation: false,
    };
  }

  const user = await requireUser();
  const result = await verifyFinalBoxPassword(
    user,
    parsed.data.boxId,
    parsed.data.password
  );

  if (result.ok && !result.simulation) {
    revalidatePath("/dashboard");
  }

  return result;
}
