import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/push/auth";
import { readVapidConfig } from "@/lib/push/config";
import { runNotificationCycle } from "@/lib/push/dispatch";

/**
 * Endpoint di scheduler per le notifiche.
 *
 * Va richiamato da un cron esterno (Supabase pg_cron + pg_net, GitHub Actions,
 * cron-job.org, ...) con:
 *   POST /api/push/cron
 *   Authorization: Bearer <PUSH_SCHEDULER_SECRET>
 *
 * Senza segreto configurato risponde 503: non esiste un percorso non
 * autenticato per inviare notifiche.
 */

export async function POST(request: Request) {
  const auth = authorizeCronRequest(
    request.headers,
    process.env.PUSH_SCHEDULER_SECRET
  );

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  if (!readVapidConfig()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Chiavi VAPID non configurate: il delivery Web Push è disattivato.",
      },
      { status: 503 }
    );
  }

  try {
    const summary = await runNotificationCycle();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[push] Ciclo notifiche fallito", {
      message: error instanceof Error ? error.message : "errore sconosciuto",
    });
    return NextResponse.json(
      { ok: false, error: "Ciclo notifiche fallito. Controlla i log del server." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json(
    { ok: false, error: "Metodo non consentito: usa POST con il segreto scheduler." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
