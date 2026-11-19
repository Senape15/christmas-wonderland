import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveAppRole } from "@/lib/role";
import type { UserRole } from "@/types/auth";

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  avatar_url: string | null;
}

/**
 * Data Access Layer – single place where the session is read.
 * Returns the authenticated user with profile, or null.
 *
 * connection() marks this as request-time dynamic: with cacheComponents
 * enabled in Next.js 16, it prevents Date.now() (called internally by
 * Supabase's JWT validation) from being evaluated during prerendering,
 * which would otherwise throw "unstable value Date.now() while prerendering".
 *
 * Wrapped in React cache(): the dashboard layout and page both call
 * requireUser() during the same request, so the session is read only once.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("name, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    // Il profilo è opzionale: segnaliamo l'errore ma non blocchiamo l'accesso.
    console.error("[auth] Lettura user_profiles fallita", {
      userId: user.id,
      message: profileError.message,
      code: profileError.code,
    });
  }

  // Ruolo dalla tabella applicazione (mirror di auth.users).
  // Nessun fallback a "user": un errore RLS o una riga mancante deve
  // apparire esplicitamente, non trasformarsi in un falso ruolo utente.
  const { data: appUser, error: roleError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  const role = resolveAppRole(user.id, appUser, roleError);

  return {
    id: user.id,
    email: user.email ?? "",
    role,
    name: profile?.name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  };
});

/**
 * Require an authenticated user; redirects to /login otherwise.
 * Use at the top of protected Server Components / Server Actions.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require an admin user; redirects otherwise.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
