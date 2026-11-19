"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Nico } from "@/components/nico/Nico";
import { ContentPasswordForm } from "./ContentPasswordForm";
import { QuizCard } from "./QuizCard";
import { FinalBox } from "./FinalBox";
import { isNicoExpression, type NicoExpression } from "@/types/nico";
import type { ContentKind, DayExperience } from "@/types/experience";

interface DayExperienceProps {
  experience: DayExperience;
  onClose: () => void;
  onRefresh: () => void;
}

const KIND_LABEL: Record<ContentKind, string> = {
  letter: "Lettera",
  note: "Messaggio",
  object: "Oggetto",
  photo: "Fotografia",
  clue: "Indizio",
  puzzle: "Enigma",
  password: "Password",
};

/**
 * Esperienza di apertura di un giorno.
 *
 * Dialog modale accessibile:
 *  - chiusura con Esc e con il pulsante dedicato;
 *  - focus iniziale sul pulsante di chiusura, focus trap con Tab;
 *  - body scroll bloccato mentre è aperto;
 *  - animazione di apertura saltata con `prefers-reduced-motion` e per le
 *    caselle già visitate.
 *
 * Tutti i testi narrativi arrivano dal database: il componente non contiene
 * contenuti della storia né anticipazioni sul colpevole.
 */
