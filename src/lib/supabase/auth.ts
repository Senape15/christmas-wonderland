import { createClient } from "@/lib/supabase/server";

/**
 * Server-side user management helpers.
 * All functions assume the caller is already authenticated;
 * role checks belong to requireUser()/requireAdmin() or RLS.
 */

/**
 * Create the app-level users row + profile for a freshly
 * registered Supabase Auth user.
 * Normally this is done by the DB trigger `on_auth_user_created`;
 * this fallback is used when the trigger is not installed.
 */
export async function createUserRecord({
  userId,
  email,
  role = "user",
}: {
  userId: string;
  email: string;
  role?: "admin" | "user";
}) {
  const supabase = await createClient();

  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    email,
    role,
  });

  if (userError) throw userError;

  const { error: profileError } = await supabase.from("user_profiles").insert({
    user_id: userId,
    name: email.split("@")[0],
  });

  if (profileError) throw profileError;

  return { userId, email, role };
}
