import type { DayQuiz, DayQuizAnswer } from "@/types/experience";

export interface QuizRow {
  id: string;
  day_number: number;
  question: string;
  hint: string;
  points: number;
  is_required: boolean;
  is_active: boolean;
}

export interface QuizAnswerRow {
  id: string;
  quiz_id: string;
  answer_text: string;
  is_correct: boolean;
  hint: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * Converte una riga del database nel payload pubblico del quiz.
 *
 * `is_correct` non viene MAI copiato: il client riceve solo id e testo delle
 * risposte attive. Il testo corretto è aggiunto esclusivamente quando il quiz
 * risulta già completato (dopo la verifica server-side).
 */
export function toPublicQuiz(
  quiz: QuizRow,
  answers: readonly QuizAnswerRow[],
  completed: boolean,
  correctAnswerText: string | null = null
): DayQuiz {
  const publicAnswers: DayQuizAnswer[] = answers
    .filter((answer) => answer.is_active && answer.quiz_id === quiz.id)
    .sort((a, b) => a.sort_order - b.sort_order || a.answer_text.localeCompare(b.answer_text))
    .map((answer) => ({ id: answer.id, answerText: answer.answer_text }));

  return {
    id: quiz.id,
    question: quiz.question,
    hint: quiz.hint,
    points: Math.max(0, quiz.points),
    isRequired: quiz.is_required,
    completed,
    answers: publicAnswers,
    correctAnswerText: completed ? correctAnswerText : null,
  };
}

export function findActiveAnswer(
  answers: readonly QuizAnswerRow[],
  quizId: string,
  answerId: string
): QuizAnswerRow | null {
  return (
    answers.find(
      (answer) =>
        answer.id === answerId &&
        answer.quiz_id === quizId &&
        answer.is_active
    ) ?? null
  );
}

export function findCorrectAnswerText(
  answers: readonly QuizAnswerRow[]
): string | null {
  return answers.find((answer) => answer.is_correct && answer.is_active)?.answer_text ?? null;
}
