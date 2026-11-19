"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { Nico } from "@/components/nico/Nico";
import { AdventCalendar } from "@/components/calendar/AdventCalendar";
import { DayExperience } from "@/components/experience/DayExperience";
import { ProgressPanel } from "@/components/dashboard/ProgressPanel";
import { HotspotCard } from "@/components/village/HotspotCard";
import { HotspotLegend } from "@/components/village/HotspotLegend";
import { VillageMap, type ZoneFocusRequest } from "@/components/village/VillageMap";
import { ZoneCard } from "@/components/village/ZoneCard";
import { Snowfall } from "@/components/animations/Snowfall";
import { FadingLights } from "@/components/animations/FadingLights";
import { LogoutButton } from "@/components/layout/logout-button";
import { openDayExperienceAction } from "@/lib/experience-actions";
import { MEMORY_NAV } from "@/lib/memory-nav";
import {
  STORY_SUBTITLE,
  STORY_TITLE,
  getNicoWelcome,
  getStoryIntro,
  getStoryPhaseLabel,
} from "@/lib/story";
import type { CurrentUser } from "@/lib/auth";
import type { DayExperience as DayExperienceData, ExperienceData } from "@/types/experience";
import type { VillageData, VillageHotspot } from "@/types/village";

interface DashboardContentProps {
  user: CurrentUser;
  experience: ExperienceData;
  village: VillageData;
  /** Già formattata sul server nel fuso Europe/Rome (evita mismatch). */
  todayLabel: string;
  /** Anno corrente nel fuso Europe/Rome, calcolato sul server. */
  todayYear: number;
  /** Deep link `/dashboard?giorno=N` dalla cronologia. */
  initialDay?: number | null;
}

