import { createClient } from "@/lib/supabase/server";

export async function getDb() {
  return createClient();
}

export type SupabaseClient = ReturnType<typeof createClient>;
