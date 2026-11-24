"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nico } from "@/components/nico/Nico";
import { AdventCalendar } from "@/components/calendar/AdventCalendar";
import { DayExperience } from "@/components/experience/DayExperience";
import { ProgressPanel } from "@/components/dashboard/ProgressPanel";
import {
  DayStateBadge,
  ProgressBar,
  ProgressRing,
  SectionHeading,
} from "@/components/dashboard/ui";
import { HotspotCard } from "@/components/village/HotspotCard";
import {
  VillageMap,
  type ZoneFocusRequest,
} from "@/components/village/VillageMap";
import { ZoneCard } from "@/components/village/ZoneCard";
import { Snowfall } from "@/components/animations/Snowfall";
import { NavIcon, type NavIconName } from "@/components/layout/nav-icons";
import { MenuButton } from "@/components/layout/app-navigation";
import { openDayExperienceAction } from "@/lib/experience-actions";
import { MEMORY_NAV } from "@/lib/memory-nav";
import {
  STORY_SUBTITLE,
  STORY_TITLE,
  getNicoWelcome,
  getStoryIntro,
  getStoryPhaseLabel,
} from "@/lib/story";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth";
import type {
  DayExperience as DayExperienceData,
  ExperienceData,
  ExperienceDay,
} from "@/types/experience";
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

const STATE_SHORT: Record<ExperienceDay["state"], string> = {
  locked: "In arrivo",
  available: "Pronta",
  opened: "Da completare",
  completed: "Completata",
};

interface Mission {
  label: string;
  found: number;
  total: number;
  icon: NavIconName;
  tone: "gold" | "ice" | "red" | "pine";
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
  const [immersive, setImmersive] = useState(false);
  const zoneToken = useRef(0);

  const calendar = experience.calendar;
  const simulation = calendar.simulation;
  const progress = experience.progress;

  const percent =
    progress.totalDays > 0
      ? Math.round((progress.daysOpened / progress.totalDays) * 100)
      : 0;

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

  /** Prima casella da vivere: quella di oggi, poi una aperta da finire. */
  const featuredDay: ExperienceDay | null =
    calendar.days.find((day) => day.state === "available") ??
    calendar.days.find((day) => day.state === "opened") ??
    [...calendar.days].reverse().find((day) => day.isUnlocked) ??
    null;

  const featuredHotspot =
    featuredDay?.dayNumber != null
      ? village.hotspots.find(
          (hotspot) => hotspot.dayNumber === featuredDay.dayNumber
        ) ?? null
      : null;
  const featuredZone = featuredHotspot
    ? village.zones.find((zone) => zone.slug === featuredHotspot.zoneSlug)
    : undefined;

  const unlockedDays = calendar.days.filter((day) => day.isUnlocked);
  const recentChallenges = [...unlockedDays]
    .filter((day) => Boolean(day.title))
    .reverse()
    .slice(0, 6);

  const missions: Mission[] = [
    {
      label: "Quiz",
      found: progress.quizzesCompleted,
      total: progress.quizzesTotal,
      icon: "quiz",
      tone: "ice",
    },
    {
      label: "Password",
      found: progress.passwordsFound,
      total: progress.passwordsTotal,
      icon: "key",
      tone: "gold",
    },
    {
      label: "Indizi",
      found: progress.cluesFound,
      total: progress.cluesTotal,
      icon: "clue",
      tone: "pine",
    },
    {
      label: "Regali",
      found: progress.giftsFound,
      total: progress.giftsTotal,
      icon: "gift",
      tone: "red",
    },
  ];

  const initial = (user.name ?? user.email).trim().charAt(0).toUpperCase() || "?";

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

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

