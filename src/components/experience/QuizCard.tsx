"use client";

import { useId, useState, useTransition } from "react";
import { submitQuizAnswerAction } from "@/lib/experience-actions";
import { cn } from "@/lib/utils";
import type { DayQuiz, QuizActionResult } from "@/types/experience";

interface QuizCardProps {
  quiz: DayQuiz;
  onCompleted?: (message: string) => void;
}

/**
 * Quiz a scelta singola.
 *
 * Il client riceve solo id e testo delle risposte attive: `is_correct` non
 * esiste nel payload. Il testo della risposta corretta compare soltanto dopo
 * una verifica server-side positiva e un quiz completato non assegna punti
 * una seconda volta.
 */
export function QuizCard({ quiz, onCompleted }: QuizCardProps) {
  const groupName = useId();
  const hintId = useId();
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<QuizActionResult | null>(null);
  const [completed, setCompleted] = useState(quiz.completed);

  const hasAnswers = quiz.answers.length > 0;
  const correctText = quiz.correctAnswerText ?? result?.correctAnswerText ?? null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || completed || !selected) return;

    startTransition(async () => {
      const response = await submitQuizAnswerAction(quiz.id, selected);
      setResult(response);

      if (response.ok && response.completed) {
        setCompleted(true);
        onCompleted?.(response.message ?? "Quiz completato!");
      }
    });
  };

  return (
    <div className="rounded-xl border border-cream-300/20 bg-pine-950/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-cream-50">
          {quiz.question}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            quiz.isRequired
              ? "border-christmas-red-light/50 bg-christmas-red/20 text-cream-100"
              : "border-ice-300/30 bg-ice-900/30 text-ice-300"
          )}
        >
          {quiz.isRequired ? "Obbligatorio" : "Facoltativo"}
        </span>
      </div>

      <p className="mt-1 text-xs text-cream-300/70">
        {quiz.points > 0
          ? `${quiz.points} ${quiz.points === 1 ? "punto" : "punti"}`
          : "Nessun punto"}
      </p>

      {quiz.hint && !completed && (
        <details className="mt-3 rounded-lg border border-ice-300/20 bg-ice-900/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-ice-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            Suggerimento
          </summary>
          <p id={hintId} className="mt-2 text-sm leading-relaxed text-cream-200/85">
            {quiz.hint}
          </p>
        </details>
      )}

      {completed ? (
        <div role="status" className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
          <p className="text-sm font-semibold text-gold-light">
            Quiz completato
          </p>
          {correctText && (
            <p className="mt-1 text-sm text-cream-100/90">
              Risposta corretta: <strong>{correctText}</strong>
            </p>
          )}
          {result?.ok && result.correct && result.message && (
            <p className="mt-1 text-xs text-cream-200/80">{result.message}</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {!hasAnswers ? (
            <p className="text-sm text-cream-300/70">
              Questo quiz non ha ancora risposte configurate.
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">{quiz.question}</legend>
              {quiz.answers.map((answer) => (
                <label
                  key={answer.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    selected === answer.id
                      ? "border-gold/70 bg-gold/10 text-cream-50"
                      : "border-cream-300/15 bg-pine-900/40 text-cream-100/85 hover:border-gold/40"
                  )}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={answer.id}
                    checked={selected === answer.id}
                    onChange={() => setSelected(answer.id)}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  />
                  <span>{answer.answerText}</span>
                </label>
              ))}
            </fieldset>
          )}

          <button
            type="submit"
            disabled={pending || !selected || !hasAnswers}
            className="rounded-lg border border-gold/60 bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Verifico…" : "Verifica risposta"}
          </button>

          {result && (
            <div aria-live="polite">
              {result.ok && result.correct ? (
                <p className="text-sm font-medium text-gold-light">
                  {result.message ??
                    `Risposta corretta! +${result.points} punti.`}
                </p>
              ) : result.ok ? (
                <p role="alert" className="text-sm text-christmas-red-light">
                  {result.message ?? "Non è la risposta giusta. Riprova."}
                </p>
              ) : (
                <p role="alert" className="text-sm text-christmas-red-light">
                  {result.error ?? "Non è stato possibile verificare la risposta."}
                </p>
              )}
            </div>
          )}

          {result?.ok && result.correct && !result.simulation && (
            <p className="text-xs text-cream-300/60">
              I punti vengono assegnati una sola volta.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
