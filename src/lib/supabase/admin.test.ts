import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createAdminClient } from "./admin";

describe("createAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    vi.mocked(createClient).mockReturnValue({} as never);
  });

  it("usa la chiave service role senza ereditare la sessione dai cookie", async () => {
    await createAdminClient();

    expect(cookies).not.toHaveBeenCalled();
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_secret_test",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        }),
      })
    );
  });
});
