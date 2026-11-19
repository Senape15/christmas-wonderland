import { describe, expect, it } from "vitest";
import {
  buildClueGroupOptions,
  buildClueItems,
  buildDiscoveredClueTitles,
  type ClueFacts,
  type ClueContentFacts,
} from "./clues";

const clue = (
  id: string,
  day: number,
  overrides: Partial<ClueContentFacts> = {}
): ClueContentFacts => ({
  id,
  day_number: day,
  kind: "clue",
  title: `Indizio ${day}`,
  content: `Contenuto dell'indizio ${day}`,
  image_url: null,
  password_required: false,
  ...overrides,
});

function facts(overrides: Partial<ClueFacts> = {}): ClueFacts {
  return {
    days: [
      { dayNumber: 3, isUnlocked: true, isOpened: true },
      { dayNumber: 4, isUnlocked: true, isOpened: false },
      { dayNumber: 9, isUnlocked: false, isOpened: false },
    ],
    openedAtByDay: new Map([[3, "2026-12-03T08:00:00.000Z"]]),
    contents: [],
    passwordCompletedAt: new Map(),
    discoveredTitles: new Map(),
    ...overrides,
  };
}

describe("archivio indizi", () => {
  it("mostra solo indizi scoperti", () => {
    const result = buildClueItems(
      facts({
        contents: [clue("c1", 3), clue("c2", 4), clue("c3", 9)],
      })
    );

    expect(result.map((item) => item.id)).toEqual(["c1"]);
  });

  it("collega solo indizi già scoperti", () => {
    const contents = [clue("c1", 3, { related_content_ids: ["c2", "c3"] })];
    const discovered = buildDiscoveredClueTitles(contents, facts().days, new Map());

    const result = buildClueItems(
      facts({ contents, discoveredTitles: discovered })
    );

    expect(result[0]!.related).toHaveLength(0);

    const withDiscovered = buildClueItems(
      facts({
        contents,
        discoveredTitles: new Map([
          ["c2", { title: "Indizio 4", dayNumber: 4 }],
        ]),
      })
    );
    expect(withDiscovered[0]!.related).toEqual([
      { id: "c2", title: "Indizio 4", dayNumber: 4 },
    ]);
  });

  it("non collega un indizio a sé stesso", () => {
    const result = buildClueItems(
      facts({
        contents: [clue("c1", 3, { related_content_ids: ["c1"] })],
        discoveredTitles: new Map([
          ["c1", { title: "Indizio 3", dayNumber: 3 }],
        ]),
      })
    );

    expect(result[0]!.related).toHaveLength(0);
  });

  it("nasconde indizi con password non risolta", () => {
    const result = buildClueItems(
      facts({ contents: [clue("c1", 3, { password_required: true })] })
    );
    expect(result).toHaveLength(0);

    const unlocked = buildClueItems(
      facts({
        contents: [clue("c1", 3, { password_required: true })],
        passwordCompletedAt: new Map([["c1", "2026-12-03T10:00:00.000Z"]]),
      })
    );
    expect(unlocked).toHaveLength(1);
  });

  it("costruisce i gruppi di filtro", () => {
    const result = buildClueItems(
      facts({
        contents: [
          clue("c1", 3, { clue_group: "Stella" }),
          clue("c2", 3, { clue_group: null }),
        ],
      })
    );

    expect(buildClueGroupOptions(result)).toEqual([
      { value: "Stella", label: "Stella", count: 1 },
      { value: "senza-gruppo", label: "Senza gruppo", count: 1 },
    ]);
  });
});
