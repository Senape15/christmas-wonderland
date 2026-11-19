import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./experience", () => ({ getSimulationRow: vi.fn(async () => null) }));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/admin/passwords";
import type { CurrentUser } from "@/lib/auth";
import {
  verifyContentPassword,
  verifyFinalBoxPassword,
  verifyQuizAnswer,
} from "./verification";

const mockedAdmin = vi.mocked(createAdminClient);
const mockedServer = vi.mocked(createClient);

const user: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "utente@example.com",
  role: "user",
  name: "Utente",
  avatar_url: null,
};

interface QueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

interface Call {
  table: string;
  payload: Record<string, unknown>;
}

interface Behavior {
  maybe?: QueryResult;
  list?: QueryResult;
  insert?: QueryResult;
  upsert?: QueryResult;
}

/**
 * Mock minimale del query builder Supabase: copre le forme usate dal servizio
 * (maybeSingle, single, thenable, insert, upsert) e registra le scritture.
 */
function makeChain(
  table: string,
  behavior: Behavior,
  calls: Call[]
) {
  const chain: Record<string, unknown> = {};
  const maybe = () =>
    Promise.resolve(behavior.maybe ?? { data: null, error: null });
  const list = () =>
    Promise.resolve(behavior.list ?? { data: [], error: null });

  for (const method of ["select", "eq", "in", "order", "limit", "lte"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(maybe);
  chain.single = vi.fn(maybe);
  chain.insert = vi.fn((payload: Record<string, unknown>) => {
    calls.push({ table, payload });
    return Promise.resolve(behavior.insert ?? { data: null, error: null });
  });
  chain.upsert = vi.fn((payload: Record<string, unknown>) => {
    calls.push({ table, payload });
    return Promise.resolve(behavior.upsert ?? { data: null, error: null });
  });
  chain.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => list().then(onFulfilled, onRejected);

  return chain;
}

function installClients(
  tables: Record<string, Behavior>,
  calls: Call[]
) {
  const from = vi.fn((table: string) =>
    makeChain(table, tables[table] ?? {}, calls)
  );

  mockedAdmin.mockResolvedValue({ from } as never);
  mockedServer.mockResolvedValue({ from } as never);
  return from;
}

const CONTENT_ID = "22222222-2222-4222-8222-222222222222";
const QUIZ_ID = "33333333-3333-4333-8333-333333333333";
const ANSWER_ID = "44444444-4444-4444-8444-444444444444";
const BOX_ID = "55555555-5555-4555-8555-555555555555";

const unlockedDay = {
  data: { day_number: 5, unlock_date: "2026-12-05T00:00:00+01:00" },
  error: null,
};

const passwordContent = {
  data: {
    id: CONTENT_ID,
    day_number: 5,
    title: "La scatola di legno",
    password_required: true,
    is_active: true,
    success_message: "Hai trovato la stella!",
    activation_conditions: {},
  },
  error: null,
};

const passwordConfig = (overrides: Record<string, unknown> = {}) => ({
  data: {
    password_hash: hashPassword("Stella2026!"),
    hint: "Guarda sotto l'albero",
    success_message: "Sorpresa sbloccata!",
    max_attempts: null,
    is_active: true,
    ...overrides,
  },
  error: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-12-10T12:00:00Z"));
});

describe("verifyContentPassword", () => {
  it("accetta la password corretta e registra tentativo e completamento", async () => {
    const calls: Call[] = [];
    installClients(
      {
        physical_contents: { maybe: passwordContent },
        physical_passwords: { maybe: passwordConfig() },
        advent_days: { maybe: unlockedDay },
        password_completions: {
          maybe: { data: null, error: null },
          list: { data: [], error: null },
        },
        password_attempts: { list: { data: [], error: null, count: 0 } },
        user_openings: { list: { data: [{ day_number: 5 }], error: null } },
        user_quiz_attempts: { list: { data: [], error: null } },
      },
      calls
    );

    const result = await verifyContentPassword(user, CONTENT_ID, "Stella2026!");

    expect(result.ok).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.error).toBeNull();
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "password_attempts",
          payload: expect.objectContaining({ success: true }),
        }),
        expect.objectContaining({
          table: "password_completions",
          payload: expect.objectContaining({ user_id: user.id }),
        }),
      ])
    );
    // L'hash non deve mai comparire nella risposta.
    expect(JSON.stringify(result)).not.toContain("scrypt");
  });

  it("rifiuta una password errata senza registrare completamenti", async () => {
    const calls: Call[] = [];
    installClients(
      {
        physical_contents: { maybe: passwordContent },
        physical_passwords: { maybe: passwordConfig() },
        advent_days: { maybe: unlockedDay },
        password_completions: {
          maybe: { data: null, error: null },
          list: { data: [], error: null },
        },
        password_attempts: { list: { data: [], error: null, count: 0 } },
        user_openings: { list: { data: [{ day_number: 5 }], error: null } },
        user_quiz_attempts: { list: { data: [], error: null } },
      },
      calls
    );

    const result = await verifyContentPassword(user, CONTENT_ID, "sbagliata");

    expect(result.ok).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.error).toMatch(/non corretta/i);
    expect(calls.some((call) => call.table === "password_completions")).toBe(false);
    expect(
      calls.find((call) => call.table === "password_attempts")?.payload.success
    ).toBe(false);
  });

  it("rispetta il numero massimo di tentativi configurato", async () => {
    const calls: Call[] = [];
    installClients(
      {
        physical_contents: { maybe: passwordContent },
        physical_passwords: { maybe: passwordConfig({ max_attempts: 2 }) },
        advent_days: { maybe: unlockedDay },
        password_completions: {
          maybe: { data: null, error: null },
          list: { data: [], error: null },
        },
        password_attempts: { list: { data: [], error: null, count: 2 } },
        user_openings: { list: { data: [{ day_number: 5 }], error: null } },
        user_quiz_attempts: { list: { data: [], error: null } },
      },
      calls
    );

    const result = await verifyContentPassword(user, CONTENT_ID, "Stella2026!");

    expect(result.ok).toBe(false);
    expect(result.remainingAttempts).toBe(0);
    expect(result.error).toMatch(/esaurito/i);
    expect(calls.some((call) => call.table === "password_attempts")).toBe(false);
  });

  it("non verifica password disattivate", async () => {
    installClients(
      {
        physical_contents: { maybe: passwordContent },
        physical_passwords: { maybe: passwordConfig({ is_active: false }) },
        advent_days: { maybe: unlockedDay },
      },
      []
    );

    const result = await verifyContentPassword(user, CONTENT_ID, "Stella2026!");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/non è ancora configurata/i);
  });

  it("richiede che la casella del giorno sia stata aperta", async () => {
    installClients(
      {
        physical_contents: { maybe: passwordContent },
        physical_passwords: { maybe: passwordConfig() },
        advent_days: { maybe: unlockedDay },
        password_completions: {
          maybe: { data: null, error: null },
          list: { data: [], error: null },
        },
        password_attempts: { list: { data: [], error: null, count: 0 } },
        user_openings: { list: { data: [], error: null } },
        user_quiz_attempts: { list: { data: [], error: null } },
      },
      []
    );

    const result = await verifyContentPassword(user, CONTENT_ID, "Stella2026!");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/apri prima/i);
  });

  it("non registra un secondo completamento", async () => {
    const calls: Call[] = [];
    installClients(
      {
        physical_contents: { maybe: passwordContent },
        physical_passwords: { maybe: passwordConfig() },
        advent_days: { maybe: unlockedDay },
        password_completions: {
          maybe: { data: { content_id: CONTENT_ID }, error: null },
          list: { data: [], error: null },
        },
        password_attempts: { list: { data: [], error: null, count: 1 } },
        user_openings: { list: { data: [{ day_number: 5 }], error: null } },
        user_quiz_attempts: { list: { data: [], error: null } },
      },
      calls
    );

    const result = await verifyContentPassword(user, CONTENT_ID, "Stella2026!");

    expect(result.ok).toBe(true);
    expect(result.completed).toBe(true);
    expect(calls.some((call) => call.table === "password_attempts")).toBe(false);
    expect(calls.some((call) => call.table === "password_completions")).toBe(false);
  });
});

