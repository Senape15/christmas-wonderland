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

const supabase = {
  from: () => ({
    insert: (values: Record<string, unknown>) => {
      inserted = values;
      return Promise.resolve({ error: null });
    },
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }),
};

beforeEach(() => {
  inserted = null;
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
      day_number: null,
    });

    expect(result).toEqual({ ok: true, error: null });
    expect(inserted).toMatchObject({
      title: "Promemoria",
      body: "Testo",
      kind: "special",
      audience: "all",
      url: "/dashboard",
    });
    expect(inserted).not.toHaveProperty("status");
  });
});
