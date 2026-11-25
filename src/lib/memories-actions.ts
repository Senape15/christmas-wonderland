"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { openMemorySphere } from "@/lib/services/memories";
import type { SphereOpenResult } from "@/types/memories";

const sphereSchema = z.object({
  sphereId: z.string().uuid("Identificativo della sfera non valido."),
});

/**
 * Apertura di una sfera della memoria.
 *
 * L'utente arriva dalla sessione; id e condizioni sono verificati nel servizio
 * server-only. Nessuna scrittura client è consentita sulle sfere.
 */
export async function openMemorySphereAction(input: {
  sphereId: string;
}): Promise<SphereOpenResult> {
  const parsed = sphereSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Richiesta non valida.",
      sphere: null,
    };
  }

  try {
    const user = await requireUser();
    const result = await openMemorySphere(user, parsed.data.sphereId);
    if (result.ok) {
      revalidatePath("/dashboard/ricordi");
      revalidatePath("/dashboard/ricordo-24");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Non è stato possibile aprire la sfera.",
      sphere: null,
    };
  }
}
