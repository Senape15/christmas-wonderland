import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin client using the SERVICE ROLE key.
 * Bypasses RLS – use ONLY in server-only code where RLS would otherwise block
 * legitimate operations (admin actions, delivery logging, verified reads).
 *
 * IMPORTANT: this must NOT be built with `createServerClient` from
 * `@supabase/ssr`: that helper loads the session from the request cookies, and
 * supabase-js then sends the user's JWT as `Authorization` instead of the
 * service role key. RLS is enforced again and inserts into tables with no user
 * write policy (such as `notification_deliveries`) fail with
 * "new row violates row-level security policy".
 *
 * SECURITY: this client must never be used in user-facing code paths.
 */
export async function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}
