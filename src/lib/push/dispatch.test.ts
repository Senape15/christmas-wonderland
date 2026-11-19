import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("./config", () => ({ readVapidConfig: vi.fn() }));

import * as webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { readVapidConfig } from "./config";
import { sendTestNotificationToUser } from "./dispatch";

interface SubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  is_active: boolean;
}

interface DeliveryRecord {
  id: string;
  dedupe_key: string;
  status: string;
  attempts: number;
  updated_at: string;
  [key: string]: unknown;
}

let subscriptions: SubscriptionRecord[] = [];
let deliveries: DeliveryRecord[] = [];
let sequence = 0;

function makeClient() {
  return {
    from(table: string) {
      if (table === "notification_subscriptions") {
        const filters: [string, unknown][] = [];
        const selectChain: Record<string, unknown> = {
          eq: (column: string, value: unknown) => {
            filters.push([column, value]);
            return selectChain;
          },
          then: (resolve: (value: unknown) => unknown) => {
            const rows = subscriptions.filter((row) =>
              filters.every(
                ([column, value]) =>
                  (row as unknown as Record<string, unknown>)[column] === value
              )
            );
            return resolve({ data: rows, error: null });
          },
        };

        return {
          select: () => selectChain,
          update: (values: Record<string, unknown>) => ({
            eq: async (column: string, value: unknown) => {
              const row = subscriptions.find(
                (item) =>
                  (item as unknown as Record<string, unknown>)[column] === value
              );
              if (row) Object.assign(row, values);
              return { error: null };
            },
          }),
        };
      }

      if (table === "notification_deliveries") {
        return {
          insert: (values: Record<string, unknown>) => ({
            select: () => ({
              maybeSingle: async () => {
                const duplicate = deliveries.find(
                  (row) => row.dedupe_key === values.dedupe_key
                );
                if (duplicate) {
                  return {
                    data: null,
                    error: { code: "23505", message: "duplicate key value" },
                  };
                }
                sequence += 1;
                const row: DeliveryRecord = {
                  ...(values as unknown as DeliveryRecord),
                  id: `delivery-${sequence}`,
                  updated_at: new Date().toISOString(),
                };
                deliveries.push(row);
                return { data: { id: row.id }, error: null };
              },
            }),
          }),
          select: () => ({
            eq: (column: string, value: unknown) => ({
              maybeSingle: async () => ({
                data:
                  deliveries.find(
                    (row) =>
                      (row as unknown as Record<string, unknown>)[column] === value
                  ) ?? null,
                error: null,
              }),
            }),
          }),
          update: (values: Record<string, unknown>) => ({
            eq: async (column: string, value: unknown) => {
              const row = deliveries.find(
                (item) =>
                  (item as unknown as Record<string, unknown>)[column] === value
              );
              if (row) Object.assign(row, values);
              return { error: null };
            },
          }),
        };
      }

      throw new Error(`Tabella non attesa: ${table}`);
    },
  };
}

const NOW = new Date("2026-12-10T12:00:00.000Z");

beforeEach(() => {
  subscriptions = [
    {
      id: "sub-1",
      user_id: "user-1",
      endpoint: "https://push.example.com/endpoint-1",
      keys_p256dh: "p256dh-key",
      keys_auth: "auth-key",
      is_active: true,
    },
  ];
  deliveries = [];
  sequence = 0;

  vi.mocked(createAdminClient).mockResolvedValue(makeClient() as never);
  vi.mocked(readVapidConfig).mockReturnValue({
    publicKey: "public-key",
    privateKey: "private-key",
    subject: "mailto:test@example.com",
  });
  vi.mocked(webpush.sendNotification).mockReset();
  vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
});

describe("sendTestNotificationToUser", () => {
  it("non invia nulla senza chiavi VAPID configurate", async () => {
    vi.mocked(readVapidConfig).mockReturnValue(null);

    const result = await sendTestNotificationToUser("user-1", NOW);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("VAPID");
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("invia la prova solo ai dispositivi attivi dell'utente indicato", async () => {
    subscriptions.push({
      id: "sub-2",
      user_id: "user-2",
      endpoint: "https://push.example.com/endpoint-2",
      keys_p256dh: "p256dh-key",
      keys_auth: "auth-key",
      is_active: true,
    });

    const result = await sendTestNotificationToUser("user-1", NOW);

    expect(result.ok).toBe(true);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    const [target, payload] = vi.mocked(webpush.sendNotification).mock.calls[0];
    expect((target as { endpoint: string }).endpoint).toBe(
      "https://push.example.com/endpoint-1"
    );
    expect(JSON.parse(payload as string)).toMatchObject({
      title: expect.stringContaining("Prova"),
      url: "/dashboard/impostazioni",
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe("sent");
  });

  it("è idempotente: la stessa prova non viene consegnata due volte", async () => {
    const first = await sendTestNotificationToUser("user-1", NOW);
    const second = await sendTestNotificationToUser("user-1", NOW);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(deliveries).toHaveLength(1);
  });

  it("disattiva la subscription scaduta (404/410)", async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue({
      statusCode: 410,
      message: "Gone",
    });

    const result = await sendTestNotificationToUser("user-1", NOW);

    expect(result.ok).toBe(false);
    expect(subscriptions[0].is_active).toBe(false);
    expect(deliveries[0].status).toBe("failed");
  });

  it("registra l'errore senza ritentare subito dopo un fallimento", async () => {
    const failure = Object.assign(new Error("Errore provider"), { statusCode: 500 });
    vi.mocked(webpush.sendNotification).mockRejectedValue(failure);

    const first = await sendTestNotificationToUser("user-1", NOW);
    const second = await sendTestNotificationToUser("user-1", NOW);

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(deliveries[0].status).toBe("failed");
    expect(deliveries[0].error).toContain("Errore provider");
  });

  it("segnala l'assenza di dispositivi attivi", async () => {
    subscriptions = [];

    const result = await sendTestNotificationToUser("user-1", NOW);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Nessun dispositivo");
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
});