describe("verifyQuizAnswer", () => {
  const quiz = {
    data: {
      id: QUIZ_ID,
      day_number: 5,
      question: "Chi ha spento la stella?",
      hint: "Non ancora",
      points: 4,
      is_required: true,
      is_active: true,
      unlock_conditions: {},
    },
    error: null,
  };

  const WRONG_ANSWER_ID = "66666666-6666-4666-8666-666666666666";

  const answers = {
    data: [
      {
        id: ANSWER_ID,
        quiz_id: QUIZ_ID,
        answer_text: "Il Grinch",
        is_correct: true,
        hint: "",
        sort_order: 1,
        is_active: true,
      },
      {
        id: WRONG_ANSWER_ID,
        quiz_id: QUIZ_ID,
        answer_text: "Nico",
        is_correct: false,
        hint: "",
        sort_order: 2,
        is_active: true,
      },
    ],
    error: null,
  };

  function quizTables(overrides: Record<string, Behavior> = {}) {
    return {
      quizzes: { maybe: quiz },
      quiz_answers: { list: answers },
      advent_days: { maybe: unlockedDay },
      user_openings: { list: { data: [{ day_number: 5 }], error: null } },
      user_quiz_attempts: { list: { data: [], error: null } },
      password_completions: { list: { data: [], error: null } },
      ...overrides,
    };
  }

  it("verifica la risposta corretta e assegna i punti una volta", async () => {
    const calls: Call[] = [];
    installClients(quizTables(), calls);
    mockedServer.mockResolvedValue({
      from: vi.fn(() => makeChain("user_openings", { maybe: { data: { day_number: 5 }, error: null } }, calls)),
    } as never);

    const result = await verifyQuizAnswer(user, QUIZ_ID, ANSWER_ID);

    expect(result.ok).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.points).toBe(4);
    expect(result.correctAnswerText).toBe("Il Grinch");
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "user_quiz_attempts",
          payload: expect.objectContaining({ is_correct: true }),
        }),
      ])
    );
  });

  it("non espone la risposta corretta prima della verifica", async () => {
    const calls: Call[] = [];
    installClients(quizTables(), calls);
    mockedServer.mockResolvedValue({
      from: vi.fn(() => makeChain("user_openings", { maybe: { data: { day_number: 5 }, error: null } }, calls)),
    } as never);

    const result = await verifyQuizAnswer(user, QUIZ_ID, WRONG_ANSWER_ID);

    expect(result.ok).toBe(true);
    expect(result.correct).toBe(false);
    expect(result.correctAnswerText).toBeNull();
    expect(calls.some((call) => call.table === "user_quiz_attempts")).toBe(true);
  });

  it("non registra un secondo successo né punti duplicati", async () => {
    const calls: Call[] = [];
    installClients(
      quizTables({
        user_quiz_attempts: {
          list: { data: [{ quiz_id: QUIZ_ID }], error: null },
        },
      }),
      calls
    );

    mockedServer.mockResolvedValue({
      from: vi.fn(() =>
        makeChain(
          "user_openings",
          { maybe: { data: { day_number: 5 }, error: null } },
          calls
        )
      ),
    } as never);

    const result = await verifyQuizAnswer(user, QUIZ_ID, ANSWER_ID);

    expect(result.ok).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.message).toMatch(/già completato/i);
    expect(calls.some((call) => call.table === "user_quiz_attempts")).toBe(false);
  });

  it("rifiuta un quiz disattivato", async () => {
    installClients(
      {
        quizzes: { maybe: { data: { ...quiz.data, is_active: false }, error: null } },
      },
      []
    );

    const result = await verifyQuizAnswer(user, QUIZ_ID, ANSWER_ID);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/non è disponibile/i);
  });
});

