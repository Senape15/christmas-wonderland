"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emptyFieldValue, getResource } from "@/lib/admin/resources";
import { reportServerError } from "@/lib/server-error";
import { pickAllowedValues, validateAdminValues } from "@/lib/admin/validation";
import {
  detectPhase6Capabilities,
  detectPushCapabilities,
} from "@/lib/services/capabilities";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error: string | null;
  data?: T;
}

function fail<T = undefined>(error: unknown): ActionResult<T> {
  // Gli errori Supabase/PostgREST sono oggetti semplici, non istanze di Error:
  // l'helper li registra sul server e restituisce il messaggio reale.
  return { ok: false, error: reportServerError("admin/actions", error) };
}

function revalidate(resourceKey: string) {
  revalidatePath(`/admin/${resourceKey}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

/** Risorse che non possono essere eliminate dall'UI amministrativa. */
const PROTECTED_FROM_DELETE = new Set([
  "users",
  "advent_days",
  "village_locations",
]);

export async function adminSave(
  resourceKey: string,
  id: string | null,
  values: Record<string, unknown>
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const capabilities = await detectPhase6Capabilities();
    if (resourceKey === "memory_entries" && !capabilities.ready) {
      return {
        ok: false,
        error: "Esegui prima la migrazione 006_memories_and_collections.sql.",
      };
    }
    const resource = getResource(resourceKey, {
      phase6: capabilities.ready,
      phase7:
        resourceKey === "scheduled_notifications"
          ? (await detectPushCapabilities()).ready
          : false,
    });
    if (!resource) return { ok: false, error: "Risorsa non valida." }

    const parsed = validateAdminValues(resource, values);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "valore"}: ${issue.message}`)
          .join("; "),
      };
    }

    const allowed = pickAllowedValues(resource, parsed.data);
    const payload: Record<string, unknown> = {};

    for (const field of resource.fields) {
      if (!(field.name in allowed)) continue;
      const value = allowed[field.name];
      if (value === undefined) continue;

      // Le colonne NOT NULL rifiutano un NULL esplicito (form vuoto o client
      // datato): il vuoto assume il valore dichiarato nel campo.
      if (value === null || value === "") {
        payload[field.name] = emptyFieldValue(field);
        continue;
      }

      if (field.type === "json" && typeof value === "string") {
        try {
          payload[field.name] = JSON.parse(value);
        } catch {
          return { ok: false, error: `JSON non valido in ${field.label}.` };
        }
      } else {
        payload[field.name] = value;
      }
    }

    const supabase = await createAdminClient();
    const { error } = id
      ? await supabase.from(resourceKey).update(payload).eq("id", id)
      : await supabase.from(resourceKey).insert(payload);

    if (error) return fail(error);

    revalidate(resourceKey);
    return { ok: true, error: null };
  } catch (error) {
    return fail(error);
  }
}

export async function adminDelete(
  resourceKey: string,
  id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const capabilities = await detectPhase6Capabilities();
    if (resourceKey === "memory_entries" && !capabilities.ready) {
      return {
        ok: false,
        error: "Esegui prima la migrazione 006_memories_and_collections.sql.",
      };
    }
    if (!getResource(resourceKey, { phase6: capabilities.ready })) {
      return { ok: false, error: "Risorsa non valida." }
    }
    if (PROTECTED_FROM_DELETE.has(resourceKey)) {
      return {
        ok: false,
        error: "Questa risorsa non può essere eliminata dal pannello amministrativo.",
      };
    }

    const supabase = await createAdminClient();
    const { error } = await supabase.from(resourceKey).delete().eq("id", id);
    if (error) return fail(error);

    revalidate(resourceKey);
    return { ok: true, error: null };
  } catch (error) {
    return fail(error);
  }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function uploadAdminImage(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  try {
    await requireAdmin();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Seleziona un'immagine." };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: "L'immagine supera 5 MB." };
    }
    const extension = MIME_EXTENSIONS[file.type];
    if (!extension) {
      return { ok: false, error: "Formato non supportato (JPEG, PNG, WebP, GIF, SVG)." };
    }

    const supabase = await createAdminClient();
    const path = `admin/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("wonderland-media")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) return fail(error);

    const { data } = supabase.storage.from("wonderland-media").getPublicUrl(path);
    return { ok: true, error: null, data: { url: data.publicUrl, path } };
  } catch (error) {
    return fail(error);
  }
}
