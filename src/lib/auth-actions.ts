"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createUserRecord } from "@/lib/supabase/auth";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Nome troppo corto" }),
  email: z.string().email({ message: "Email non valida" }),
  password: z
    .string()
    .min(8, { message: "La password deve avere almeno 8 caratteri" }),
  confirmPassword: z.string(),
});

export interface RegisterState {
  error: string | null;
  ok: boolean;
}

/**
 * Server Action: registration with server-side validation.
 * Creates the Supabase Auth user and the app-level users + user_profiles rows.
 */
export async function register(
  _prev: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
      ok: false,
    };
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Le password non corrispondono", ok: false };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });

  if (error) {
    return { error: error.message, ok: false };
  }

  if (!data.user) {
    return { error: "Registrazione non riuscita", ok: false };
  }

  try {
    await createUserRecord({
      userId: data.user.id,
      email: parsed.data.email,
      role: "user",
    });
  } catch {
    // If the profile creation fails, roll back the auth user where possible
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    return {
      error: "Impossibile creare il profilo. Riprova.",
      ok: false,
    };
  }

  return { error: null, ok: true };
}
