"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { VillageArt } from "./art/VillageArt";
import { HotspotMarker } from "./HotspotMarker";
import {
  VILLAGE_WORLD,
  clampView,
  coverView,
  fitView,
  panViewBy,
  rectForPercentPoints,
  viewForRect,
  zoomViewAt,
  type MapView,
  type Size,
} from "@/lib/village/transform";
import type { VillageHotspot, VillageZone } from "@/types/village";

export interface ZoneFocusRequest {
  slug: string;
  token: number;
}

interface VillageMapProps {
  zones: readonly VillageZone[];
  hotspots: readonly VillageHotspot[];
  selectedId: string | null;
  onSelectHotspot: (hotspotId: string) => void;
  onRequestZone: (zoneSlug: string) => void;
  focusZone: ZoneFocusRequest | null;
  starLit: boolean;
  className?: string;
  /**
   * `framed` è la mappa dentro una scheda (bordo, angoli, altezza fissa).
   * `bare` riempie il contenitore: la usa la scena "paesaggio" della home.
   */
  variant?: "framed" | "bare";
  hideZoneNav?: boolean;
  hideHint?: boolean;
  controlsClassName?: string;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

const EMPTY_SIZE: Size = { width: 0, height: 0 };

/**
 * In verticale la scena "bare" usa una vista che riempie il contenitore:
 * un fit completo lascerebbe troppo cielo/neve vuoti sopra e sotto.
 */
function initialViewFor(
  size: Size,
  variant: "framed" | "bare"
): MapView {
  if (variant === "bare" && size.height > size.width * 1.05) {
    return coverView(size);
  }
  return fitView(size);
}

/**
 * Mappa interattiva del villaggio.
 *
 * - trascinamento con mouse o dito;
 * - zoom con rotella, pinch o pulsanti;
 * - limiti calcolati (non si può perdere la mappa fuori dallo schermo);
 * - inquadratura di zona richiesta dall'esterno (schede e pulsanti);
 * - navigazione da tastiera (frecce, +/−, 0).
 *
 * La matematica vive in `@/lib/village/transform` ed è coperta da test.
 */
export function VillageMap({
  zones,
  hotspots,
  selectedId,
  onSelectHotspot,
  onRequestZone,
  focusZone,
  starLit,
  className,
  variant = "framed",
  hideZoneNav = false,
  hideHint = false,
  controlsClassName,
}: VillageMapProps) {
  const reducedMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<Size>(EMPTY_SIZE);
  const viewRef = useRef<MapView>({ x: 0, y: 0, scale: 1 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{ distance: number; mid: { x: number; y: number }; view: MapView } | null>(null);
  const lastFocusToken = useRef<number | null>(null);
  const fittedRef = useRef(false);

  const [size, setSize] = useState<Size>(EMPTY_SIZE);
  const [view, setView] = useState<MapView>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFitted, setIsFitted] = useState(false);

  const hintId = useId();

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  /* Misura il contenitore e resta aggiornato su resize/orientamento. */
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const next = { width: rect.width, height: rect.height };
      sizeRef.current = next;
      setSize((current) =>
        Math.abs(current.width - next.width) < 1 &&
        Math.abs(current.height - next.height) < 1
          ? current
          : next
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* Prima misura: vista generale. Ridimensionamenti: mantiene i limiti. */
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;

    if (!fittedRef.current) {
      fittedRef.current = true;
      setView(initialViewFor(size, variant));
      setIsFitted(true);
      return;
    }

    setView((current) => clampView(current, size));
  }, [size, variant]);

  /* Inquadratura di zona richiesta da schede o pulsanti. */
  useEffect(() => {
    if (!focusZone || size.width <= 0) return;
    if (lastFocusToken.current === focusZone.token) return;
    lastFocusToken.current = focusZone.token;

    const points = hotspots
      .filter((hotspot) => hotspot.zoneSlug === focusZone.slug)
      .map((hotspot) => ({ x: hotspot.x, y: hotspot.y }));

    setView(viewForRect(rectForPercentPoints(points), size));
  }, [focusZone, hotspots, size]);

  /* Zoom con rotella: listener nativo per poter annullare lo scroll. */
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const focal = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((current) => zoomViewAt(current, factor, focal, sizeRef.current));
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  const localPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-hotspot]")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Puntatore già rilasciato (es. evento sintetico): il trascinamento
      // funziona comunque tramite gli eventi successivi.
    }

    if (pointersRef.current.size === 1) {
      dragRef.current = point;
      setIsDragging(true);
    } else if (pointersRef.current.size === 2) {
      dragRef.current = null;
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        distance: distance(first, second),
        mid: midpoint(first, second),
        view: viewRef.current,
      };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = Array.from(pointersRef.current.values());
      const start = pinchRef.current;
      const nextDistance = distance(first, second);
      const nextMid = midpoint(first, second);
      const factor = start.distance > 0 ? nextDistance / start.distance : 1;

      const zoomed = zoomViewAt(start.view, factor, start.mid, sizeRef.current);
      const moved = panViewBy(
        zoomed,
        nextMid.x - start.mid.x,
        nextMid.y - start.mid.y,
        sizeRef.current
      );
      setView(moved);
      return;
    }

    if (!dragRef.current) return;
    const deltaX = point.x - dragRef.current.x;
    const deltaY = point.y - dragRef.current.y;
    dragRef.current = point;
    setView((current) =>
      panViewBy(current, deltaX, deltaY, sizeRef.current)
    );
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (pointersRef.current.size === 1) {
      const [remaining] = Array.from(pointersRef.current.values());
      dragRef.current = remaining;
    } else {
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const zoomBy = useCallback((factor: number, focal?: { x: number; y: number }) => {
    setView((current) =>
      zoomViewAt(
        current,
        factor,
        focal ?? { x: sizeRef.current.width / 2, y: sizeRef.current.height / 2 },
        sizeRef.current
      )
    );
  }, []);

  const resetView = useCallback(() => {
    setView(initialViewFor(sizeRef.current, variant));
  }, [variant]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const step = 70;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        setView((current) => panViewBy(current, step, 0, sizeRef.current));
        break;
      case "ArrowRight":
        event.preventDefault();
        setView((current) => panViewBy(current, -step, 0, sizeRef.current));
        break;
      case "ArrowUp":
        event.preventDefault();
        setView((current) => panViewBy(current, 0, step, sizeRef.current));
        break;
      case "ArrowDown":
        event.preventDefault();
        setView((current) => panViewBy(current, 0, -step, sizeRef.current));
        break;
      case "+":
      case "=":
        event.preventDefault();
        zoomBy(1.25);
        break;
      case "-":
        event.preventDefault();
        zoomBy(0.8);
        break;
      case "0":
      case "Home":
        event.preventDefault();
        resetView();
        break;
      default:
        break;
    }
  };

  const animate = isFitted && !isDragging && !reducedMotion;
  const transition = animate
    ? "transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)"
    : "none";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {!hideZoneNav && (
        <div className="flex flex-wrap gap-2" aria-label="Vai a una zona">
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => onRequestZone(zone.slug)}
              className="rounded-full border border-cream-300/20 bg-pine-900/50 px-3 py-1.5 text-xs font-medium text-cream-200/80 transition-colors hover:border-gold/50 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {zone.name}
            </button>
          ))}
        </div>
      )}

      <div className={cn("relative", variant === "bare" && "h-full")}>
        <div
          ref={viewportRef}
          tabIndex={0}
          role="group"
          aria-label="Mappa interattiva del villaggio"
          aria-describedby={hideHint ? undefined : hintId}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative w-full touch-none select-none overflow-hidden bg-[linear-gradient(180deg,#071427_0%,#10233d_45%,#1d3b58_100%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pine-900",
            variant === "framed"
              ? "h-[54vh] max-h-[620px] min-h-[330px] rounded-3xl border border-cream-300/20 shadow-[var(--shadow-card)]"
              : "h-full"
          )}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: VILLAGE_WORLD.width,
              height: VILLAGE_WORLD.height,
              transform: `translate(${round(view.x)}px, ${round(view.y)}px) scale(${round(view.scale)})`,
              transition,
              willChange: animate ? undefined : "transform",
            }}
          >
            <VillageArt starLit={starLit} />
            {hotspots.map((hotspot) => (
              <HotspotMarker
                key={hotspot.id}
                hotspot={hotspot}
                scale={view.scale}
                isSelected={selectedId === hotspot.id}
                onSelect={onSelectHotspot}
              />
            ))}
          </div>

          {/* Controlli */}
          <div
            className={cn(
              "absolute bottom-3 right-3 flex flex-col gap-1.5",
              controlsClassName
            )}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => zoomBy(1.3)}
              aria-label="Ingrandisci la mappa"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-300/25 bg-pine-950/80 text-lg leading-none text-cream-100 backdrop-blur transition-colors hover:border-gold/60 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoomBy(0.77)}
              aria-label="Riduci la mappa"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-300/25 bg-pine-950/80 text-lg leading-none text-cream-100 backdrop-blur transition-colors hover:border-gold/60 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetView}
              aria-label="Torna alla vista generale"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-300/25 bg-pine-950/80 text-cream-100 backdrop-blur transition-colors hover:border-gold/60 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M3 6.5 V3 h3.5 M13 9.5 V13 H9.5 M3 3 L7 7 M13 13 L9 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {!hideHint && (
          <p
            id={hintId}
            className="mt-2 text-center text-[11px] text-cream-200/50"
          >
            Trascina per esplorare · rotella o pizzico per lo zoom · frecce e +/−
            da tastiera
          </p>
        )}
      </div>
    </div>
  );
}