export function DashboardContent({
  user,
  experience,
  village,
  todayLabel,
  todayYear,
  initialDay = null,
}: DashboardContentProps) {
  const reducedMotion = useReducedMotion();
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openExperience, setOpenExperience] = useState<DayExperienceData | null>(
    null
  );
  const [focusZone, setFocusZone] = useState<ZoneFocusRequest | null>(null);
  const zoneToken = useRef(0);

  const calendar = experience.calendar;
  const simulation = calendar.simulation;

  const hotspotsByZone = useMemo(() => {
    const map = new Map<string, VillageHotspot[]>();
    for (const hotspot of village.hotspots) {
      const list: VillageHotspot[] = map.get(hotspot.zoneSlug) ?? [];
      list.push(hotspot);
      map.set(hotspot.zoneSlug, list);
    }
    return map;
  }, [village.hotspots]);

  const selectedHotspot =
    village.hotspots.find((hotspot) => hotspot.id === selectedId) ?? null;
  const selectedZone = selectedHotspot
    ? village.zones.find((zone) => zone.slug === selectedHotspot.zoneSlug)
    : undefined;

  const activeZoneSlug = selectedHotspot?.zoneSlug ?? null;

  const handleSelectHotspot = (hotspotId: string) => {
    setSelectedId(hotspotId);
    setError(null);
  };

  const handleCloseCard = () => {
    setSelectedId(null);
    setError(null);
  };

  const handleRequestZone = (zoneSlug: string) => {
    zoneToken.current += 1;
    setFocusZone({ slug: zoneSlug, token: zoneToken.current });
  };

  /**
   * Apre (o riapre) l'esperienza di un giorno.
   * La Server Action verifica data, sblocco e proprietà dei dati; il server
   * restituisce solo i contenuti già sbloccati per quell'utente.
   */
  const handleOpenDay = async (dayNumber: number) => {
    if (pendingDay !== null) return;

    setPendingDay(dayNumber);
    setError(null);

    try {
      const result = await openDayExperienceAction(dayNumber);
      if (result.ok) {
        setOpenExperience(result.data);
        // Aggiorna calendario, stati e progressi senza chiudere l'esperienza.
        router.refresh();
      } else {
        setError(result.error ?? "Non è stato possibile aprire questo giorno.");
      }
    } finally {
      setPendingDay(null);
    }
  };

  const handleCloseExperience = () => {
    setOpenExperience(null);
    setSelectedId(null);
    setError(null);
  };

  const refreshExperience = () => {
    router.refresh();
  };

  // Deep link dalla cronologia: apre solo giorni già sbloccati e una sola
  // volta per navigazione. La verifica reale resta nella Server Action.
  const handledDayRef = useRef<number | null>(null);
  useEffect(() => {
    if (initialDay === null || handledDayRef.current === initialDay) return;
    const day = calendar.days.find((item) => item.dayNumber === initialDay);
    if (!day?.isUnlocked) return;
    handledDayRef.current = initialDay;
    // Differito: uno stato impostato sincronicamente nell'effect innesca
    // render a cascata (regola react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      void handleOpenDay(initialDay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDay]);

  const welcome = getNicoWelcome(village.phase, user.name);
  const storyIntro = getStoryIntro(village.phase);

  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-900 text-cream-50">
      {/* Neve globale */}
      <Snowfall count={60} className="fixed inset-0 z-0" />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-christmas-red shadow-[var(--shadow-glow-red)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2 L14 8 L20 8 L15 12 L17 18 L12 14 L7 18 L9 12 L4 8 L10 8 Z" fill="#d4a843" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gold-light">Christmas Wonderland</h1>
            <p className="text-xs text-cream-300/70">Il calendario dell&apos;Avvento interattivo</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-cream-100">{user.name ?? user.email}</p>
            <p className="text-xs text-cream-300/60">{todayLabel}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Libro dei ricordi – Fase 6 */}
      <nav
        aria-label="Sezioni dei ricordi"
        className="relative z-10 border-y border-gold/15 bg-pine-950/45 backdrop-blur-sm"
      >
        <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-1 px-4 py-2 sm:px-6">
          {MEMORY_NAV.filter((item) => item.href !== "/dashboard").map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-cream-200/70 transition-colors hover:bg-gold/15 hover:text-gold-light"
              >
                <span aria-hidden="true">{item.emoji}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-6 pb-12">
        {simulation && (
          <div
            role="status"
            className="rounded-2xl border border-ice-300/40 bg-ice-900/40 px-4 py-3 text-sm text-ice-300"
          >
            <strong className="font-semibold">Anteprima amministratore.</strong>{" "}
            Stai vedendo il calendario come se fosse il {simulation.date}.
            {simulation.note ? ` ${simulation.note}.` : ""} Nessuna apertura,
            risposta o progresso reale viene salvato durante la simulazione.
          </div>
        )}

        {/* Storia + Nico */}
        <section className="grid gap-6 rounded-3xl border border-cream-300/20 bg-pine-800/50 p-6 backdrop-blur-sm md:grid-cols-[minmax(0,1fr)_15rem] md:items-center md:p-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-gold-light/80">
              {getStoryPhaseLabel(village.phase)}
            </p>
            <h2 className="font-display text-2xl font-bold leading-tight text-cream-50 md:text-3xl">
              {STORY_TITLE}
            </h2>
            <p className="text-sm font-medium text-gold-light/90">{STORY_SUBTITLE}</p>
            <p className="max-w-2xl text-sm leading-relaxed text-cream-100/85">
              {storyIntro}
            </p>
            <div className="rounded-2xl border border-cream-300/15 bg-pine-900/60 p-3">
              <p className="text-sm italic leading-snug text-cream-100/90">{welcome}</p>
            </div>
            <FadingLights count={14} className="max-w-md" />
          </div>

          <div className="mx-auto w-32 shrink-0 md:w-40">
            <Nico
              expression={village.phase === "completo" ? "happy" : "curious"}
              animated={!reducedMotion}
            />
          </div>
        </section>

        {/* Progressi */}
        <ProgressPanel progress={experience.progress} />

        {/* Mappa del villaggio */}
        <section className="space-y-4" aria-labelledby="mappa-titolo">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="mappa-titolo" className="text-xl font-bold text-cream-50">
                Esplora il Villaggio
              </h2>
              <p className="mt-1 text-sm text-cream-300/70">
                Sei zone, ventiquattro luoghi illustrati. Trascina, ingrandisci e
                avvicinati ai dettagli.
              </p>
            </div>
            <HotspotLegend />
          </div>

          <VillageMap
            zones={village.zones}
            hotspots={village.hotspots}
            selectedId={selectedId}
            onSelectHotspot={handleSelectHotspot}
            onRequestZone={handleRequestZone}
            focusZone={focusZone}
            starLit={village.starLit}
          />

          <AnimatePresence mode="wait">
            {selectedHotspot && (
              <HotspotCard
                key={selectedHotspot.id}
                hotspot={selectedHotspot}
                zoneName={selectedZone?.name ?? "Villaggio"}
                isOpening={pendingDay !== null && pendingDay === selectedHotspot.dayNumber}
                error={error}
                onOpen={handleOpenDay}
                onClose={handleCloseCard}
              />
            )}
          </AnimatePresence>
        </section>

        {/* Calendario dell'Avvento */}
        <section
          id="calendario"
          className="scroll-mt-6 rounded-2xl border border-cream-300/20 bg-pine-800/40 p-5 backdrop-blur-sm"
        >
          <AdventCalendar
            days={calendar.days}
            pendingDay={pendingDay}
            error={error}
            onOpenDay={handleOpenDay}
          />
        </section>

        {/* Zone + Sfera dei ricordi */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-xl font-bold text-cream-50">Le Zone del Villaggio</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {village.zones.map((zone) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  hotspots={hotspotsByZone.get(zone.slug) ?? []}
                  isActive={activeZoneSlug === zone.slug}
                  selectedId={selectedId}
                  onFocusZone={handleRequestZone}
                  onSelectHotspot={handleSelectHotspot}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-cream-50">Sfera dei Ricordi</h2>
            <div className="rounded-2xl border border-cream-300/20 bg-pine-800/40 p-5 text-center backdrop-blur-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ice-500/20">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#74c0fc" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-cream-100">
                {experience.progress.spheresUnlocked} di{" "}
                {experience.progress.spheresTotal} sfere sbloccate
              </p>
              <p className="mt-1 text-xs text-cream-300/60">
                Le sfere sbloccate compaiono aprendo i giorni che le contengono.
              </p>
            </div>

            <div className="rounded-2xl border border-cream-300/20 bg-pine-800/40 p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-gold-light">Come funziona</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream-200/80">
                Ogni casella si sblocca nel suo giorno e può essere riaperta
                quando vuoi. Le caselle dorate sono pronte, quelle azzurre sono
                già state aperte, quelle rosse hanno completato tutte le
                attività obbligatorie.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Esperienza del giorno */}
      <AnimatePresence>
        {openExperience && (
          <DayExperience
            key={openExperience.dayNumber}
            experience={openExperience}
            onClose={handleCloseExperience}
            onRefresh={refreshExperience}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cream-300/10 bg-pine-950/40 py-4 text-center text-xs text-cream-300/50">
        Christmas Wonderland · Fatto con magia · {todayYear}
      </footer>
    </div>
  );
}
