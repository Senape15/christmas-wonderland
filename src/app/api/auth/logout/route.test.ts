import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn(() => ({ cookies: { delete: vi.fn() } })),
  },
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GET } from "./route";

const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
const from = vi.fn(() => ({ update }));
const signOut = vi.fn(async () => ({ error: null }));
const getUser = vi.fn(
  async (): Promise<{ data: { user: { id: string } | null } }> => ({
    data: { user: { id: "user-1" } },
  })
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser, signOut },
  } as never);
  vi.mocked(createAdminClient).mockResolvedValue({ from } as never);
});

describe("GET /api/auth/logout", () => {
  it("disattiva le subscription push prima di chiudere la sessione", async () => {
    await GET({ url: "http://localhost:3000/api/auth/logout" } as never);

    expect(from).toHaveBeenCalledWith("notification_subscriptions");
    expect(update).toHaveBeenCalledWith({ is_active: false });
    expect(getUser).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it("non usa la service role se non c'è un utente autenticato", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });

    await GET({ url: "http://localhost:3000/api/auth/logout" } as never);

    expect(createAdminClient).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });
});
