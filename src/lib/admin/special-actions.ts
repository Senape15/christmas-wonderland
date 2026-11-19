"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/admin/passwords";
import { isSimulationDateValid } from "@/lib/admin/simulation";
import { detectPhase6Capabilities } from "@/lib/services/capabilities";
import type { ActionResult } from "./actions";

function fail(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Errore sconosciuto",
  };
}

function parseJsonArray(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      throw new Error(`${label}: JSON non valido (deve essere una lista).`);
    }
  }
  return [];
}

const finalBoxSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  image_url: z.string().nullable(),
  shape: z.enum(["cube", "chest", "house", "book", "custom"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colore non valido"),
  decorations: z.unknown(),
  symbol: z.string().nullable(),
  intro_message: z.string(),
  clues: z.unknown(),
  objects: z.unknown(),
  password_enabled: z.boolean(),
  password: z.string().optional(),
  password_hint: z.string(),
  opening_sequence: z.unknown(),
  final_message: z.string(),
  reveal_day: z.coerce.number().int().min(1).max(24),
  physical_gift_id: z.union([z.string().uuid(), z.literal("")]).nullable().optional(),
  is_active: z.boolean(),
});

/** Salva la configurazione della scatola finale. La password viene hashata. */
export async function saveFinalBox(values: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const capabilities = await detectPhase6Capabilities();
    const parsed = finalBoxSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." }
    }

    const input = parsed.data;
    const passwordHash =
      input.password_enabled && input.password && input.password.length > 0
        ? hashPassword(input.password)
        : null;

    const payload = {
      name: input.name,
      description: input.description,
      image_url: input.image_url || null,
      shape: input.shape,
      color: input.color,
      decorations: parseJsonArray(input.decorations, "Decorazioni"),
      symbol: input.symbol || null,
      intro_message: input.intro_message,
      clues: parseJsonArray(input.clues, "Indizi"),
      objects: parseJsonArray(input.objects, "Oggetti"),
      password_enabled: input.password_enabled,
      ...(passwordHash ? { password_hash: passwordHash } : {}),
      password_hint: input.password_hint,
      opening_sequence: parseJsonArray(input.opening_sequence, "Sequenza di apertura"),
      final_message: input.final_message,
      reveal_day: input.reveal_day,
      is_active: input.is_active,
      ...(capabilities.ready
        ? { physical_gift_id: input.physical_gift_id || null }
        : {}),
    };

    const supabase = await createAdminClient();
    const { data: existing, error: readError } = await supabase
      .from("final_gift_boxes")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (readError) return fail(readError);

    const { error } = existing
      ? await supabase.from("final_gift_boxes").update(payload).eq("id", existing.id)
      : await supabase.from("final_gift_boxes").insert(payload);

    if (error) return fail(error);

    revalidatePath("/admin/final-box");
    revalidatePath("/admin");
    revalidatePath("/dashboard/ricordo-24");
    revalidatePath("/dashboard");
    return { ok: true, error: null };
  } catch (error) {
    return fail(error);
  }
}

const passwordSchema = z.object({
  contentId: z.string().uuid(),
  password: z.string().min(4, "La password deve avere almeno 4 caratteri."),
  hint: z.string(),
  successMessage: z.string(),
  maxAttempts: z.coerce.number().int().positive().nullable(),
  isActive: z.boolean(),
});

/** Imposta/sostituisce la password di un contenuto fisico (solo hash). */
export async function setPhysicalPassword(values: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = passwordSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." }
    }

    const input = parsed.data;
    const supabase = await createAdminClient();
    const { error } = await supabase.from("physical_passwords").upsert(
      {
        content_id: input.contentId,
        password_hash: hashPassword(input.password),
        hint: input.hint,
        success_message: input.successMessage,
        max_attempts: input.maxAttempts,
        is_active: input.isActive,
      },
      { onConflict: "content_id" }
    );

    if (error) return fail(error);

    revalidatePath("/admin/physical-contents");
    return { ok: true, error: null };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePhysicalPassword(
  contentId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("physical_passwords")
      .delete()
      .eq("content_id", contentId);
    if (error) return fail(error);

    revalidatePath("/admin/physical-contents");
    return { ok: true, error: null };
  } catch (error) {
    return fail(error);
  }
}

const simulationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida").nullable(),
  note: z.string(),
  active: z.boolean(),
});

/**
 * Salva la simulazione per l'admin corrente.
 * NON tocca advent_days, user_openings né alcun dato reale dell'esperienza.
 */
export async function saveSimulation(values: unknown): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = simulationSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." }
    }
    if (parsed.data.active) {
      if (!parsed.data.date || !isSimulationDateValid(parsed.data.date)) {
        return { ok: false, error: "Data di simulazione non valida." };
      }
    }

    const supabase = await createAdminClient();
    const { error } = await supabase.from("admin_date_simulations").upsert(
      {
        admin_id: user.id,
        simulated_date: parsed.data.active ? parsed.data.date : null,
        note: parsed.data.note,
        is_active: parsed.data.active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admin_id" }
    );

    if (error) return fail(error);

    revalidatePath("/admin/simulation");
    return { ok: true, error: null };
  } catch (error) {
    return fail(error);
  }
}

/** Cambia ruolo applicativo. Vieta esplicitamente la auto-dismissione. */
export async function setUserRole(
  userId: string,
  role: "admin" | "user"
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (role !== "admin" && role !== "user") {
      return { ok: false, error: "Ruolo non valido." };
    }
    if (admin.id === userId && role !== "admin") {
      return { ok: false, error: "Non puoi rimuovere il tuo stesso ruolo admin." };
    }

    const parsedId = z.string().uuid().safeParse(userId);
    if (!parsedId.success) return { ok: false, error: "ID utente non valido." }

    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId);

    if (error) return fail(error);

    revalidatePath("/admin/users");
    return { ok: true, error: null };
  } catch (error) {
    return fail(error);
  }
}

export async function clearSimulation(): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("admin_date_simulations")
      .delete()
      .eq("admin_id", user.id);
    if (error) return fail(error);

    revalidatePath("/admin/simulation");
    return { ok: true, error: null };
  } catch (error) {
    return fail(error);
  }
}