export function DayExperience({
  experience,
  onClose,
  onRefresh,
}: DayExperienceProps) {
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  // Le caselle già visitate e chi preferisce movimento ridotto entrano subito.
  const [revealed, setRevealed] = useState(
    experience.isReplay || Boolean(reducedMotion)
  );

  useEffect(() => {
    if (revealed) return;
    const timer = window.setTimeout(() => setRevealed(true), 1200);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  // Quando l'animazione termina, il pulsante della fase di apertura scompare:
  // spostiamo il focus sul primo controllo del contenuto per non perderlo.
  useEffect(() => {
    if (!revealed) return;
    panelRef.current
      ?.querySelector<HTMLElement>("[data-autofocus]")
      ?.focus();
  }, [revealed]);

  useEffect(() => {
    const panel = panelRef.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((element) => element.offsetParent !== null)
        : [];

    panel
      ?.querySelector<HTMLElement>("[data-autofocus]")
      ?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  const hotspotExpression = experience.hotspot?.nicoExpression;
  const expression: NicoExpression = isNicoExpression(hotspotExpression)
    ? hotspotExpression
    : "curious";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-pine-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reducedMotion ? false : { opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-gold/35 bg-pine-900 shadow-[var(--shadow-card)] sm:rounded-3xl"
      >
        {!revealed ? (
          <OpeningStage
            dayNumber={experience.dayNumber}
            title={experience.title}
            titleId={titleId}
            onClose={onClose}
          />
        ) : (
          <>
            <header className="flex items-start justify-between gap-4 border-b border-cream-300/15 bg-pine-950/60 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                  Giorno {experience.dayNumber}
                  {experience.isReplay && " · riaperto"}
                </p>
                <h2
                  id={titleId}
                  className="mt-1 truncate font-display text-xl font-bold text-cream-50"
                >
                  {experience.title}
                </h2>
              </div>
              <button
                type="button"
                data-autofocus
                onClick={onClose}
                aria-label="Chiudi l'esperienza del giorno"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cream-300/25 text-cream-200/80 transition-colors hover:border-gold/60 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  ×
                </span>
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {experience.simulation && (
                <p
                  role="status"
                  className="rounded-xl border border-ice-300/30 bg-ice-900/30 px-4 py-2 text-xs text-ice-300"
                >
                  Anteprima amministratore · data simulata{" "}
                  {experience.simulation.date}
                  {experience.simulation.note
                    ? ` · ${experience.simulation.note}`
                    : ""}
                  . Nessun progresso reale viene salvato.
                </p>
              )}

              {experience.description && (
                <p className="text-sm leading-relaxed text-cream-100/85">
                  {experience.description}
                </p>
              )}

              {experience.elfMessage && (
                <aside className="rounded-xl border border-gold/25 bg-pine-950/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold-light">
                    {experience.elfMessage.author}
                  </p>
                  <p className="mt-1 text-sm italic leading-relaxed text-cream-100/90">
                    “{experience.elfMessage.message}”
                  </p>
                </aside>
              )}

              {experience.secretMessage && (
                <aside className="rounded-xl border border-ice-300/25 bg-ice-900/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ice-300">
                    Messaggio segreto per te
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-cream-100/90">
                    {experience.secretMessage}
                  </p>
                </aside>
              )}

              {experience.hotspot && experience.hotspot.hint && (
                <aside className="flex items-start gap-3 rounded-xl border border-cream-300/15 bg-pine-800/40 p-4">
                  <Nico
                    expression={expression}
                    animated={false}
                    ariaLabel={`Nico, espressione ${expression}`}
                    className="h-10 w-10 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-cream-200/60">
                      {experience.hotspot.name}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-cream-100/85">
                      {experience.hotspot.nicoMessage || experience.hotspot.hint}
                    </p>
                  </div>
                </aside>
              )}

              {experience.contents.length > 0 && (
                <section aria-labelledby={`${titleId}-contenuti`} className="space-y-3">
                  <h3
                    id={`${titleId}-contenuti`}
                    className="text-sm font-semibold uppercase tracking-wider text-gold-light"
                  >
                    Dentro la casella
                  </h3>
                  {experience.contents.map((content) => (
                    <article
                      key={content.id}
                      className="space-y-3 rounded-xl border border-cream-300/20 bg-pine-800/45 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-gold/35 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-light">
                          {KIND_LABEL[content.kind]}
                        </span>
                        {content.completed && content.requiresPassword && (
                          <span className="rounded-full border border-pine-300/30 bg-pine-600/20 px-2.5 py-0.5 text-[11px] font-semibold text-pine-200">
                            Sbloccato
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-cream-50">
                        {content.title}
                      </h4>
                      {content.imageUrl && (
                        // Le immagini sono URL gestiti dall'admin (Storage Supabase).
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={content.imageUrl}
                          alt={content.title}
                          loading="lazy"
                          className="max-h-72 w-full rounded-lg border border-cream-300/10 object-cover"
                        />
                      )}
                      {content.text && (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-cream-100/85">
                          {content.text}
                        </p>
                      )}
                      {content.requiresPassword && content.password ? (
                        <ContentPasswordForm
                          content={content}
                          onCompleted={onRefresh}
                        />
                      ) : content.completed && content.successMessage ? (
                        <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold-light">
                          {content.successMessage}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </section>
              )}

              {experience.gifts.length > 0 && (
                <section aria-labelledby={`${titleId}-regali`} className="space-y-3">
                  <h3
                    id={`${titleId}-regali`}
                    className="text-sm font-semibold uppercase tracking-wider text-gold-light"
                  >
                    Regali e oggetti
                  </h3>
                  {experience.gifts.map((gift) => (
                    <article
                      key={gift.id}
                      className="rounded-xl border border-christmas-red-light/30 bg-christmas-red/10 p-4"
                    >
                      <h4 className="text-sm font-semibold text-cream-50">
                        {gift.name}
                      </h4>
                      {gift.description && (
                        <p className="mt-1 text-sm leading-relaxed text-cream-100/85">
                          {gift.description}
                        </p>
                      )}
                      {gift.symbols.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {gift.symbols.map((symbol) => (
                            <li
                              key={symbol.id}
                              className="flex items-center gap-2 rounded-full border border-gold/30 bg-pine-950/40 px-3 py-1 text-xs text-cream-100"
                              title={symbol.description}
                            >
                              {symbol.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={symbol.imageUrl}
                                  alt=""
                                  className="h-5 w-5 rounded-full object-cover"
                                />
                              ) : (
                                <span aria-hidden="true">✦</span>
                              )}
                              {symbol.symbol}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </section>
              )}

              {experience.quizzes.length > 0 && (
                <section aria-labelledby={`${titleId}-quiz`} className="space-y-3">
                  <h3
                    id={`${titleId}-quiz`}
                    className="text-sm font-semibold uppercase tracking-wider text-gold-light"
                  >
                    Quiz e indovinelli
                  </h3>
                  {experience.quizzes.map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} onCompleted={onRefresh} />
                  ))}
                </section>
              )}

              {experience.memorySpheres.length > 0 && (
                <section aria-labelledby={`${titleId}-ricordi`} className="space-y-3">
                  <h3
                    id={`${titleId}-ricordi`}
                    className="text-sm font-semibold uppercase tracking-wider text-gold-light"
                  >
                    Sfera dei ricordi
                  </h3>
                  {experience.memorySpheres.map((sphere) => (
                    <article
                      key={sphere.id}
                      className="rounded-xl border border-ice-300/25 bg-ice-900/20 p-4"
                    >
                      <h4 className="text-sm font-semibold text-cream-50">
                        {sphere.title}
                      </h4>
                      {sphere.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sphere.photoUrl}
                          alt={sphere.title}
                          loading="lazy"
                          className="mt-2 max-h-64 w-full rounded-lg object-cover"
                        />
                      )}
                      {sphere.note && (
                        <p className="mt-2 text-sm leading-relaxed text-cream-100/85">
                          {sphere.note}
                        </p>
                      )}
                    </article>
                  ))}
                </section>
              )}

              {experience.finalBox && (
                <FinalBox box={experience.finalBox} onCompleted={onRefresh} />
              )}

              {(experience.hiddenContents > 0 || experience.hiddenQuizzes > 0) && (
                <p className="rounded-xl border border-cream-300/15 bg-pine-950/40 px-4 py-3 text-xs leading-relaxed text-cream-300/70">
                  Alcune sorprese sono ancora avvolte dalla neve: si
                  sbloccheranno completando le tappe precedenti.
                </p>
              )}

              {experience.contents.length === 0 &&
                experience.quizzes.length === 0 &&
                experience.gifts.length === 0 &&
                experience.memorySpheres.length === 0 &&
                experience.hiddenContents === 0 &&
                experience.hiddenQuizzes === 0 &&
                !experience.finalBox && (
                  <p className="rounded-xl border border-cream-300/15 bg-pine-950/40 px-4 py-3 text-sm text-cream-300/75">
                    La casella è stata aperta, ma i suoi contenuti non sono
                    ancora stati configurati. Torna più tardi.
                  </p>
                )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-300/15 bg-pine-950/60 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-cream-300/30 px-4 py-2 text-sm font-medium text-cream-100 transition-colors hover:bg-cream-50/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Torna al villaggio
              </button>
              <span className="text-xs text-cream-300/50">
                {experience.simulation
                  ? "Anteprima amministratore"
                  : experience.isReplay
                    ? "Casella già aperta"
                    : "Aperta ora"}
              </span>
            </footer>
          </>
        )}
      </motion.div>
    </div>
  );
}

/** Fase di apertura animata, breve e non bloccante. */
function OpeningStage({
  dayNumber,
  title,
  titleId,
  onClose,
}: {
  dayNumber: number;
  title: string;
  titleId: string;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 p-8 text-center">
      <button
        type="button"
        data-autofocus
        onClick={onClose}
        aria-label="Salta l'animazione e chiudi"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-cream-300/25 text-cream-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ×
        </span>
      </button>

      <motion.div
        aria-hidden="true"
        initial={reducedMotion ? false : { scale: 0.85, rotate: -3, opacity: 0.6 }}
        animate={{ scale: 1.05, rotate: 0, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.9, ease: "easeOut" }}
        className="relative flex h-28 w-28 items-center justify-center rounded-2xl border border-gold/60 bg-gradient-to-br from-christmas-red to-christmas-red-dark shadow-[var(--shadow-glow-red)]"
      >
        <span className="absolute inset-3 rounded-xl border border-gold/40" />
        <span className="text-3xl text-gold-light" aria-hidden="true">
          ✦
        </span>
      </motion.div>

      <div aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-light">
          Giorno {dayNumber}
        </p>
        <p
          id={titleId}
          className="mt-1 font-display text-lg font-bold text-cream-50"
        >
          {title}
        </p>
        <p className="mt-1 text-xs text-cream-300/60">La casella si sta aprendo…</p>
      </div>
    </div>
  );
}


