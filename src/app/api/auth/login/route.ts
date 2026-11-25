import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Accesso con form nativo: funziona anche se il bundle client non è pronto
 * (PWA installata, cache o hydratation lenta). Il client JS continua a usare
 * la sua funzione, ma l'action qui garantisce il login in ogni caso.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(
      new URL("/login?error=Dati%20di%20accesso%20mancanti", request.url),
      { status: 303 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
      { status: 303 }
    );
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), {
    status: 303,
  });
}
