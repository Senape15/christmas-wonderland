"use client";

import { useId, useState, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { submitFinalBoxPasswordAction } from "@/lib/experience-actions";
import type { FinalBoxActionResult, FinalBoxView } from "@/types/experience";

interface FinalBoxProps {
  box: FinalBoxView;
  onCompleted?: (message: string) => void;
}

/**
 * Scatola finale (giorno 24).
 *
 * Il contenuto di rivelazione (`finalMessage`) arriva dal server solo dopo il
 * completamento del gate password: prima di allora il payload contiene una
 * stringa vuota. Il testo è interamente configurato dall'admin.
 */
export function FinalBox({ box, onCompleted }: FinalBoxProps) {
  const reducedMotion = useReducedMotion();
  const inputId = useId();
  const statusId = useId();
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(box.completed);
  const [revealedMessage, setRevealedMessage] = useState(box.finalMessage);
  const [result, setResult] = useState<FinalBoxActionResult | null>(null);

  const needsPassword = box.passwordEnabled && !completed;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || password.trim().length === 0) return;

    startTransition(async () => {
      const response = await submitFinalBoxPasswordAction(box.id, password.trim());
      setResult(response);
      if (response.ok) {
        setCompleted(true);
        setPassword("");
        setRevealedMessage(
          response.message || box.finalMessage || "La scatola finale è aperta!"
        );
        onCompleted?.(response.message ?? "La scatola finale è aperta!");
      }
    });
  };

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="relative overflow-hidden rounded-2xl border border-gold/50 bg-gradient-to-br from-pine-800/80 via-pine-900/80 to-pine-950/90 p-5 shadow-[var(--shadow-glow)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(212,168,67,0.35), transparent 65%)",
        }}
      />

      <div className="relative space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
          La scatola finale · Giorno 24
        </p>
        <h3
          id={`${inputId}-title`}
          className="font-display text-xl font-bold text-cream-50"
        >
          {box.name}
        </h3>
        {box.description && (
          <p className="text-sm leading-relaxed text-cream-100/90">
            {box.description}
          </p>
        )}
        {box.introMessage && (
          <p className="rounded-xl border border-gold/25 bg-pine-950/50 p-3 text-sm italic leading-relaxed text-cream-100/85">
            {box.introMessage}
          </p>
        )}

        {box.clues.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-light/80">
              Indizi raccolti
            </p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-cream-200/85">
              {box.clues.map((clue) => (
                <li key={clue}>{clue}</li>
              ))}
            </ul>
          </div>
        )}

        {box.objects.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-light/80">
              Oggetti nella scatola
            </p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-cream-200/85">
              {box.objects.map((object) => (
                <li key={object}>{object}</li>
              ))}
            </ul>
          </div>
        )}

        {box.openingSequence.length > 0 && needsPassword && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-light/80">
              Come aprirla
            </p>
            <ol className="mt-1 list-inside list-decimal space-y-1 text-sm text-cream-200/85">
              {box.openingSequence.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {needsPassword ? (
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor={inputId}
                className="block text-xs font-semibold uppercase tracking-wider text-gold-light"
              >
                Password della scatola finale
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id={inputId}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={pending}
                  placeholder="Scrivi la password finale"
                  className="min-w-0 flex-1 rounded-lg border border-cream-300/25 bg-pine-950/70 px-3 py-2.5 text-sm text-cream-50 placeholder:text-cream-300/40 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={pending || password.trim().length === 0}
                  className="rounded-lg bg-christmas-red px-4 py-2.5 text-sm font-semibold text-cream-50 shadow-[var(--shadow-glow-red)] transition-colors hover:bg-christmas-red-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Verifico…" : "Apri la scatola"}
                </button>
              </div>
            </div>

            {box.passwordHint && (
              <details className="rounded-lg border border-ice-300/20 bg-ice-900/20 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-ice-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                  Un ultimo indizio?
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-cream-200/85">
                  {box.passwordHint}
                </p>
              </details>
            )}

            <div id={statusId} aria-live="polite">
              {result && !result.ok && (
                <p role="alert" className="text-sm text-christmas-red-light">
                  {result.error ?? "Password non corretta. Riprova."}
                </p>
              )}
              {result?.simulation && (
                <p className="text-sm text-gold-light">{result.message}</p>
              )}
            </div>
          </form>
        ) : (
          <div role="status" className="space-y-2">
            {completed && revealedMessage ? (
              <motion.div
                initial={
                  reducedMotion ? false : { opacity: 0, scale: 0.98, y: 10 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.7, ease: "easeOut" }}
                className="rounded-xl border border-gold/40 bg-gold/10 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-light">
                  La rivelazione
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-cream-50">
                  {revealedMessage}
                </p>
              </motion.div>
            ) : (
              <p className="text-sm text-cream-200/85">
                La scatola finale è pronta per essere aperta.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
