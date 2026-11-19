import { describe, expect, it } from "vitest";
import {
  findActiveAnswer,
  findCorrectAnswerText,
  toPublicQuiz,
  type QuizAnswerRow,
  type QuizRow,
} from "./quiz";

const quiz: QuizRow = {
  id: "quiz-1",
  day_number: 5,
  question: "Quale oggetto brilla?",
  hint: "Guarda in alto",
  points: 3,
  is_required: true,
  is_active: true,
};

const answers: QuizAnswerRow[] = [
  { id: "a2", quiz_id: "quiz-1", answer_text: "La stella", is_correct: true, hint: "", sort_order: 2, is_active: true },
  { id: "a1", quiz_id: "quiz-1", answer_text: "La lanterna", is_correct: false, hint: "", sort_order: 1, is_active: true },
  { id: "a3", quiz_id: "quiz-1", answer_text: "Risposta disattivata", is_correct: false, hint: "", sort_order: 3, is_active: false },
];

describe("payload pubblico del quiz", () => {
  it("non espone is_correct né la risposta corretta prima della verifica", () => {
    const payload = toPublicQuiz(quiz, answers, false);

    expect(payload.correctAnswerText).toBeNull();
    expect(payload.answers.map((answer) => answer.answerText)).toEqual([
      "La lanterna",
      "La stella",
    ]);
    expect(JSON.stringify(payload)).not.toContain("is_correct");
    expect(JSON.stringify(payload)).not.toContain("isCorrect");
    expect(payload.answers).toHaveLength(2); // esclude le risposte disattivate
  });

  it("espone il testo corretto solo dopo il completamento", () => {
    const payload = toPublicQuiz(quiz, answers, true, "La stella");

    expect(payload.correctAnswerText).toBe("La stella");
    expect(JSON.stringify(payload)).not.toContain("is_correct");
  });

  it("trova solo risposte attive appartenenti al quiz", () => {
    expect(findActiveAnswer(answers, "quiz-1", "a1")?.answer_text).toBe("La lanterna");
    expect(findActiveAnswer(answers, "quiz-1", "a3")).toBeNull();
    expect(findActiveAnswer(answers, "quiz-2", "a1")).toBeNull();
    expect(findCorrectAnswerText(answers)).toBe("La stella");
  });
});
