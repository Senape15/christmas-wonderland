import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Admin client using the SERVICE ROLE key.
 * Bypasses RLS – use ONLY in admin Server Actions where RLS
 * would otherwise block legitimate admin operations.
 *
 * SECURITY: this client must never be used in user-facing code paths.
 */
export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // service role client does not manage session cookies
        },
      },
    }
  );
}
