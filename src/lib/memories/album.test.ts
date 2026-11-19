import { describe, expect, it } from "vitest";
import {
  buildAlbumEntries,
  buildAlbumFilterOptions,
  filterAlbumEntries,
  type AlbumFacts,
} from "./album";

function facts(overrides: Partial<AlbumFacts> = {}): AlbumFacts {
  return {
    days: [
      {
        dayNumber: 3,
        title: "La lanterna",
        description: "Un ricordo",
        isUnlocked: true,
        isOpened: true,
      },
      {
        dayNumber: 4,
        title: "Il bosco",
        description: "Non ancora vissuto",
        isUnlocked: true,
        isOpened: false,
      },
      {
        dayNumber: 9,
        title: null,
        description: null,
        isUnlocked: false,
        isOpened: false,
      },
    ],
    openedAtByDay: new Map([[3, "2026-12-03T08:00:00.000Z"]]),
    accessibleContents: [],
    gifts: [],
    quizzes: [],
    correctQuizAt: new Map(),
    messages: [],
    symbols: [],
    spheres: [],
    memories: [],
    quizAnswerAt: new Map(),
    ...overrides,
  };
}

describe("album dei ricordi", () => {
  it("include solo giorni aperti, con data di scoperta", () => {
    const entries = buildAlbumEntries(facts());
    expect(entries.map((entry) => entry.id)).toEqual(["day:3"]);
    expect(entries[0]!.acquiredAtLabel).toBeTruthy();
  });

  it("non include contenuti di giorni futuri o non aperti", () => {
    const entries = buildAlbumEntries(
      facts({
        accessibleContents: [
          {
            id: "c1",
            day_number: 9,
            kind: "letter",
            title: "Lettera futura",
            content: "…",
            image_url: null,
            password_required: false,
          },
          {
            id: "c2",
            day_number: 4,
            kind: "letter",
            title: "Lettera chiusa",
            content: "…",
            image_url: null,
            password_required: false,
          },
        ],
      })
    );

    expect(entries.some((entry) => entry.dayNumber === 9)).toBe(false);
    expect(entries.some((entry) => entry.dayNumber === 4)).toBe(false);
  });

  it("include il contenuto completo di un ricordo accessibile", () => {
    const entries = buildAlbumEntries(
      facts({
        accessibleContents: [
          {
            id: "c1",
            day_number: 3,
            kind: "letter",
            title: "Lettera di Nico",
            content: "Testo completo della lettera",
            image_url: null,
            password_required: false,
          },
        ],
      })
    );

    const letter = entries.find((entry) => entry.id === "content:c1");
    expect(letter?.content).toBe("Testo completo della lettera");
    expect(letter?.kind).toBe("letter");
    expect(letter?.sourceId).toBe("c1");
  });

  it("esclude i ricordi speciali del finale dall'album ordinario", () => {
    const entries = buildAlbumEntries(
      facts({
        memories: [
          {
            id: "m1",
            placement: "finale",
            kind: "finale",
            title: "Rivelazione",
            description: "…",
            content: "…",
            image_url: null,
            day_number: 3,
          },
          {
            id: "m2",
            placement: "album",
            kind: "special",
            title: "Ricordo speciale",
            description: "…",
            content: "…",
            image_url: null,
            day_number: 3,
          },
        ],
      })
    );

    expect(entries.some((entry) => entry.id === "memory:m1")).toBe(false);
    expect(entries.some((entry) => entry.id === "memory:m2")).toBe(true);
  });

  it("filtra per tipo e per giorno", () => {
    const entries = buildAlbumEntries(
      facts({
        gifts: [
          {
            id: "g1",
            day_number: 3,
            name: "Regalo",
            description: "…",
            image_url: null,
          },
        ],
      })
    );

    expect(filterAlbumEntries(entries, { kind: "gift" })).toHaveLength(1);
    expect(filterAlbumEntries(entries, { kind: "clue" })).toHaveLength(0);
    expect(filterAlbumEntries(entries, { dayNumber: 3 })).toHaveLength(2);
  });

  it("costruisce opzioni di filtro coerenti", () => {
    const entries = buildAlbumEntries(facts());
    const options = buildAlbumFilterOptions(entries);
    expect(options.kinds[0]!.value).toBe("day");
    expect(options.days[0]!.label).toBe("Giorno 3");
  });
});
