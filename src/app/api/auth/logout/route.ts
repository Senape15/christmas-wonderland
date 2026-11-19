import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Anche il logout via link/API deve disattivare i dispositivi push:
  // il pulsante dell'UI lo fa lato client, ma questa route è un altro
  // punto di uscita e non deve lasciare subscription attive.
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    try {
      const admin = await createAdminClient();
      await admin
        .from("notification_subscriptions")
        .update({ is_active: false })
        .eq("user_id", data.user.id);
    } catch {
      // Un errore delle notifiche non deve mai bloccare il logout.
    }
  }

  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("sb-access-token");
  response.cookies.delete("sb-refresh-token");
  return response;
}
