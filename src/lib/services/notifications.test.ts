import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/push/config", () => ({ isPushConfigured: vi.fn() }));
vi.mock("./capabilities", () => ({ detectPushCapabilities: vi.fn() }));

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured } from "@/lib/push/config";
import { detectPushCapabilities } from "./capabilities";
import { getNotificationOps, getNotificationOverview } from "./notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";

interface Recorded {
  table: string;
  filters: [string, unknown][];
}

const queries: Recorded[] = [];
let data: Record<string, unknown> = {};
let counts: Record<string, number> = {};

function makeClient() {
  return {
    from(table: string) {
      const query: Recorded = { table, filters: [] };
      queries.push(query);

      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          query.filters.push([column, value]);
          return chain;
        },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          const key = `${table}:maybeSingle`;
          return { data: key in data ? data[key] : null, error: null };
        },
        then: (resolve: (value: unknown) => unknown) =>
          resolve({
            data: (data[table] as unknown[]) ?? [],
            error: null,
            count: counts[table] ?? 0,
          }),
      };
      return chain;
    },
  };
}

const userA = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "a@example.com",
  role: "user",
  name: "A",
  avatar_url: null,
};

function setupReady(ready = true) {
  queries.length = 0;
  data = {};
  counts = {};
  vi.mocked(createClient).mockReset();
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(createClient).mockResolvedValue(makeClient() as never);
  vi.mocked(createAdminClient).mockResolvedValue(makeClient() as never);
  vi.mocked(requireAdmin).mockResolvedValue(userA as never);
  vi.mocked(isPushConfigured).mockReturnValue(true);
  vi.mocked(detectPushCapabilities).mockResolvedValue({
    ready,
    preferences: ready,
    subscriptions: ready,
  });
}

beforeEach(() => {
  setupReady();
});

describe("getNotificationOverview", () => {
  it("degrada ai default quando la migrazione 007 non è applicata", async () => {
    setupReady(false);
    const overview = await getNotificationOverview(userA.id);

    expect(overview.migrationReady).toBe(false);
    expect(overview.preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(overview.subscriptions).toEqual([]);
    expect(queries).toEqual([]);
  });

  it("legge solo le preferenze e i dispositivi dell'utente corrente", async () => {
    data = {
      "notification_preferences:maybeSingle": {
        user_id: userA.id,
        enabled: true,
        preferred_time: "09:00:00",
        timezone: "Europe/Rome",
      },
      notification_subscriptions: [
        {
          id: "sub-1",
          endpoint:
            "https://fcm.googleapis.com/fcm/send/abcdefghijklmnopqrstuvwxyz1234",
          platform: "web",
          user_agent: "Mozilla/5.0 (iPhone) Version/17.0 Safari/604.1",
          is_active: true,
          created_at: "2026-12-01T10:00:00.000Z",
          last_seen_at: "2026-12-02T10:00:00.000Z",
        },
      ],
    };

    const overview = await getNotificationOverview(userA.id);

    expect(overview.migrationReady).toBe(true);
    expect(overview.pushConfigured).toBe(true);
    expect(overview.preferences.preferredTime).toBe("09:00");
    expect(overview.subscriptions).toHaveLength(1);
    expect(overview.subscriptions[0].deviceLabel).toBe("iPhone · Safari");
    expect(overview.subscriptions[0].endpointHint).not.toContain(
      "abcdefghijklmnopqrstuvwxyz"
    );

    // Difesa in profondità oltre alla RLS: filtro esplicito sull'utente.
    const filtered = queries.filter((query) => query.filters.length > 0);
    expect(filtered.length).toBeGreaterThanOrEqual(2);
    for (const query of filtered) {
      expect(query.filters).toContainEqual(["user_id", userA.id]);
    }
  });

  it("non restituisce mai l'endpoint completo nel payload", async () => {
    data = {
      notification_subscriptions: [
        {
          id: "sub-1",
          endpoint: "https://push.example.com/very-secret-endpoint-9876",
          platform: "web",
          user_agent: "",
          is_active: true,
          created_at: "2026-12-01T10:00:00.000Z",
          last_seen_at: null,
        },
      ],
    };

    const overview = await getNotificationOverview(userA.id);
    expect(JSON.stringify(overview)).not.toContain("very-secret-endpoint");
  });
});

describe("getNotificationOps", () => {
  it("richiede sempre i privilegi di amministratore", async () => {
    await getNotificationOps();
    expect(requireAdmin).toHaveBeenCalledTimes(1);
  });

  it("degrada senza leggere dati quando la migrazione manca", async () => {
    setupReady(false);
    const snapshot = await getNotificationOps();

    expect(snapshot.migrationReady).toBe(false);
    expect(snapshot.scheduled).toEqual([]);
    expect(snapshot.deliveries).toEqual([]);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("riepiloga dispositivi, notifiche e ultime consegne", async () => {
    counts = { notification_subscriptions: 3, users: 2 };
    data = {
      users: [
        { id: userA.id, email: "a@example.com" },
        { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", email: "b@example.com" },
      ],
      scheduled_notifications: [
        {
          id: "notif-1",
          title: "Nuovo indizio",
          body: "Testo",
          kind: "clue",
          audience: "all",
          day_number: 5,
          scheduled_for: null,
          status: "failed",
          recipients_count: 0,
          attempts: 1,
          last_error: "Subscription scaduta",
          sent_at: null,
        },
      ],
      notification_deliveries: [
        {
          id: "delivery-1",
          notification_id: "notif-1",
          user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          kind: "clue",
          title: "Nuovo indizio",
          status: "failed",
          attempts: 1,
          error: "410 Gone",
          created_at: "2026-12-10T10:00:00.000Z",
        },
      ],
    };

    const snapshot = await getNotificationOps();

    expect(snapshot.activeSubscriptions).toBe(3);
    expect(snapshot.activeUsers).toBe(2);
    expect(snapshot.scheduled[0]).toMatchObject({
      id: "notif-1",
      kind: "clue",
      status: "failed",
      lastError: "Subscription scaduta",
    });
    expect(snapshot.deliveries[0].userEmail).toBe("b@example.com");
    expect(snapshot.lastError).toBe("410 Gone");
  });
});
