import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/services/capabilities", () => ({
  detectPushCapabilities: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { detectPushCapabilities } from "@/lib/services/capabilities";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  registerPushSubscription,
  removeAllPushSubscriptions,
  removePushSubscription,
  removePushSubscriptionById,
  saveNotificationPreferences,
} from "./actions";

const userA = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "a@example.com",
  role: "user" as const,
  name: "A",
  avatar_url: null,
};

interface Operation {
  type: "upsert" | "delete";
  table: string;
  values?: Record<string, unknown>;
  options?: Record<string, unknown>;
  filters: [string, unknown][];
}

let operations: Operation[] = [];

function makeClient() {
  return {
    from(table: string) {
      const filters: [string, unknown][] = [];

      const deleteChain: Record<string, unknown> = {
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return deleteChain;
        },
        then: (resolve: (value: unknown) => unknown) => {
          operations.push({ type: "delete", table, filters: [...filters] });
          return resolve({ error: null });
        },
      };

      return {
        upsert: async (
          values: Record<string, unknown>,
          options?: Record<string, unknown>
        ) => {
          operations.push({ type: "upsert", table, values, options, filters: [] });
          return { error: null };
        },
        delete: () => deleteChain,
      };
    },
  };
}

const validPreferences = {
  enabled: true,
  dailyReminders: true,
  reminder: true,
  clues: true,
  quizzes: true,
  special: true,
  finale: true,
  preferredTime: "09:15",
  quietHoursStart: "22:30",
  quietHoursEnd: "06:30",
};

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/endpoint-123456789",
  keys: {
    p256dh: "BKx7YQ9m2p8p3kL4nR5tV6wX7yZ8aB9cD0eF1gH2iJ3kL4mN5oP6qR7sT8uV9wX",
    auth: "auth-secret-123456",
  },
};

beforeEach(() => {
  operations = [];
  vi.mocked(requireUser).mockResolvedValue(userA as never);
  vi.mocked(createClient).mockResolvedValue(makeClient() as never);
  vi.mocked(detectPushCapabilities).mockResolvedValue({
    ready: true,
    preferences: true,
    subscriptions: true,
  });
  vi.mocked(headers).mockResolvedValue(
    new Headers({ "user-agent": "Mozilla/5.0 (Linux; Android 14) Chrome/120" }) as never
  );
  vi.mocked(revalidatePath).mockReset();
});

describe("saveNotificationPreferences", () => {
  it("salva le preferenze dell'utente della sessione", async () => {
    const result = await saveNotificationPreferences(validPreferences);

    expect(result.ok).toBe(true);
    const upsert = operations.find((op) => op.table === "notification_preferences");
    expect(upsert?.type).toBe("upsert");
    expect(upsert?.values).toMatchObject({
      user_id: userA.id,
      preferred_time: "09:15",
      quiet_hours_start: "22:30",
      quiet_hours_end: "06:30",
      timezone: "Europe/Rome",
    });
    expect(upsert?.options).toEqual({ onConflict: "user_id" });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/impostazioni");
  });

  it("rifiuta un orario non valido senza scrivere", async () => {
    const result = await saveNotificationPreferences({
      ...validPreferences,
      preferredTime: "25:00",
    });

    expect(result.ok).toBe(false);
    expect(operations).toEqual([]);
  });

  it("rifiuta campi non dichiarati (incluso user_id estraneo)", async () => {
    const result = await saveNotificationPreferences({
      ...validPreferences,
      user_id: "utente-estraneo",
    });

    expect(result.ok).toBe(false);
    expect(operations).toEqual([]);
  });

  it("non scrive se la migrazione 007 non è applicata", async () => {
    vi.mocked(detectPushCapabilities).mockResolvedValue({
      ready: false,
      preferences: false,
      subscriptions: false,
    });

    const result = await saveNotificationPreferences(validPreferences);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("007_push_notifications.sql");
    expect(operations).toEqual([]);
  });
});

describe("registerPushSubscription", () => {
  it("associa la subscription all'utente autenticato, mai a un id del client", async () => {
    const result = await registerPushSubscription(validSubscription);

    expect(result.ok).toBe(true);
    const upsert = operations.find(
      (op) => op.table === "notification_subscriptions"
    );
    expect(upsert?.values).toMatchObject({
      user_id: userA.id,
      endpoint: validSubscription.endpoint,
      keys_p256dh: validSubscription.keys.p256dh,
      keys_auth: validSubscription.keys.auth,
      is_active: true,
    });
    expect(upsert?.values?.user_agent).toContain("Android");
    expect(upsert?.options).toEqual({ onConflict: "user_id,endpoint" });
  });

  it("rifiuta una subscription malformata", async () => {
    const result = await registerPushSubscription({
      endpoint: "non-un-url",
      keys: { p256dh: "x", auth: "y" },
    });

    expect(result.ok).toBe(false);
    expect(operations).toEqual([]);
  });

  it("ignora un eventuale user_id inviato dal client", async () => {
    const result = await registerPushSubscription({
      ...validSubscription,
      user_id: "utente-estraneo",
    });

    expect(result.ok).toBe(false);
    expect(operations).toEqual([]);
  });
});

describe("rimozione dei dispositivi", () => {
  it("rimuove solo la subscription dell'utente e dell'endpoint indicato", async () => {
    const result = await removePushSubscription({
      endpoint: validSubscription.endpoint,
    });

    expect(result.ok).toBe(true);
    const deletion = operations.find((op) => op.type === "delete");
    expect(deletion?.table).toBe("notification_subscriptions");
    expect(deletion?.filters).toEqual([
      ["user_id", userA.id],
      ["endpoint", validSubscription.endpoint],
    ]);
  });

  it("rimuove per id senza permettere di toccare altri utenti", async () => {
    const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const result = await removePushSubscriptionById(id);

    expect(result.ok).toBe(true);
    const deletion = operations.find((op) => op.type === "delete");
    expect(deletion?.filters).toEqual([
      ["user_id", userA.id],
      ["id", id],
    ]);
  });

  it("la disattivazione completa elimina tutti i dispositivi dell'utente", async () => {
    const result = await removeAllPushSubscriptions();

    expect(result.ok).toBe(true);
    const deletion = operations.find((op) => op.type === "delete");
    expect(deletion?.filters).toEqual([["user_id", userA.id]]);
  });

  it("rifiuta un id non valido", async () => {
    const result = await removePushSubscriptionById("non-un-uuid");
    expect(result.ok).toBe(false);
    expect(operations).toEqual([]);
  });
});