describe("verifyFinalBoxPassword", () => {
  const box = (overrides: Record<string, unknown> = {}) => ({
    data: {
      id: BOX_ID,
      password_hash: hashPassword("UltimoRegalo!"),
      password_enabled: true,
      password_hint: "Il pupazzo",
      final_message: "Era il Grinch!",
      reveal_day: 24,
      is_active: true,
      ...overrides,
    },
    error: null,
  });

  const day24 = {
    data: { day_number: 24, unlock_date: "2026-12-24T00:00:00+01:00" },
    error: null,
  };

  beforeEach(() => {
    vi.setSystemTime(new Date("2026-12-24T12:00:00Z"));
  });

  it("sblocca la scatola finale con la password corretta", async () => {
    const calls: Call[] = [];
    installClients(
      {
        final_gift_boxes: { maybe: box() },
        advent_days: { maybe: day24 },
        final_box_completions: {
          maybe: { data: null, error: null },
          list: { data: [], error: null },
        },
      },
      calls
    );

    const result = await verifyFinalBoxPassword(user, BOX_ID, "UltimoRegalo!");

    expect(result.ok).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.message).toBe("Era il Grinch!");
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "final_box_completions",
          payload: expect.objectContaining({ box_id: BOX_ID }),
        }),
      ])
    );
    expect(JSON.stringify(result)).not.toContain("scrypt");
  });

  it("rifiuta la scatola finale prima del giorno di rivelazione", async () => {
    vi.setSystemTime(new Date("2026-12-20T12:00:00Z"));
    installClients(
      {
        final_gift_boxes: { maybe: box() },
        advent_days: { maybe: day24 },
      },
      []
    );

    const result = await verifyFinalBoxPassword(user, BOX_ID, "UltimoRegalo!");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/non è ancora disponibile/i);
  });
});
