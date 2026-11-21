import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/services/capabilities", () => ({
  detectPhase6Capabilities: vi.fn(),
  detectPushCapabilities: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { detectPhase6Capabilities, detectPushCapabilities } from "@/lib/services/capabilities";
import { adminSave } from "./actions";

let inserted: Record<string, unknown> | null = null;
let insertError: unknown = null;

const supabase = {
  from: () => ({
    insert: (values: Record<string, unknown>) => {
      inserted = values;
      return Promise.resolve({ error: insertError });
    },
    update: () => ({ eq: () => Promise.resolve({ error: insertError }) }),
  }),
};

beforeEach(() => {
  inserted = null;
  insertError = null;
  vi.mocked(createAdminClient).mockResolvedValue(supabase as never);
  vi.mocked(detectPhase6Capabilities).mockResolvedValue({
    ready: true,
    memoryEntries: true,
    diaryEvents: true,
    collectibleMetadata: true,
    sphereDiscoveryTimestamps: true,
    finalBoxGiftLink: true,
  });
  vi.mocked(detectPushCapabilities).mockResolvedValue({
    ready: true,
    preferences: true,
    subscriptions: true,
  });
});

describe("adminSave", () => {
  it("sostituisce i NULL dei campi con default DB prima dell'INSERT", async () => {
    const result = await adminSave("scheduled_notifications", null, {
      title: "Promemoria",
      body: "Testo",
      kind: "special",
      audience: null,
      url: null,
      conditions: null,
      dedupe_key: "",
      day_number: null,
    });

    expect(result).toEqual({ ok: true, error: null });
    expect(inserted).toMatchObject({
      title: "Promemoria",
      body: "Testo",
      kind: "special",
      audience: "all",
      url: "/dashboard",
      conditions: {},
      // L'indice univoco parziale su dedupe_key non tollera la stringa vuota.
      dedupe_key: null,
    });
    expect(inserted).not.toHaveProperty("status");
  });

  it("converte i testi vuoti in stringa vuota, non in NULL", async () => {
    const result = await adminSave("advent_days", null, {
      day_number: 1,
      title: "Giorno 1",
      description: null,
      unlock_date: "2026-12-01T00:00:00Z",
    });

    expect(result).toEqual({ ok: true, error: null });
    expect(inserted).toMatchObject({ day_number: 1, description: "" });
  });

  it("restituisce il messaggio reale degli errori Supabase (oggetti semplici)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    insertError = {
      code: "23502",
      message:
        'null value in column "conditions" of relation "scheduled_notifications" violates not-null constraint',
    };

    const result = await adminSave("scheduled_notifications", null, {
      title: "Promemoria",
      body: "Testo",
      kind: "special",
      audience: "all",
      url: "/dashboard",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("null value in column");
    expect(log).toHaveBeenCalledWith(
      "[admin/actions] errore originale",
      expect.objectContaining({ code: "23502" })
    );
  });
});