  const handleFocusZone = (zoneSlug: string) => {
    handleRequestZone(zoneSlug);
    requestAnimationFrame(() => scrollToId("mappa"));
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

  // Modalità immersiva: blocca lo scroll della pagina e chiude con Esc.
  useEffect(() => {
    if (!immersive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImmersive(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [immersive]);

  const welcome = getNicoWelcome(village.phase, user.name);
  const storyIntro = getStoryIntro(village.phase);
  const featuredTitle =
    featuredDay?.title ?? "Il villaggio si sta preparando";
  const featuredDescription =
    featuredDay?.description ??
    "La prima sfida si accende il 1° dicembre. Intanto esplora la mappa: ogni angolo del villaggio ha qualcosa da raccontare.";
  const featuredCta = featuredDay
    ? featuredDay.isOpened
      ? `Continua il giorno ${featuredDay.dayNumber}`
      : `Apri il giorno ${featuredDay.dayNumber}`
    : "Guarda il calendario";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-pine-950 text-cream-50">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_-5%,rgba(212,168,67,0.12),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(196,30,58,0.12),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(28,61,90,0.22),transparent_45%)]"
      />
      <Snowfall count={54} className="fixed inset-0 z-0 opacity-60" />

      <header className="sticky top-0 z-40 border-b border-cream-300/10 bg-pine-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2.5 px-4 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Christmas Wonderland, dashboard"
            className="flex min-w-0 items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-christmas-red to-christmas-red-dark text-gold-light shadow-[var(--shadow-glow-red)]">
              <NavIcon name="tree" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold tracking-tight text-cream-50 sm:text-sm">
                Christmas Wonderland
              </span>
              <span className="block truncate text-[10px] text-cream-300/55 sm:text-[11px]">
                {todayLabel}
              </span>
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/25 bg-gold/10 text-xs font-bold text-gold-light">
                {initial}
              </span>
              <span className="max-w-[9rem] truncate text-right text-xs text-cream-200/70">
                {user.name ?? user.email}
              </span>
            </div>
            <MenuButton />
          </div>
        </div>
      </header>

      {/* In modalità immersiva il livello sale sopra il dock: `main` crea un
          contesto di stacking e il solo z-70 della mappa resterebbe sotto la
          navigazione fissa. */}
      <main
        className={cn(
          "relative mx-auto w-full max-w-7xl px-4 pb-32 pt-4 sm:px-6 sm:pt-6",
          immersive ? "z-[80]" : "z-10"
        )}
      >
        {simulation && (
          <div
            role="status"
            className="mb-4 rounded-2xl border border-ice-300/35 bg-ice-900/35 px-4 py-3 text-sm leading-relaxed text-ice-300"
          >
            <strong className="font-semibold">Anteprima amministratore.</strong>{" "}
            Stai vedendo il calendario come se fosse il {simulation.date}.
            {simulation.note ? ` ${simulation.note}.` : ""} Nessuna apertura,
            risposta o progresso reale viene salvato durante la simulazione.
          </div>
        )}

        {/* Paesaggio in primo piano: la mappa è la scena, non un riquadro. */}
        <section id="mappa" aria-labelledby="hero-titolo" className="scroll-mt-24">
          <div
            className={cn(
              "relative overflow-hidden border border-cream-300/15 bg-pine-950 shadow-[0_28px_90px_rgba(0,0,0,0.5)]",
              immersive
                ? "fixed inset-0 z-[70] rounded-none border-0"
                : "rounded-[30px] sm:rounded-[34px]"
            )}
          >
            <div
              className={cn(
                "relative",
                immersive
                  ? "h-[100dvh]"
                  : "h-[54vh] min-h-[400px] max-h-[560px] sm:h-[560px] lg:h-[600px]"
              )}
            >
              <VillageMap
                zones={village.zones}
                hotspots={village.hotspots}
                selectedId={selectedId}
                onSelectHotspot={handleSelectHotspot}
                onRequestZone={handleRequestZone}
                focusZone={focusZone}
                starLit={village.starLit}
                variant="bare"
                hideZoneNav
                hideHint
                className="h-full"
                controlsClassName={immersive ? "bottom-24 right-4" : "bottom-16 right-3"}
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-pine-950/85 via-pine-950/25 to-transparent"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-pine-950 via-pine-950/55 to-transparent"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(4,31,18,0.38)_100%)]"
              />

              <div className="absolute left-4 top-4 flex max-w-[calc(100%-6rem)] flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-cream-300/20 bg-pine-950/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-100/90 backdrop-blur-md">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_10px_rgba(212,168,67,0.9)]"
                  />
                  {getStoryPhaseLabel(village.phase)}
                </span>
                {!immersive && (
                  <span className="hidden rounded-full border border-cream-300/15 bg-pine-950/60 px-3 py-1.5 text-[10px] font-medium text-cream-200/70 backdrop-blur-md sm:inline-flex">
                    {village.zones.length} zone · {village.hotspots.length} luoghi
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setImmersive((value) => !value)}
                aria-label={
                  immersive
                    ? "Chiudi la mappa a schermo intero"
                    : "Apri la mappa a schermo intero"
                }
                aria-pressed={immersive}
                className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border border-cream-300/20 bg-pine-950/75 text-cream-100 backdrop-blur-md transition-colors hover:border-gold/50 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <NavIcon
                  name={immersive ? "shrink" : "expand"}
                  className="h-[18px] w-[18px]"
                />
              </button>

              {immersive && (
                <>
                  <div className="pointer-events-none absolute inset-x-4 top-20 text-center">
                    <p className="font-display text-2xl font-bold text-cream-50 drop-shadow-lg">
                      {STORY_TITLE}
                    </p>
                    <p className="mt-1 text-xs text-cream-200/75">
                      Trascina, ingrandisci e tocca un luogo per aprirlo.
                    </p>
                  </div>
                  <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-cream-300/20 bg-pine-950/75 px-4 py-2 text-[11px] text-cream-100/85 backdrop-blur-md">
                    Tocca un segnale sulla mappa
                  </p>
                </>
              )}

              {!immersive && (
                <div className="pointer-events-none absolute bottom-16 left-4 hidden items-center gap-2 rounded-full border border-cream-300/15 bg-pine-950/65 px-3 py-1.5 text-[10px] text-cream-200/70 backdrop-blur-md sm:flex">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                  </span>
                  Tocca un segnale per scoprire il luogo
                </div>
              )}
            </div>
          </div>

          {!immersive && (
            <div className="relative z-10 mx-3 -mt-12 sm:mx-6 sm:-mt-14">
              <div className="rounded-[28px] border border-cream-300/15 bg-pine-950/92 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/15 to-christmas-red/10">
                      <Nico
                        expression={village.phase === "completo" ? "happy" : "curious"}
                        animated={!reducedMotion}
                        className="w-11"
                      />
                    </div>
                    <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full border border-pine-950 bg-pine-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-pine-100" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light/75">
                      {getStoryPhaseLabel(village.phase)}
                    </p>
                    <h1
                      id="hero-titolo"
                      className="mt-1 font-display text-xl font-bold leading-tight text-cream-50 sm:text-2xl"
                    >
                      {STORY_TITLE}
                    </h1>
                    <p className="mt-0.5 text-[11px] font-medium text-gold-light/80">
                      {STORY_SUBTITLE}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-cream-100/80">
                      {welcome}
                    </p>
                    <details className="group mt-2">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[11px] font-semibold text-cream-200/60 transition-colors hover:text-gold-light">
                        La storia in breve
                        <NavIcon
                          name="chevronRight"
                          className="h-3 w-3 transition-transform group-open:rotate-90"
                        />
                      </summary>
                      <p className="mt-2 rounded-2xl border border-cream-300/10 bg-pine-900/50 p-3 text-xs leading-relaxed text-cream-200/75">
                        {storyIntro}
                      </p>
                    </details>

                    <div className="mt-3 flex items-center gap-2 sm:hidden">
                      <ProgressBar
                        value={progress.daysOpened}
                        total={progress.totalDays}
                        label={`${progress.daysOpened} giorni aperti su ${progress.totalDays}`}
                        className="flex-1"
                      />
                      <span className="text-[10px] font-semibold tabular-nums text-cream-200/65">
                        {progress.daysOpened}/{progress.totalDays}
                      </span>
                    </div>
                  </div>

                  <ProgressRing
                    percent={percent}
                    size={64}
                    stroke={6}
                    className="hidden shrink-0 sm:inline-grid"
                    label={`${progress.daysOpened} giorni aperti su ${progress.totalDays}`}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      featuredDay
                        ? void handleOpenDay(featuredDay.dayNumber)
                        : scrollToId("calendario")
                    }
                    disabled={pendingDay !== null}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark px-4 py-2.5 text-sm font-bold text-pine-950 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-pine-950 disabled:cursor-wait disabled:opacity-70 sm:flex-none"
                  >
                    <NavIcon
                      name={featuredDay?.isOpened ? "play" : "sparkles"}
                      className="h-4 w-4"
                    />
                    {pendingDay === featuredDay?.dayNumber
                      ? "Apro…"
                      : featuredCta}
                  </button>
                  <Link
                    href="#calendario"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cream-300/20 bg-cream-50/5 px-4 py-2.5 text-sm font-semibold text-cream-100 transition-colors hover:border-gold/45 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <NavIcon name="calendar" className="h-4 w-4" />
                    Calendario
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Sfide */}
        <section id="sfide" aria-labelledby="sfide-titolo" className="mt-8 scroll-mt-24 sm:mt-10">
          <SectionHeading
            id="sfide-titolo"
            eyebrow="Sfide"
            title="La sfida di oggi"
            description="Una casella, poche missioni e un pezzo di storia da svelare. Le sfide si attivano con i giorni del calendario."
            action={
              <Link
                href="#calendario"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cream-300/20 bg-cream-50/5 px-3.5 py-2 text-xs font-semibold text-cream-100 transition-colors hover:border-gold/45 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Tutte le caselle
                <NavIcon name="arrowRight" className="h-3.5 w-3.5" />
              </Link>
            }
          />

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <article className="relative overflow-hidden rounded-[28px] border border-gold/25 bg-gradient-to-br from-pine-800/70 via-pine-900/80 to-pine-950 p-5 sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-3 -top-10 select-none font-display text-[120px] font-black leading-none text-cream-50/[0.045]"
              >
                {featuredDay
                  ? String(featuredDay.dayNumber).padStart(2, "0")
                  : "24"}
              </div>

              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                    {featuredDay ? `Giorno ${featuredDay.dayNumber}` : "In attesa"}
                  </span>
                  <DayStateBadge state={featuredDay?.state ?? "locked"} />
                </div>

                <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-cream-50">
                  {featuredTitle}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream-200/75">
                  {featuredDescription}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {featuredZone && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cream-300/15 bg-cream-50/5 px-2.5 py-1 text-[10px] font-medium text-cream-200/75">
                      <NavIcon name="map" className="h-3 w-3 text-gold-light" />
                      {featuredZone.name}
                    </span>
                  )}
                  {featuredHotspot && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cream-300/15 bg-cream-50/5 px-2.5 py-1 text-[10px] font-medium text-cream-200/75">
                      <NavIcon name="clue" className="h-3 w-3 text-ice-300" />
                      {featuredHotspot.name}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      featuredDay
                        ? void handleOpenDay(featuredDay.dayNumber)
                        : scrollToId("calendario")
                    }
                    disabled={pendingDay !== null}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark px-4 py-2.5 text-sm font-bold text-pine-950 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-pine-950 disabled:cursor-wait disabled:opacity-70"
                  >
                    <NavIcon
                      name={featuredDay?.isOpened ? "play" : "sparkles"}
                      className="h-4 w-4"
                    />
                    {pendingDay === featuredDay?.dayNumber ? "Apro…" : featuredCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId("mappa")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cream-300/20 px-4 py-2.5 text-sm font-semibold text-cream-100 transition-colors hover:border-gold/45 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <NavIcon name="map" className="h-4 w-4" />
                    Sulla mappa
                  </button>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red-light"
                  >
                    {error}
                  </p>
                )}
              </div>
            </article>

