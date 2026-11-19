"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminRunNotificationCycle,
  adminSendNotificationNow,
  adminSendTestNotification,
} from "@/lib/push/admin-actions";
import { cn } from "@/lib/utils";
import type {
  AdminSendResult,
} from "@/lib/push/admin-actions";
import type { NotificationOpsSnapshot } from "@/types/notifications";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-pine-600/25 text-pine-200",
  pending: "bg-gold/15 text-gold-light",
  sending: "bg-gold/15 text-gold-light",
  failed: "bg-christmas-red/20 text-christmas-red-light",
  skipped: "bg-cream-300/10 text-cream-200/70",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[status] ?? STATUS_STYLES.skipped
      )}
    >
      {status}
    </span>
  );
}

export function NotificationConsole({
  snapshot,
}: {
  snapshot: NotificationOpsSnapshot;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  );

  const run = async (key: string, action: () => Promise<AdminSendResult>) => {
    setBusy(key);
    setFeedback(null);
    try {
      const result = await action();
      setFeedback({
        tone: result.ok ? "success" : "error",
        text:
          result.message ||
          result.error ||
          (result.ok ? "Operazione completata." : "Operazione non riuscita."),
      });
      if (result.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null || !snapshot.migrationReady;

  return (
    <section className="space-y-5 rounded-2xl border border-cream-300/15 bg-pine-900/40 p-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-cream-50">
          Invio e stato delle notifiche
        </h2>
        <p className="mt-1 text-sm text-cream-200/60">
          Il ciclo può essere eseguito manualmente qui o richiamato dallo
          scheduler esterno su <code className="rounded bg-pine-950/60 px-1">POST /api/push/cron</code>.
        </p>
      </div>

      {!snapshot.migrationReady && (
        <p
          role="status"
          className="rounded-xl border border-ice-300/35 bg-ice-900/40 px-4 py-3 text-sm text-ice-200"
        >
          Esegui la migrazione{" "}
          <code className="rounded bg-pine-950/60 px-1">007_push_notifications.sql</code>{" "}
          per attivare preferenze, stato e log di consegna.
        </p>
      )}

      {snapshot.migrationReady && !snapshot.pushConfigured && (
        <p
          role="status"
          className="rounded-xl border border-christmas-red/40 bg-christmas-red/10 px-4 py-3 text-sm text-cream-100"
        >
          <strong className="font-semibold">Delivery disattivato:</strong> imposta{" "}
          <code className="rounded bg-pine-950/60 px-1">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>,{" "}
          <code className="rounded bg-pine-950/60 px-1">VAPID_PRIVATE_KEY</code> e{" "}
          <code className="rounded bg-pine-950/60 px-1">VAPID_SUBJECT</code>. Nessuna
          notifica verrà inviata finché mancano.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-cream-300/10 bg-pine-950/40 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-cream-200/45">
            Dispositivi attivi
          </p>
          <p className="mt-1 text-2xl font-semibold text-gold-light">
            {snapshot.activeSubscriptions}
          </p>
        </div>
        <div className="rounded-xl border border-cream-300/10 bg-pine-950/40 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-cream-200/45">
            Utenti registrati
          </p>
          <p className="mt-1 text-2xl font-semibold text-gold-light">
            {snapshot.activeUsers}
          </p>
        </div>
        <div className="rounded-xl border border-cream-300/10 bg-pine-950/40 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-cream-200/45">
            VAPID
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              snapshot.pushConfigured ? "text-pine-200" : "text-christmas-red-light"
            )}
          >
            {snapshot.pushConfigured ? "Configurate" : "Mancanti"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run("cycle", adminRunNotificationCycle)}
          disabled={disabled}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-pine-950 hover:bg-gold-light disabled:opacity-50"
        >
          {busy === "cycle" ? "Ciclo in corso…" : "Esegui ciclo di invio"}
        </button>
        <button
          type="button"
          onClick={() => run("test", adminSendTestNotification)}
          disabled={disabled || !snapshot.pushConfigured}
          className="rounded-lg border border-cream-300/25 px-4 py-2 text-sm text-cream-100 hover:bg-cream-50/10 disabled:opacity-50"
        >
          {busy === "test" ? "Invio…" : "Invia notifica di prova a me"}
        </button>
      </div>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            feedback.tone === "success"
              ? "border-pine-300/40 bg-pine-700/20 text-cream-100"
              : "border-christmas-red/40 bg-christmas-red/10 text-cream-100"
          )}
        >
          {feedback.text}
        </p>
      )}

      {snapshot.lastError && (
        <p className="rounded-xl border border-christmas-red/30 bg-christmas-red/5 px-4 py-2 text-xs text-cream-200/80">
          Ultimo errore registrato: {snapshot.lastError}
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-cream-100">
          Notifiche configurate
        </h3>
        {snapshot.scheduled.length === 0 ? (
          <p className="rounded-xl border border-cream-300/10 bg-pine-950/30 px-4 py-3 text-sm text-cream-200/60">
            Nessuna notifica. Creane una qui sopra: potrai inviarla subito o
            programmarla.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cream-300/15">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-pine-950/70 text-[11px] uppercase tracking-wider text-cream-200/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Titolo</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Programmata</th>
                  <th className="px-4 py-3 font-medium">Stato</th>
                  <th className="px-4 py-3 font-medium">Inviati</th>
                  <th className="px-4 py-3 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300/10">
                {snapshot.scheduled.map((row) => (
                  <tr key={row.id} className="hover:bg-cream-50/[0.03]">
                    <td className="px-4 py-3 align-top">
                      <p className="text-cream-100">{row.title}</p>
                      {row.lastError && (
                        <p className="mt-0.5 text-[11px] text-christmas-red-light/80">
                          {row.lastError}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cream-200/70">{row.kind}</td>
                    <td className="px-4 py-3 text-cream-200/70">
                      {formatDate(row.scheduledFor)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-cream-200/70">{row.recipients}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {row.status === "sent" ? (
                        <button
                          type="button"
                          disabled={disabled || !snapshot.pushConfigured}
                          onClick={() =>
                            run(`send-${row.id}`, () =>
                              adminSendNotificationNow(row.id, true)
                            )
                          }
                          className="rounded-md px-2 py-1 text-xs text-gold-light hover:bg-gold/10 disabled:opacity-50"
                        >
                          {busy === `send-${row.id}` ? "Invio…" : "Reinvia"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={disabled || !snapshot.pushConfigured}
                          onClick={() =>
                            run(`send-${row.id}`, () => adminSendNotificationNow(row.id))
                          }
                          className="rounded-md px-2 py-1 text-xs text-gold-light hover:bg-gold/10 disabled:opacity-50"
                        >
                          {busy === `send-${row.id}` ? "Invio…" : "Invia ora"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-cream-100">
          Ultime consegne
        </h3>
        {snapshot.deliveries.length === 0 ? (
          <p className="rounded-xl border border-cream-300/10 bg-pine-950/30 px-4 py-3 text-sm text-cream-200/60">
            Nessuna consegna registrata.
          </p>
        ) : (
          <ul className="space-y-2">
            {snapshot.deliveries.map((delivery) => (
              <li
                key={delivery.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cream-300/10 bg-pine-950/30 px-4 py-2.5 text-xs"
              >
                <span className="font-mono text-cream-300/45">
                  {formatDate(delivery.createdAt)}
                </span>
                <span className="text-cream-100/85">{delivery.userEmail}</span>
                <span className="text-cream-200/55">{delivery.kind}</span>
                <StatusBadge status={delivery.status} />
                {delivery.error && (
                  <span className="w-full truncate text-christmas-red-light/80">
                    {delivery.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
