import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/admin/passwords";
import { findActiveAnswer, findCorrectAnswerText, type QuizAnswerRow } from "@/lib/experience/quiz";
import { evaluateConditions } from "@/lib/experience/conditions";
import { createDateContext, isDayUnlocked } from "@/lib/experience/time";
import { getSimulationRow } from "./experience";
import type { CurrentUser } from "@/lib/auth";
import type {
  FinalBoxActionResult,
  PasswordActionResult,
  QuizActionResult,
} from "@/types/experience";

/**
 * Verifiche server-side delle attività della Fase 5.
 *
 * Regole comuni:
 *  - l'utente arriva dalla sessione, mai dal client;
 *  - hash e risposte corrette vengono letti SOLO con il service role;
 *  - il payload restituito non contiene mai hash né risposte prima della
 *    verifica;
 *  - tentativi e completamenti sono scritti solo qui, dopo i controlli;
 *  - in simulazione admin la verifica è possibile ma non viene scritto nulla.
 */

function failure(error: string, extra?: Partial<PasswordActionResult>): PasswordActionResult {
  return {
    ok: false,
    error,
    message: null,
    remainingAttempts: null,
    completed: false,
    simulation: false,
    ...extra,
  };
}

export async function verifyContentPassword(
  user: CurrentUser,
  contentId: string,
  candidate: string
): Promise<PasswordActionResult> {
  try {
    const password = candidate.trim();
    if (password.length === 0 || password.length > 200) {
      return failure("Inserisci una password valida.");
    }

    const simulation = await getSimulationRow(user);
    const context = createDateContext(simulation);
    const admin = await createAdminClient();

    const [contentResult, configResult] = await Promise.all([
      admin
        .from("physical_contents")
        .select(
          "id, day_number, title, password_required, is_active, success_message, activation_conditions"
        )
        .eq("id", contentId)
        .maybeSingle(),
      admin
        .from("physical_passwords")
        .select("password_hash, hint, success_message, max_attempts, is_active")
        .eq("content_id", contentId)
        .maybeSingle(),
    ]);

    const content = contentResult.data;
    const config = configResult.data;

    if (!content || !content.is_active || !content.password_required) {
      return failure("Questa scatola non richiede una password.");
    }
    if (!config || !config.is_active || !config.password_hash) {
      return failure("Questa password non è ancora configurata.");
    }

    const { data: day } = await admin
      .from("advent_days")
      .select("day_number, unlock_date")
      .eq("day_number", content.day_number)
      .maybeSingle();

    if (!day || !isDayUnlocked(String(day.unlock_date), context)) {
      return failure("Questa sorpresa non è ancora disponibile.");
    }

    const [{ data: completion }, { count }] = await Promise.all([
      admin
        .from("password_completions")
        .select("content_id")
        .eq("user_id", user.id)
        .eq("content_id", contentId)
        .maybeSingle(),
      admin
        .from("password_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("content_id", contentId),
    ]);

    const attemptsUsed = count ?? 0;
    const maxAttempts =
      typeof config.max_attempts === "number" ? config.max_attempts : null;
    const message =
      String(config.success_message || content.success_message || "").trim() ||
      "Sorpresa sbloccata!";

    if (completion) {
      return {
        ok: true,
        error: null,
        message,
        remainingAttempts:
          maxAttempts === null ? null : Math.max(0, maxAttempts - attemptsUsed),
        completed: true,
        simulation: context.isSimulation,
      };
    }

    // Condizioni di sblocco: verificate qui, non solo nella UI.
    const [openings, correctQuizzes, allCompletions] = await Promise.all([
      admin.from("user_openings").select("day_number").eq("user_id", user.id),
      admin
        .from("user_quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user.id)
        .eq("is_correct", true),
      admin
        .from("password_completions")
        .select("content_id")
        .eq("user_id", user.id),
    ]);

    const openedDays = new Set<number>(
      (openings.data ?? []).map((row) => Number(row.day_number))
    );
    const contentDay = Number(content.day_number);

    if (!context.isSimulation && !openedDays.has(contentDay)) {
      return failure("Apri prima la casella del giorno.", {
        simulation: context.isSimulation,
      });
    }

    const condition = evaluateConditions(content.activation_conditions, {
      now: context.now,
      openedDays: context.isSimulation
        ? new Set(Array.from({ length: contentDay }, (_, index) => index + 1))
        : openedDays,
      completedQuizIds: new Set(
        (correctQuizzes.data ?? []).map((row) => String(row.quiz_id))
      ),
      completedContentIds: new Set(
        (allCompletions.data ?? []).map((row) => String(row.content_id))
      ),
    });

    if (!condition.met) {
      return failure(
        condition.reason ?? "Questo contenuto si sbloccherà più avanti.",
        { simulation: context.isSimulation }
      );
    }

    if (maxAttempts !== null && attemptsUsed >= maxAttempts) {
      return failure("Hai esaurito i tentativi disponibili per questa scatola.", {
        remainingAttempts: 0,
        simulation: context.isSimulation,
      });
    }

    const success = verifyPassword(password, String(config.password_hash));
    const remainingAfterAttempt =
      maxAttempts === null ? null : Math.max(0, maxAttempts - attemptsUsed - 1);

    if (context.isSimulation) {
      return success
        ? {
            ok: true,
            error: null,
            message,
            remainingAttempts: remainingAfterAttempt,
            completed: true,
            simulation: true,
          }
        : failure("Password non corretta. Riprova.", {
            remainingAttempts: remainingAfterAttempt,
            simulation: true,
          });
    }

    const { error: attemptError } = await admin.from("password_attempts").insert({
      user_id: user.id,
      content_id: contentId,
      success,
    });

    if (attemptError) {
      return failure("Non è stato possibile registrare il tentativo.");
    }

    if (!success) {
      const error =
        remainingAfterAttempt === null
          ? "Password non corretta. Riprova."
          : remainingAfterAttempt > 0
            ? `Password non corretta. Ti restano ${remainingAfterAttempt} tentativi.`
            : "Password non corretta. Hai esaurito i tentativi disponibili.";

      return failure(error, { remainingAttempts: remainingAfterAttempt });
    }

    const { error: completionError } = await admin
      .from("password_completions")
      .upsert(
        { user_id: user.id, content_id: contentId },
        { onConflict: "user_id,content_id" }
      );

    if (completionError) {
      return failure("Password corretta, ma non è stato possibile salvare lo sblocco.");
    }

    return {
      ok: true,
      error: null,
      message,
      remainingAttempts: remainingAfterAttempt,
      completed: true,
      simulation: false,
    };
  } catch {
    return failure("Errore durante la verifica della password.");
  }
}

export async function verifyQuizAnswer(
  user: CurrentUser,
  quizId: string,
  answerId: string
): Promise<QuizActionResult> {
  const failureResult = (error: string, simulation = false): QuizActionResult => ({
    ok: false,
    error,
    correct: null,
    message: null,
    correctAnswerText: null,
    points: 0,
    completed: false,
    simulation,
  });

  try {
    const simulation = await getSimulationRow(user);
    const context = createDateContext(simulation);
    const admin = await createAdminClient();

    const { data: quiz } = await admin
      .from("quizzes")
      .select("id, day_number, question, hint, points, is_required, is_active, unlock_conditions")
      .eq("id", quizId)
      .maybeSingle();

    if (!quiz || !quiz.is_active) {
      return failureResult("Questo quiz non è disponibile.");
    }

    const { data: day } = await admin
      .from("advent_days")
      .select("day_number, unlock_date")
      .eq("day_number", quiz.day_number)
      .maybeSingle();

    if (!day || !isDayUnlocked(String(day.unlock_date), context)) {
      return failureResult("Questo quiz non è ancora disponibile.");
    }

    if (!context.isSimulation) {
      const supabase = await createClient();
      const { data: opening } = await supabase
        .from("user_openings")
        .select("day_number")
        .eq("user_id", user.id)
        .eq("day_number", quiz.day_number)
        .maybeSingle();

      if (!opening) {
        return failureResult("Apri prima la casella del giorno.");
      }
    }

    const [openings, correctAttempts, completions, answers] = await Promise.all([
      admin.from("user_openings").select("day_number").eq("user_id", user.id),
      admin
        .from("user_quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user.id)
        .eq("is_correct", true),
      admin
        .from("password_completions")
        .select("content_id")
        .eq("user_id", user.id),
      admin
        .from("quiz_answers")
        .select("id, quiz_id, answer_text, is_correct, hint, sort_order, is_active")
        .eq("quiz_id", quizId),
    ]);

    const completedQuizIds = new Set(
      (correctAttempts.data ?? []).map((row) => String(row.quiz_id))
    );
    const alreadyCompleted = completedQuizIds.has(quizId);
    const openedDays = new Set<number>(
      (openings.data ?? []).map((row) => Number(row.day_number))
    );
    const quizDay = Number(quiz.day_number);

    const conditionState = {
      now: context.now,
      openedDays: context.isSimulation
        ? new Set(
            Array.from({ length: quizDay }, (_, index) => index + 1)
          )
        : openedDays,
      completedQuizIds,
      completedContentIds: new Set(
        (completions.data ?? []).map((row) => String(row.content_id))
      ),
    };

    if (!evaluateConditions(quiz.unlock_conditions, conditionState).met) {
      return failureResult("Questo quiz si sbloccherà più avanti.", context.isSimulation);
    }

    const quizAnswers = (answers.data ?? []) as QuizAnswerRow[];
    const answer = findActiveAnswer(quizAnswers, quizId, answerId);

    if (!answer) {
      return failureResult("Risposta non valida.", context.isSimulation);
    }

    const correctAnswerText = findCorrectAnswerText(quizAnswers);
    const points = Math.max(0, Number(quiz.points ?? 0));

    if (alreadyCompleted) {
      return {
        ok: true,
        error: null,
        correct: true,
        message: "Quiz già completato. Nessun punto duplicato.",
        correctAnswerText,
        points,
        completed: true,
        simulation: context.isSimulation,
      };
    }

    if (context.isSimulation) {
      return answer.is_correct
        ? {
            ok: true,
            error: null,
            correct: true,
            message: `Risposta corretta! +${points} punti (anteprima, nessun salvataggio).`,
            correctAnswerText,
            points,
            completed: true,
            simulation: true,
          }
        : {
            ok: true,
            error: null,
            correct: false,
            message: "Non è la risposta giusta. Riprova (anteprima, nessun salvataggio).",
            correctAnswerText: null,
            points,
            completed: false,
            simulation: true,
          };
    }

    const { error } = await admin.from("user_quiz_attempts").insert({
      user_id: user.id,
      quiz_id: quizId,
      selected_answer_id: answer.id,
      is_correct: answer.is_correct,
    });

    // L'indice univoco parziale impedisce un secondo successo: se la richiesta
    // arriva due volte, il secondo inserimento viene trattato come già risolto.
    if (error && error.code !== "23505") {
      return failureResult("Non è stato possibile registrare la risposta.");
    }

    if (!answer.is_correct) {
      return {
        ok: true,
        error: null,
        correct: false,
        message: error?.code === "23505" ? "Quiz già completato." : "Non è la risposta giusta. Riprova.",
        correctAnswerText: null,
        points,
        completed: false,
        simulation: false,
      };
    }

    return {
      ok: true,
      error: null,
      correct: true,
      message: `Risposta corretta! +${points} punti.`,
      correctAnswerText,
      points,
      completed: true,
      simulation: false,
    };
  } catch {
    return failureResult("Errore durante la verifica della risposta.");
  }
}

export async function verifyFinalBoxPassword(
  user: CurrentUser,
  boxId: string,
  candidate: string
): Promise<FinalBoxActionResult> {
  const fail = (error: string, simulation = false): FinalBoxActionResult => ({
    ok: false,
    error,
    message: null,
    completed: false,
    simulation,
  });

  try {
    const password = candidate.trim();
    if (!password || password.length > 200) {
      return fail("Inserisci una password valida.");
    }

    const simulation = await getSimulationRow(user);
    const context = createDateContext(simulation);
    const admin = await createAdminClient();

    const { data: box } = await admin
      .from("final_gift_boxes")
      .select("id, password_hash, password_enabled, password_hint, final_message, reveal_day, is_active")
      .eq("id", boxId)
      .maybeSingle();

    if (!box || !box.is_active || !box.password_enabled || !box.password_hash) {
      return fail("La scatola finale non richiede una password.");
    }

    const { data: day } = await admin
      .from("advent_days")
      .select("day_number, unlock_date")
      .eq("day_number", box.reveal_day)
      .maybeSingle();

    if (!day || !isDayUnlocked(String(day.unlock_date), context)) {
      return fail("La scatola finale non è ancora disponibile.");
    }

    const { data: completion } = await admin
      .from("final_box_completions")
      .select("box_id")
      .eq("user_id", user.id)
      .eq("box_id", boxId)
      .maybeSingle();

    if (completion) {
      return {
        ok: true,
        error: null,
        message: String(box.final_message || "Sorpresa sbloccata!"),
        completed: true,
        simulation: context.isSimulation,
      };
    }

    const success = verifyPassword(password, String(box.password_hash));

    if (!success) {
      return fail("Password non corretta. Riprova.", context.isSimulation);
    }

    if (context.isSimulation) {
      return {
        ok: true,
        error: null,
        message: String(
          box.final_message || "Password corretta (anteprima, nessun salvataggio)."
        ),
        completed: true,
        simulation: true,
      };
    }

    const { error } = await admin.from("final_box_completions").upsert(
      { user_id: user.id, box_id: boxId },
      { onConflict: "user_id,box_id" }
    );

    if (error) {
      return fail("Non è stato possibile salvare lo sblocco.");
    }

    return {
      ok: true,
      error: null,
      message: String(box.final_message || "Sorpresa sbloccata!"),
      completed: true,
      simulation: false,
    };
  } catch {
    return fail("Errore durante la verifica della password.");
  }
}
