/**
 * Matematica pura di pan/zoom per la mappa del villaggio.
 *
 * Nessun accesso al DOM: così i limiti (niente mappa fuori schermo) e lo zoom
 * attorno al cursante sono verificabili con Vitest. Il componente si limita a
 * leggere le dimensioni del viewport e ad applicare il risultato.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Trasformazione applicata al palcoscenico: translate + scale. */
export interface MapView {
  x: number;
  y: number;
  scale: number;
}

/** Dimensioni del mondo illustrato (coordinate SVG e posizioni percentuali). */
export const VILLAGE_WORLD: Size = { width: 1600, height: 1100 };

/** Quanto ci si può allontanare dalla vista generale (1 = solo fit). */
export const MAX_ZOOM_MULTIPLIER = 3.6;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function isValidSize(size: Size): boolean {
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0
  );
}

/** Scala necessaria perché il mondo intero entri nel viewport. */
export function computeFitScale(viewport: Size, world: Size = VILLAGE_WORLD): number {
  if (!isValidSize(viewport) || !isValidSize(world)) return 0.0001;
  return Math.min(viewport.width / world.width, viewport.height / world.height);
}

/** Vista generale centrata. */
export function fitView(viewport: Size, world: Size = VILLAGE_WORLD): MapView {
  const scale = computeFitScale(viewport, world);
  return {
    x: (viewport.width - world.width * scale) / 2,
    y: (viewport.height - world.height * scale) / 2,
    scale,
  };
}

/**
 * Impedisce di perdere la mappa fuori dallo schermo.
 *
 * - La scala non scende mai sotto il fit (niente spazi vuoti attorno).
 * - Se il mondo scalato è più piccolo del viewport su un asse, viene centrato:
 *   non è possibile trascinarlo via.
 * - Altrimenti la traslazione è limitata ai bordi del mondo.
 */
export function clampView(
  view: MapView,
  viewport: Size,
  world: Size = VILLAGE_WORLD,
  fitScale: number = computeFitScale(viewport, world)
): MapView {
  if (!isValidSize(viewport) || !isValidSize(world)) return view;

  const minScale = fitScale > 0 ? fitScale : computeFitScale(viewport, world);
  const maxScale = minScale * MAX_ZOOM_MULTIPLIER;
  const scale = clamp(view.scale, minScale, maxScale);

  const scaledWidth = world.width * scale;
  const scaledHeight = world.height * scale;

  const x =
    scaledWidth <= viewport.width
      ? (viewport.width - scaledWidth) / 2
      : clamp(view.x, viewport.width - scaledWidth, 0);

  const y =
    scaledHeight <= viewport.height
      ? (viewport.height - scaledHeight) / 2
      : clamp(view.y, viewport.height - scaledHeight, 0);

  return { x, y, scale };
}

/** Sposta la mappa di (dx, dy) pixel, rispettando i limiti. */
export function panViewBy(
  view: MapView,
  dx: number,
  dy: number,
  viewport: Size,
  world: Size = VILLAGE_WORLD,
  fitScale?: number
): MapView {
  return clampView(
    { ...view, x: view.x + dx, y: view.y + dy },
    viewport,
    world,
    fitScale
  );
}

/**
 * Zoom che mantiene fermo il punto sotto il cursante/pizzico.
 * `factor` > 1 ingrandisce, < 1 riduce.
 */
export function zoomViewAt(
  view: MapView,
  factor: number,
  focal: Point,
  viewport: Size,
  world: Size = VILLAGE_WORLD,
  fitScale?: number
): MapView {
  const resolvedFit = fitScale ?? computeFitScale(viewport, world);
  const minScale = resolvedFit;
  const maxScale = resolvedFit * MAX_ZOOM_MULTIPLIER;
  const target = clamp(view.scale * factor, minScale, maxScale);
  const ratio = view.scale > 0 ? target / view.scale : 1;

  return clampView(
    {
      x: focal.x - (focal.x - view.x) * ratio,
      y: focal.y - (focal.y - view.y) * ratio,
      scale: target,
    },
    viewport,
    world,
    resolvedFit
  );
}

/** Inquadra un rettangolo del mondo (usato per "vai alla zona"). */
export function viewForRect(
  rect: Rect,
  viewport: Size,
  world: Size = VILLAGE_WORLD,
  fitScale?: number
): MapView {
  const resolvedFit = fitScale ?? computeFitScale(viewport, world);

  if (
    !isValidSize(viewport) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return fitView(viewport, world);
  }

  const targetScale = clamp(
    Math.min(viewport.width / rect.width, viewport.height / rect.height) * 0.9,
    resolvedFit,
    resolvedFit * MAX_ZOOM_MULTIPLIER
  );

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return clampView(
    {
      x: viewport.width / 2 - centerX * targetScale,
      y: viewport.height / 2 - centerY * targetScale,
      scale: targetScale,
    },
    viewport,
    world,
    resolvedFit
  );
}

/**
 * Rettangolo che contiene i punti (percentuali) di una zona, con margine.
 * Se la zona non ha punti usa un'area centrale di riserva.
 */
export function rectForPercentPoints(
  points: readonly { x: number; y: number }[],
  world: Size = VILLAGE_WORLD,
  padding = 140
): Rect {
  if (points.length === 0) {
    return {
      x: world.width * 0.25,
      y: world.height * 0.25,
      width: world.width * 0.5,
      height: world.height * 0.5,
    };
  }

  const worldPoints = points.map((point) => ({
    x: (point.x / 100) * world.width,
    y: (point.y / 100) * world.height,
  }));

  const minX = Math.min(...worldPoints.map((point) => point.x));
  const maxX = Math.max(...worldPoints.map((point) => point.x));
  const minY = Math.min(...worldPoints.map((point) => point.y));
  const maxY = Math.max(...worldPoints.map((point) => point.y));

  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(maxX - minX + padding * 2, padding * 2),
    height: Math.max(maxY - minY + padding * 2, padding * 2),
  };
}

/** Posizione sullo schermo di un punto percentuale del mondo. */
export function projectPercentPoint(
  point: { x: number; y: number },
  view: MapView,
  world: Size = VILLAGE_WORLD
): Point {
  return {
    x: (point.x / 100) * world.width * view.scale + view.x,
    y: (point.y / 100) * world.height * view.scale + view.y,
  };
}
