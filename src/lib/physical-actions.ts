"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { verifyContentPassword } from "@/lib/services/verification";

/**
 * Compatibilità Fase 4 → Fase 5.
 *
 * La verifica delle password fisiche vive ora in un unico punto
 * (`verifyContentPassword`), usato sia da questa azione sia dal nuovo flusso
 * dell'esperienza quotidiana. Restano invariati:
 *  - controllo della data di sblocco lato server;
 *  - lettura dell'hash solo con il client service role;
 *  - registrazione di tentativi e completamenti;
 *  - limite dei tentativi configurato dall'admin.
 */
export interface PasswordResult {
  ok: boolean;
  error: string | null;
  message: string | null;
}

const schema = z.object({
  contentId: z.string().uuid(),
  password: z.string().min(1).max(200),
});

export async function submitPhysicalPassword(
  contentId: string,
  password: string
): Promise<PasswordResult> {
  const parsed = schema.safeParse({ contentId, password });
  if (!parsed.success) {
    return { ok: false, error: "Dati non validi.", message: null };
  }

  const user = await requireUser();
  const result = await verifyContentPassword(
    user,
    parsed.data.contentId,
    parsed.data.password
  );

  return {
    ok: result.ok,
    error: result.error,
    message: result.message,
  };
}
