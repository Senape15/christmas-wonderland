import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  currentPassword: z.string().min(1, "Inserisci la password attuale"),
  newPassword: z
    .string()
    .min(8, "La nuova password deve avere almeno 8 caratteri"),
  confirmPassword: z.string().min(1, "Conferma la nuova password"),
});

/** Cambio password dell'utente autenticato, con verifica della password attuale. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const parsed = schema.safeParse({
    currentPassword: form.get("currentPassword"),
    newPassword: form.get("newPassword"),
    confirmPassword: form.get("confirmPassword"),
  });

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/dashboard/impostazioni?passwordError=${encodeURIComponent(message)}`,
        request.url
      ),
      { status: 303 }
    );

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dati non validi");
  }
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return fail("Le nuove password non corrispondono");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return fail("Sessione scaduta: accedi di nuovo.");
  }

  // Ri-autentichiamo con la password attuale prima di sostituirla.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return fail("La password attuale non è corretta.");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    return fail(error.message);
  }

  return NextResponse.redirect(
    new URL("/dashboard/impostazioni?passwordUpdated=1", request.url),
    { status: 303 }
  );
}
