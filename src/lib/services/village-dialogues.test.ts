import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVillageDialogues } from "./village-dialogues";
import type { CurrentUser } from "@/lib/auth";
import type { VillageData } from "@/types/village";

const user: CurrentUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "a@example.com",
  role: "user",
  name: "A",
  avatar_url: null,
};

const village: VillageData = {
  zones: [],
  hotspots: [
    {
      id: "h1",
      zoneSlug: "piazza-centrale",
      slug: "albero",
      name: "Albero",
      kind: "tree",
      x: 50,
      y: 50,
      dayNumber: 1,
      state: "completed",
      hint: "Sorpresa del giorno 1",
      lockedHint: "",
      nicoMessage: "Guarda sotto l'albero!",
      nicoExpression: "curious",
      sortOrder: 0,
    },
    {
      id: "h2",
      zoneSlug: "piazza-centrale",
      slug: "fontana",
      name: "Fontana",
      kind: "fountain",
      x: 30,
      y: 60,
      dayNumber: null,
      state: "locked",
      hint: "",
      lockedHint: "Torna più avanti",
      nicoMessage: "Segreto del futuro",
      nicoExpression: "curious",
      sortOrder: 1,
    },
  ],
  phase: "in-corso",
  starLit: false,
  hasDatabaseMapping: true,
};

function builder(table: string) {
  const data =
    table === "quizzes"
      ? [
          {
            id: "q1",
            day_number: 1,
            question: "Quante luci ha l'albero?",
            hint: "",
            is_active: true,
          },
          {
            id: "q2",
            day_number: 2,
            question: "Domanda del futuro",
            hint: "",
            is_active: true,
          },
        ]
      : table === "user_quiz_attempts"
        ? [{ quiz_id: "q1", is_correct: true }]
        : table === "quiz_answers"
          ? [{ quiz_id: "q1", answer_text: "Cento" }]
          : [];

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    then: (resolve: (value: unknown) => unknown) => resolve({ data, error: null }),
  };
  return chain;
}

const client = { from: (table: string) => builder(table) };

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(client as never);
  vi.mocked(createAdminClient).mockResolvedValue(client as never);
});

describe("frasi del villaggio dai quiz", () => {
  it("usa domanda, messaggio di Nico e risposta solo se completata", async () => {
    const dialogues = await getVillageDialogues(user, village);

    expect(dialogues.tree).toEqual([
      ["npc", "Quante luci ha l'albero?"],
      ["nico", "Guarda sotto l'albero!"],
      ["npc", "Cento"],
    ]);
  });

  it("non manda nulla per i luoghi bloccati", async () => {
    const dialogues = await getVillageDialogues(user, village);
    expect(dialogues.fountain).toBeUndefined();
  });
});
