import { describe, expect, it } from "vitest";
import {
  buildObjectItems,
  buildSphereItems,
  buildSymbolItems,
  shouldUnlockSphere,
  type CollectionFacts,
} from "./collection";

function facts(overrides: Partial<CollectionFacts> = {}): CollectionFacts {
  return {
    days: [
      { dayNumber: 3, isUnlocked: true, isOpened: true },
      { dayNumber: 4, isUnlocked: true, isOpened: false },
      { dayNumber: 9, isUnlocked: false, isOpened: false },
    ],
    openedAtByDay: new Map([[3, "2026-12-03T08:00:00.000Z"]]),
    contents: [],
    gifts: [],
    symbols: [],
    spheres: [],
    passwordCompletedAt: new Map(),
    ...overrides,
  };
}

describe("collezione oggetti", () => {
  it("mostra solo gli oggetti dei giorni aperti", () => {
    const result = buildObjectItems(
      facts({
        gifts: [
          {
            id: "g1",
            day_number: 3,
            name: "Pupazzo",
            description: "Un regalo",
            image_url: null,
          },
          {
            id: "g2",
            day_number: 4,
            name: "Non aperto",
            description: "",
            image_url: null,
          },
          {
            id: "g3",
            day_number: 9,
            name: "Futuro",
            description: "",
            image_url: null,
          },
        ],
      })
    );

    expect(result.found).toBe(1);
    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.name)).toEqual(["Pupazzo"]);
    expect(result.items[0]!.acquiredAtLabel).toBeTruthy();
  });

  it("nasconde nome e immagine delle sagome non ottenute", () => {
    const result = buildObjectItems(
      facts({
        gifts: [
          {
            id: "g1",
            day_number: 4,
            name: "Segreto",
            description: "Non rivelare",
            image_url: "https://example.com/secret.png",
            show_silhouette: true,
          },
        ],
      })
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.silhouette).toBe(true);
    expect(result.items[0]!.name).toBe("");
    expect(result.items[0]!.imageUrl).toBeNull();
  });

  it("non mostra sagome se l'admin non le ha abilitate", () => {
    const result = buildObjectItems(
      facts({
        gifts: [
          {
            id: "g1",
            day_number: 4,
            name: "Segreto",
            description: "Non rivelare",
            image_url: null,
          },
        ],
      })
    );

    expect(result.items).toHaveLength(0);
  });

  it("nasconde oggetti con password non ancora risolta", () => {
    const result = buildObjectItems(
      facts({
        contents: [
          {
            id: "c1",
            day_number: 3,
            kind: "object",
            title: "Oggetto chiuso",
            content: "Testo",
            image_url: null,
            password_required: true,
            show_silhouette: true,
          },
        ],
      })
    );

    expect(result.found).toBe(0);
    expect(result.items[0]!.silhouette).toBe(true);
  });
});

describe("collezione simboli", () => {
  it("non assegna simboli duplicati", () => {
    const result = buildSymbolItems(
      facts({
        symbols: [
          {
            id: "s1",
            effectiveDay: 3,
            symbol: "Stella",
            description: "Simbolo",
            image_url: null,
          },
          {
            id: "s1",
            effectiveDay: 3,
            symbol: "Stella",
            description: "Simbolo",
            image_url: null,
          },
        ],
      })
    );

    expect(result.items).toHaveLength(1);
    expect(result.found).toBe(1);
    expect(result.total).toBe(1);
  });

  it("mostra solo i simboli scoperti", () => {
    const result = buildSymbolItems(
      facts({
        symbols: [
          {
            id: "s1",
            effectiveDay: 4,
            symbol: "Segreto",
            description: "Nascosto",
            image_url: "https://example.com/secret.png",
          },
        ],
      })
    );

    expect(result.items).toHaveLength(0);
    expect(result.found).toBe(0);
  });
});

describe("sfere della memoria", () => {
  it("sblocca solo a condizioni soddisfatte e giorno aperto", () => {
    expect(
      shouldUnlockSphere({
        isUnlocked: false,
        dayNumber: 3,
        dayUnlocked: true,
        dayOpened: true,
        conditionsMet: true,
      })
    ).toBe(true);

    expect(
      shouldUnlockSphere({
        isUnlocked: false,
        dayNumber: 4,
        dayUnlocked: true,
        dayOpened: false,
        conditionsMet: true,
      })
    ).toBe(false);

    expect(
      shouldUnlockSphere({
        isUnlocked: false,
        dayNumber: null,
        dayUnlocked: true,
        dayOpened: false,
        conditionsMet: false,
      })
    ).toBe(false);
  });

  it("non mostra mai sfere di giorni futuri", () => {
    const result = buildSphereItems(
      facts({
        spheres: [
          {
            id: "sp1",
            title: "Futuro",
            note: null,
            photo_url: null,
            day_number: 9,
            is_unlocked: false,
            unlocked_at: null,
            discovered_at: null,
            conditionsMet: true,
          },
        ],
      })
    );

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("seleziona la sfera appena sbloccata come nuova", () => {
    const result = buildSphereItems(
      facts({
        spheres: [
          {
            id: "sp1",
            title: "Ricordo",
            note: "Un ricordo",
            photo_url: null,
            day_number: 3,
            is_unlocked: true,
            unlocked_at: "2026-12-03T09:00:00.000Z",
            discovered_at: null,
            conditionsMet: true,
          },
        ],
      })
    );

    expect(result.found).toBe(1);
    expect(result.items[0]!.isNew).toBe(true);
    expect(result.items[0]!.unlockedAtLabel).toBeTruthy();
  });
});
