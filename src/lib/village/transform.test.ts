import { describe, expect, it } from "vitest";
import {
  VILLAGE_WORLD,
  clampView,
  computeFitScale,
  fitView,
  panViewBy,
  projectPercentPoint,
  rectForPercentPoints,
  viewForRect,
  zoomViewAt,
} from "./transform";

const VIEWPORT = { width: 1200, height: 660 };
const FIT = computeFitScale(VIEWPORT);
// min(1200 / 1600, 660 / 1100) = min(0.75, 0.6)
const EXPECTED_FIT = 0.6;

describe("computeFitScale", () => {
  it("uses the more restrictive axis", () => {
    expect(FIT).toBeCloseTo(EXPECTED_FIT, 10);
  });

  it("never returns zero for a valid viewport", () => {
    expect(computeFitScale({ width: 320, height: 480 })).toBeGreaterThan(0);
  });
});

describe("fitView", () => {
  it("centers the whole world in the viewport", () => {
    const view = fitView(VIEWPORT);

    expect(view.scale).toBeCloseTo(EXPECTED_FIT, 10);
    expect(view.x).toBeCloseTo((VIEWPORT.width - VILLAGE_WORLD.width * EXPECTED_FIT) / 2, 6);
    expect(view.y).toBeCloseTo(0, 6);
  });
});

describe("clampView", () => {
  it("never zooms out below the fit scale", () => {
    const view = clampView({ x: 0, y: 0, scale: 0.1 }, VIEWPORT);

    expect(view.scale).toBeCloseTo(EXPECTED_FIT, 10);
    // Alla scala minima il mondo è centrato, non trascinabile.
    expect(view.x).toBeCloseTo(120, 6);
    expect(view.y).toBeCloseTo(0, 6);
  });

  it("caps the maximum zoom", () => {
    const view = clampView({ x: 0, y: 0, scale: 100 }, VIEWPORT);
    expect(view.scale).toBeCloseTo(EXPECTED_FIT * 3.6, 10);
  });

  it("keeps the scaled world covering the viewport", () => {
    const view = clampView({ x: 500, y: 500, scale: 1.2 }, VIEWPORT);

    expect(view.x).toBe(0);
    expect(view.y).toBe(0);
    expect(view.x + VILLAGE_WORLD.width * view.scale).toBeGreaterThanOrEqual(
      VIEWPORT.width
    );
    expect(view.y + VILLAGE_WORLD.height * view.scale).toBeGreaterThanOrEqual(
      VIEWPORT.height
    );
  });

  it("stops panning at the opposite edges", () => {
    const view = clampView({ x: -9000, y: -9000, scale: 1.2 }, VIEWPORT);

    expect(view.x).toBeCloseTo(VIEWPORT.width - VILLAGE_WORLD.width * 1.2, 6);
    expect(view.y).toBeCloseTo(VIEWPORT.height - VILLAGE_WORLD.height * 1.2, 6);
  });
});

describe("panViewBy", () => {
  it("moves the map by the drag delta within bounds", () => {
    const start = clampView({ x: -240, y: -330, scale: 1.2 }, VIEWPORT);
    const moved = panViewBy(start, -100, -50, VIEWPORT);

    expect(moved.x).toBeCloseTo(-340, 6);
    expect(moved.y).toBeCloseTo(-380, 6);
  });
});

describe("zoomViewAt", () => {
  it("keeps the focal point under the cursor", () => {
    const focal = { x: 600, y: 330 };
    const start = clampView({ x: 120, y: 0, scale: EXPECTED_FIT }, VIEWPORT);

    const worldPoint = {
      x: (focal.x - start.x) / start.scale,
      y: (focal.y - start.y) / start.scale,
    };

    const zoomed = zoomViewAt(start, 2, focal, VIEWPORT);

    const projected = {
      x: worldPoint.x * zoomed.scale + zoomed.x,
      y: worldPoint.y * zoomed.scale + zoomed.y,
    };

    expect(zoomed.scale).toBeCloseTo(1.2, 10);
    expect(projected.x).toBeCloseTo(focal.x, 6);
    expect(projected.y).toBeCloseTo(focal.y, 6);
  });

  it("does not exceed the zoom limits", () => {
    const start = fitView(VIEWPORT);
    const zoomedIn = zoomViewAt(start, 100, { x: 600, y: 330 }, VIEWPORT);
    const zoomedOut = zoomViewAt(start, 0.001, { x: 600, y: 330 }, VIEWPORT);

    expect(zoomedIn.scale).toBeCloseTo(EXPECTED_FIT * 3.6, 10);
    expect(zoomedOut.scale).toBeCloseTo(EXPECTED_FIT, 10);
  });
});

describe("viewForRect", () => {
  it("centers the requested area and respects the max zoom", () => {
    const rect = { x: 600, y: 400, width: 400, height: 300 };
    const view = viewForRect(rect, VIEWPORT);

    const center = projectPercentPoint({ x: 50, y: 50 }, view);

    expect(center.x).toBeCloseTo(VIEWPORT.width / 2, 4);
    expect(center.y).toBeCloseTo(VIEWPORT.height / 2, 4);
    expect(view.scale).toBeLessThanOrEqual(EXPECTED_FIT * 3.6 + 1e-9);
  });

  it("falls back to the overview for an empty rectangle", () => {
    const view = viewForRect({ x: 0, y: 0, width: 0, height: 0 }, VIEWPORT);
    expect(view).toEqual(fitView(VIEWPORT));
  });
});

describe("rectForPercentPoints", () => {
  it("converts percentages to a padded world rectangle", () => {
    const rect = rectForPercentPoints([
      { x: 50, y: 50 },
      { x: 60, y: 40 },
    ]);

    expect(rect).toEqual({ x: 660, y: 300, width: 440, height: 390 });
  });

  it("returns a central fallback area without points", () => {
    expect(rectForPercentPoints([])).toEqual({
      x: 400,
      y: 275,
      width: 800,
      height: 550,
    });
  });
});

describe("projectPercentPoint", () => {
  it("projects world percentages onto the screen", () => {
    const view = { x: 100, y: 50, scale: 0.5 };
    const point = projectPercentPoint({ x: 50, y: 50 }, view);

    expect(point.x).toBeCloseTo(100 + 800 * 0.5, 6);
    expect(point.y).toBeCloseTo(50 + 550 * 0.5, 6);
  });
});
