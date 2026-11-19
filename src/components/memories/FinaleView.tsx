import type { FinaleData } from "@/types/memories";
import { EmptyState, PhaseNotice, StatChip } from "./ui";

export function FinaleView({ data }: { data: FinaleData }) {
  if (!data.available) {
    return (
      <div>
        {!data.phase6Ready && <PhaseNotice />}
        <div className="rounded-2xl border border-ice-300/30 bg-ice-900/30 p-8 text-center">
          <div className="text-4xl" aria-hidden="true">🌟</div>
          <h3 className="mt-3 font-display text-xl font-semibold text-cream-50">
            Il viaggio non è ancora finito
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-cream-200/75">
            {data.gateMessage}
          </p>
          <p className="mt-4 text-xs text-cream-300/50">
            Nessun contenuto della rivelazione viene mostrato prima del 24 dicembre.
          </p>
        </div>
      </div>
    );
  }

  const journey = data.journey;

  return (
    <div>
      {!data.phase6Ready && <PhaseNotice />}

      <div className="memory-book mb-8 rounded-2xl border border-gold/40 p-6 text-center">
        <div className="text-5xl" aria-hidden="true">🎄</div>
        <h3 className="mt-3 font-display text-2xl font-bold text-gold-light">
          Il tuo viaggio verso la Stella
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-cream-100/85">
          {data.finalBox?.introMessage ??
            "Hai attraversato ventiquattro giornate, raccolto indizi e ridato luce al Natale."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatChip label="Giorni" value={journey.daysCompleted} />
          <StatChip label="Ricordi" value={journey.memories} />
          <StatChip label="Oggetti" value={journey.objects} />
          <StatChip label="Simboli" value={journey.symbols} />
          <StatChip label="Sfere" value={journey.spheres} />
          <StatChip label="Indizi" value={journey.clues} />
          <StatChip label="Quiz" value={journey.quizzes} />
          <StatChip label="Scatola" value={data.completed ? "Aperta" : "Da aprire"} />
        </div>
      </div>

      {data.finalBox && (
        <section className="mb-8 rounded-2xl border border-gold/30 bg-pine-950/55 p-6">
          <h3 className="font-display text-lg font-semibold text-gold-light">
            {data.finalBox.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-cream-100/85">
            {data.finalBox.description}
          </p>
          {data.finalBox.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.finalBox.imageUrl} alt={data.finalBox.name} className="mx-auto mt-4 max-h-64 rounded-2xl object-cover" />
          )}
          {data.completed ? (
            <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/10 p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-50">
                {data.finalBox.finalMessage}
              </p>
              {data.finalBox.clues.length > 0 && (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-cream-200/75">
                  {data.finalBox.clues.map((clue, index) => (
                    <li key={index}>{clue}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-cream-300/70">
              La rivelazione resta sigillata finché la scatola finale non verrà aperta.
            </p>
          )}
        </section>
      )}

      {data.physicalGift && (
        <section className="mb-8 rounded-2xl border border-christmas-red/35 bg-christmas-red/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-christmas-red-light">
            Il regalo fisico
          </p>
          <h3 className="mt-2 font-display text-xl font-bold text-cream-50">
            {data.physicalGift.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-cream-100/85">
            {data.physicalGift.description}
          </p>
          {data.physicalGift.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.physicalGift.imageUrl} alt={data.physicalGift.name} className="mx-auto mt-4 max-h-64 rounded-2xl object-cover" />
          )}
        </section>
      )}

      <section className="mb-8">
        <h3 className="mb-3 font-display text-lg font-semibold text-cream-50">
          I momenti più importanti
        </h3>
        {data.importantMemories.length === 0 ? (
          <EmptyState icon="✨" title="Nessun momento configurato" description="L'amministratore può aggiungere i ricordi speciali del 24 dicembre." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.importantMemories.map((memory) => (
              <article key={memory.id} className="memory-card rounded-2xl p-4">
                <h4 className="font-display text-sm font-semibold text-cream-50">{memory.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-cream-200/75">{memory.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-3 font-display text-lg font-semibold text-cream-50">
            Oggetti raccolti ({data.objects.length})
          </h3>
          {data.objects.length === 0 ? (
            <EmptyState icon="🎁" title="Nessun oggetto" description="Gli oggetti scoperti appariranno qui." />
          ) : (
            <ul className="space-y-2">
              {data.objects.slice(0, 12).map((object) => (
                <li key={object.id} className="memory-card rounded-xl px-3 py-2 text-sm text-cream-100">
                  {object.name}
                  {object.dayNumber !== null ? ` · giorno ${object.dayNumber}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-3 font-display text-lg font-semibold text-cream-50">
            Indizi raccolti ({data.clues.length})
          </h3>
          {data.clues.length === 0 ? (
            <EmptyState icon="🔍" title="Nessun indizio" description="Gli indizi scoperti appariranno qui." />
          ) : (
            <ul className="space-y-2">
              {data.clues.slice(0, 12).map((clue) => (
                <li key={clue.id} className="memory-card rounded-xl px-3 py-2 text-sm text-cream-100">
                  {clue.title}
                  {clue.dayNumber !== null ? ` · giorno ${clue.dayNumber}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