            <div className="grid grid-cols-2 gap-2.5">
              {missions.map((mission) => (
                <div
                  key={mission.label}
                  className="rounded-3xl border border-cream-300/12 bg-cream-50/[0.03] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl border border-cream-300/10 bg-pine-950/45 text-gold-light">
                      <NavIcon name={mission.icon} className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold tabular-nums text-cream-50">
                      {mission.total > 0
                        ? `${mission.found}/${mission.total}`
                        : "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream-300/55">
                    {mission.label}
                  </p>
                  <ProgressBar
                    value={mission.found}
                    total={mission.total}
                    label={`${mission.label}: ${mission.found} di ${mission.total}`}
                    tone={mission.tone}
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
          </div>

          {recentChallenges.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-cream-100">
                  Le tue sfide sbloccate
                </h3>
                <span className="text-[11px] text-cream-300/50">
                  {unlockedDays.length} su {calendar.days.length}
                </span>
              </div>
              <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {recentChallenges.map((day) => (
                  <button
                    key={day.dayNumber}
                    type="button"
                    onClick={() => void handleOpenDay(day.dayNumber)}
                    disabled={pendingDay !== null}
                    className="group min-w-[152px] snap-start rounded-2xl border border-cream-300/12 bg-cream-50/[0.03] p-3 text-left transition-colors hover:border-gold/45 hover:bg-gold/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light/70">
                        Giorno {day.dayNumber}
                      </span>
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          day.state === "completed"
                            ? "bg-christmas-red-light"
                            : day.state === "opened"
                              ? "bg-ice-300"
                              : "bg-gold"
                        )}
                      />
                    </div>
                    <span className="mt-1 line-clamp-2 block text-xs font-semibold text-cream-50">
                      {day.title}
                    </span>
                    <span className="mt-1 block text-[10px] text-cream-300/50">
                      {STATE_SHORT[day.state]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Calendario */}
        <section
          id="calendario"
          className="mt-8 scroll-mt-24 rounded-[28px] border border-cream-300/12 bg-pine-900/30 p-4 sm:mt-10 sm:p-6"
        >
          <AdventCalendar
            days={calendar.days}
            pendingDay={pendingDay}
            error={error}
            onOpenDay={handleOpenDay}
          />
        </section>

        {/* Zone */}
        <section id="zone" className="mt-8 scroll-mt-24 sm:mt-10">
          <SectionHeading
            eyebrow="Mappa"
            title="Esplora le sei zone"
            description="Tocca una zona per inquadrarla sulla mappa, oppure apri direttamente un luogo."
            action={
              <button
                type="button"
                onClick={() => scrollToId("mappa")}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cream-300/20 bg-cream-50/5 px-3.5 py-2 text-xs font-semibold text-cream-100 transition-colors hover:border-gold/45 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <NavIcon name="map" className="h-3.5 w-3.5" />
                Torna alla mappa
              </button>
            }
          />
          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {village.zones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                hotspots={hotspotsByZone.get(zone.slug) ?? []}
                isActive={activeZoneSlug === zone.slug}
                selectedId={selectedId}
                onFocusZone={handleFocusZone}
                onSelectHotspot={handleSelectHotspot}
                className="w-[280px] shrink-0 snap-start sm:w-auto sm:min-w-0"
              />
            ))}
          </div>
        </section>

        {/* Progressi */}
        <section id="progressi" className="mt-8 scroll-mt-24 sm:mt-10">
          <ProgressPanel progress={progress} />
        </section>

        {/* Ricordi */}
        <section id="ricordi" className="mt-8 scroll-mt-24 sm:mt-10">
          <SectionHeading
            eyebrow="Il libro dei ricordi"
            title="La tua collezione"
            description="Tutto ciò che hai trovato resta qui: foto, indizi, sfere e momenti da rileggere."
            action={
              <Link
                href="/dashboard/statistiche"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cream-300/20 bg-cream-50/5 px-3.5 py-2 text-xs font-semibold text-cream-100 transition-colors hover:border-gold/45 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Statistiche
                <NavIcon name="stats" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {MEMORY_NAV.filter((item) => item.href !== "/dashboard").map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-h-[104px] flex-col rounded-3xl border border-cream-300/12 bg-cream-50/[0.03] p-3.5 transition-colors hover:border-gold/40 hover:bg-gold/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-gold/20 bg-gold/10 text-gold-light transition-transform group-hover:scale-105">
                  <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="mt-2 block text-sm font-semibold text-cream-50">
                  {item.label}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-cream-300/50">
                  {item.description}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-cream-300/10 pb-2 pt-5 text-center text-[11px] text-cream-300/40">
          <span className="inline-flex items-center gap-2">
            <NavIcon name="snow" className="h-3.5 w-3.5 text-gold-light/60" />
            Christmas Wonderland · Fatto con magia · {todayYear}
          </span>
        </footer>
      </main>

      {/* Scheda del luogo: bottom sheet sopra il dock, pannello laterale su desktop. */}
      <AnimatePresence>
        {selectedHotspot && (
          <motion.div
            key={selectedHotspot.id}
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn(
              "fixed inset-x-0 z-[45] mx-auto w-full max-w-lg px-3 sm:inset-x-auto sm:right-6 sm:mx-0 sm:w-[400px] sm:px-0",
              immersive
                ? "bottom-4 z-[80] sm:bottom-6"
                : "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:bottom-24"
            )}
          >
            <div className="max-h-[66dvh] overflow-y-auto overscroll-contain rounded-[28px]">
              <HotspotCard
                hotspot={selectedHotspot}
                zoneName={selectedZone?.name ?? "Villaggio"}
                isOpening={
                  pendingDay !== null && pendingDay === selectedHotspot.dayNumber
                }
                error={error}
                onOpen={handleOpenDay}
                onClose={handleCloseCard}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
