"use client";

import { useId, useState, useTransition } from "react";
import { submitContentPasswordAction } from "@/lib/experience-actions";
import type { DayContent, PasswordActionResult } from "@/types/experience";

interface ContentPasswordFormProps {
  content: DayContent;
  onCompleted?: (message: string) => void;
}

/**
 * Form della password fisica di un contenuto.
 *
 * L'hash non è mai presente nel payload: il client invia solo il testo
 * digitato e riceve un esito. Il limite di tentativi e il messaggio di
 * successo arrivano dalla configurazione admin.
 */
export function ContentPasswordForm({
  content,
  onCompleted,
}: ContentPasswordFormProps) {
  const challenge = content.password;
  const inputId = useId();
  const hintId = useId();
  const statusId = useId();

  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PasswordActionResult | null>(null);
  const [completed, setCompleted] = useState(content.completed);
  const [remaining, setRemaining] = useState(challenge?.remainingAttempts ?? null);

  if (!challenge) return null;

  const exhausted = remaining === 0 && !completed;
  const disabled = pending || completed || exhausted || !challenge.canAttempt;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || value.trim().length === 0) return;

    startTransition(async () => {
      const response = await submitContentPasswordAction(content.id, value.trim());
      setResult(response);
      if (typeof response.remainingAttempts === "number") {
        setRemaining(response.remainingAttempts);
      }
      if (response.ok) {
        setCompleted(true);
        setValue("");
        onCompleted?.(
          response.message ??
            content.successMessage ??
            "Sorpresa sbloccata!"
        );
      }
    });
  };

  if (completed) {
    return (
      <div
        role="status"
        className="rounded-xl border border-gold/45 bg-gold/10 p-4"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-gold-light">
          <CheckIcon />
          Password corretta
        </p>
        <p className="mt-1 text-sm leading-relaxed text-cream-100/90">
          {content.successMessage ??
            result?.message ??
            "Sorpresa sbloccata!"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-describedby={statusId}>
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-gold-light"
        >
          Password della scatola fisica
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={inputId}
            name="password"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-describedby={challenge.hint ? hintId : undefined}
            disabled={pending || exhausted}
            placeholder="Scrivi la password trovata"
            className="min-w-0 flex-1 rounded-lg border border-cream-300/25 bg-pine-950/70 px-3 py-2.5 text-sm text-cream-50 placeholder:text-cream-300/40 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={disabled || value.trim().length === 0}
            className="rounded-lg bg-christmas-red px-4 py-2.5 text-sm font-semibold text-cream-50 shadow-[var(--shadow-glow-red)] transition-colors hover:bg-christmas-red-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Verifico…" : "Sblocca"}
          </button>
        </div>
      </div>

      {challenge.hint && (
        <details className="rounded-lg border border-ice-300/20 bg-ice-900/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-ice-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            Serve un indizio?
          </summary>
          <p id={hintId} className="mt-2 text-sm leading-relaxed text-cream-200/85">
            {challenge.hint}
          </p>
        </details>
      )}

      {challenge.maxAttempts !== null && (
        <p className="text-xs text-cream-300/70">
          Tentativi usati: {challenge.attemptsUsed} su {challenge.maxAttempts}
          {typeof remaining === "number" && ` · rimasti ${remaining}`}
        </p>
      )}

      <div id={statusId} aria-live="polite">
        {exhausted && (
          <p role="alert" className="text-sm text-christmas-red-light">
            Hai esaurito i tentativi disponibili per questa scatola.
          </p>
        )}
        {!exhausted && result && !result.ok && (
          <p role="alert" className="text-sm text-christmas-red-light">
            {result.error ?? "Password non corretta. Riprova."}
          </p>
        )}
        {result?.ok && result.message && (
          <p className="text-sm text-gold-light">{result.message}</p>
        )}
      </div>
    </form>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
