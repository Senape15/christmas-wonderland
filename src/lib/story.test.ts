import { describe, expect, it } from "vitest";
import {
  STORY_TITLE,
  getDefaultLockedHint,
  getHotspotHint,
  getHotspotNicoMessage,
  getHotspotStateLabel,
  getNicoAfterOpen,
  getNicoBeforeOpening,
  getNicoExpressionForState,
  getNicoStateMessage,
  getNicoWelcome,
  getNicoZoneMessage,
  getStoryIntro,
  getStoryPhaseLabel,
} from "./story";
import { CATALOG_HOTSPOTS, CATALOG_ZONES } from "./village/catalog";
import type { HotspotState, StoryPhase } from "@/types/village";
import type { NicoExpression } from "@/types/nico";

const STATES: HotspotState[] = [
  "locked",
  "available",
  "discovered",
  "completed",
];
const PHASES: StoryPhase[] = ["attesa", "in-corso", "completo"];
const FORBIDDEN = /grinch|pupazzo/i;

function allCopy(): string {
  const parts: string[] = [
    STORY_TITLE,
    getNicoAfterOpen(),
    getNicoBeforeOpening(),
    getDefaultLockedHint(),
  ];

  for (const phase of PHASES) {
    parts.push(getStoryIntro(phase), getNicoWelcome(phase, "Ada"), getStoryPhaseLabel(phase));
  }

  for (const state of STATES) {
    parts.push(getNicoStateMessage(state), getHotspotStateLabel(state));
  }

  for (const zone of CATALOG_ZONES) {
    parts.push(zone.name, zone.description, getNicoZoneMessage(zone.slug));
  }

  for (const hotspot of CATALOG_HOTSPOTS) {
    for (const state of STATES) {
      parts.push(
        getHotspotHint(hotspot, state),
        getHotspotNicoMessage(hotspot, state)
      );
    }
  }

  return parts.join("\n");
}

describe("story copy", () => {
  it("never reveals the secret before 24 December", () => {
    expect(allCopy()).not.toMatch(FORBIDDEN);
  });

  it("has copy for every phase, state and kind", () => {
    for (const phase of PHASES) {
      expect(getStoryIntro(phase).length).toBeGreaterThan(20);
      expect(getNicoWelcome(phase, null)).toContain("Nico");
    }

    for (const state of STATES) {
      expect(getNicoStateMessage(state).length).toBeGreaterThan(20);
      expect(getHotspotStateLabel(state).length).toBeGreaterThan(3);
    }

    for (const hotspot of CATALOG_HOTSPOTS) {
      for (const state of STATES) {
        expect(getHotspotHint(hotspot, state).length).toBeGreaterThan(20);
      }
    }
  });
});

describe("getHotspotHint", () => {
  const hotspot = {
    ...CATALOG_HOTSPOTS[4], // cassetta delle lettere
    hint: "TEASER CONFIGURATO",
    lockedHint: "",
  };

  it("never shows the teaser for a locked hotspot", () => {
    const hint = getHotspotHint(hotspot, "locked");

    expect(hint).toBe(getDefaultLockedHint());
    expect(hint).not.toContain("TEASER CONFIGURATO");
  });

  it("prefers the database teaser when unlocked", () => {
    expect(getHotspotHint(hotspot, "available")).toBe("TEASER CONFIGURATO");
    expect(getHotspotHint(hotspot, "discovered")).toBe("TEASER CONFIGURATO");
  });

  it("uses the illustrated default when the database teaser is empty", () => {
    const hint = getHotspotHint({ ...hotspot, hint: "" }, "available");
    expect(hint).toContain("cassetta");
  });

  it("shows the completed message instead of the teaser", () => {
    const hint = getHotspotHint(hotspot, "completed");
    expect(hint).not.toContain("TEASER CONFIGURATO");
    expect(hint).toMatch(/già stata aperta/);
  });
});

describe("Nico behaviour", () => {
  it("uses all four expressions", () => {
    const seen = new Set<NicoExpression>([
      getNicoExpressionForState("locked"),
      getNicoExpressionForState("available"),
      getNicoExpressionForState("available", "surprised"),
      getNicoExpressionForState("discovered"),
      getNicoExpressionForState("completed"),
    ]);

    expect(seen).toEqual(new Set(["happy", "curious", "mysterious", "surprised"]));
  });

  it("never uses a configured message for a locked hotspot", () => {
    const hotspot = {
      ...CATALOG_HOTSPOTS[0],
      nicoMessage: "MESSAGGIO SEGRETO",
    };

    expect(getHotspotNicoMessage(hotspot, "locked")).not.toContain("MESSAGGIO SEGRETO");
  });

  it("uses the configured message when the hotspot is unlocked", () => {
    const hotspot = {
      ...CATALOG_HOTSPOTS[0],
      nicoMessage: "Messaggio del luogo",
    };

    expect(getHotspotNicoMessage(hotspot, "available")).toBe("Messaggio del luogo");
  });
});
