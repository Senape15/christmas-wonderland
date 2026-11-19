"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  registerPushSubscription,
  removeAllPushSubscriptions,
  removePushSubscription,
  removePushSubscriptionById,
  saveNotificationPreferences,
} from "@/lib/push/actions";
import {
  getCurrentEndpoint,
  getNotificationPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pwa/client";
import type {
  NotificationOverview,
  NotificationPreferences,
  PushResult,
} from "@/types/notifications";

type Tone = "success" | "error" | "info";

const KIND_TOGGLES: {
  key: keyof Pick<
    NotificationPreferences,
    "dailyReminders" | "reminder" | "clues" | "quizzes" | "special" | "finale"
  >;
  label: string;
  hint: string;
}[] = [
  {
    key: "dailyReminders",
    label: "Notifica giornaliera",
    hint: "Un buongiorno quando la casella del giorno è disponibile.",
  },
  {
    key: "reminder",
    label: "Promemoria",
    hint: "Un promemoria nel pomeriggio se non hai ancora aperto la casella.",
  },
  {
    key: "clues",
    label: "Nuovi indizi",
    hint: "Quando compare un indizio da scoprire nel villaggio.",
  },
  {
    key: "quizzes",
    label: "Quiz ed enigmi",
    hint: "Quando è disponibile un nuovo enigma del giorno.",
  },
  {
    key: "special",
    label: "Comunicazioni speciali",
    hint: "Messaggi e novità importanti di Christmas Wonderland.",
  },
  {
    key: "finale",
    label: "Finale",
    hint: "Solo il 24 dicembre, quando la storia arriva alla conclusione.",
  },
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
  }).format(date);
}

export function NotificationSettings({
  overview,
  vapidPublicKey,
}: {
  overview: NotificationOverview;
  vapidPublicKey: string;
}) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    overview.preferences
  );
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported" | null
  >(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: Tone; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Le API del browser non esistono durante il render server: lo stato
    // viene letto dopo il mount, in microtask (niente mismatch di idratazione).
    queueMicrotask(() => {
      if (cancelled) return;
      setPermission(getNotificationPermission());
      setSupported(isPushSupported());
    });

    void getCurrentEndpoint().then((endpoint) => {
      if (!cancelled) setCurrentEndpoint(endpoint);
    });

    return () => {
      cancelled = true;
    };
  }, [overview.subscriptions.length]);

  const disabled = busy || !overview.migrationReady;

  const report = (result: PushResult, fallback: string) => {
    if (result.ok) {
      setFeedback({ tone: "success", text: result.message ?? fallback });
      router.refresh();
    } else {
      setFeedback({ tone: "error", text: result.error ?? "Operazione non riuscita." });
    }
  };

  const setPreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const savePreferences = async (next = preferences) => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await saveNotificationPreferences(next);
      report(result, "Preferenze salvate.");
    } finally {
      setBusy(false);
    }
  };

  const activateThisDevice = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const subscription = await subscribeToPush(vapidPublicKey);
      if (!subscription.ok) {
        setFeedback({ tone: "error", text: subscription.error });
        return;
      }
      const result = await registerPushSubscription(subscription.subscription);
      if (result.ok) {
        setCurrentEndpoint(subscription.subscription.endpoint);
        setPermission(getNotificationPermission());
        setPreferences((current) => ({ ...current, enabled: true }));
        await saveNotificationPreferences({ ...preferences, enabled: true });
      }
      report(result, "Notifiche attive su questo dispositivo.");
    } finally {
      setBusy(false);
    }
  };

  const deactivateThisDevice = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const local = await unsubscribeFromPush();
      if (local.endpoint) {
        report(await removePushSubscription({ endpoint: local.endpoint }), "Dispositivo rimosso.");
      } else {
        setFeedback({ tone: "info", text: "Questo dispositivo non era iscritto." });
        router.refresh();
      }
      setCurrentEndpoint(null);
    } finally {
      setBusy(false);
    }
  };

  const deactivateEverything = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await saveNotificationPreferences({ ...preferences, enabled: false });
      const result = await removeAllPushSubscriptions();
      await unsubscribeFromPush();
      setCurrentEndpoint(null);
      setPreferences((current) => ({ ...current, enabled: false }));
      report(result, "Tutte le notifiche sono state disattivate.");
    } finally {
      setBusy(false);
    }
  };

  const removeDevice = async (id: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      report(await removePushSubscriptionById(id), "Dispositivo rimosso.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {!overview.migrationReady && (
        <div
          role="status"
          className="rounded-2xl border border-ice-300/35 bg-ice-900/40 px-4 py-3 text-sm text-ice-200"
        >
          <strong className="font-semibold">Funzionalità non ancora attiva.</strong>{" "}
          Esegui la migrazione{" "}
          <code className="rounded bg-pine-950/60 px-1">007_push_notifications.sql</code>{" "}
          nel SQL Editor di Supabase per salvare preferenze e dispositivi.
        </div>
      )}

      {!overview.pushConfigured && (
        <div
          role="status"
          className="rounded-2xl border border-christmas-red/40 bg-christmas-red/10 px-4 py-3 text-sm text-cream-100"
        >
          <strong className="font-semibold">Invio non configurato.</strong> Le
          chiavi VAPID non sono presenti sul server: le preferenze vengono
          salvate, ma nessuna notifica può essere consegnata finché non vengono
          configurate.
        </div>
      )}

      <section className="rounded-2xl border border-cream-300/15 bg-pine-950/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-gold-light">
              Notifiche su questo dispositivo
            </h3>
            <p className="mt-1 text-sm text-cream-200/70">
              {supported === false
                ? "Questo browser non supporta le notifiche push."
                : supported === null
                  ? "Verifico il supporto del browser…"
                  : currentEndpoint
                    ? "Questo dispositivo è iscritto e riceverà le notifiche."
                    : "Attiva le notifiche per ricevere gli avvisi delle caselle."}
            </p>
            <p className="mt-2 text-xs text-cream-300/55">
              Permesso:{" "}
              {permission === "granted"
                ? "concesso"
                : permission === "denied"
                  ? "negato dal browser"
                  : permission === "unsupported"
                    ? "non supportato"
                    : permission === null
                      ? "verifica in corso"
                      : "non ancora richiesto"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {currentEndpoint ? (
              <button
                type="button"
                onClick={deactivateThisDevice}
                disabled={disabled}
                className="rounded-full border border-cream-300/25 px-4 py-2 text-xs font-medium text-cream-100 hover:bg-cream-50/10 disabled:opacity-50"
              >
                Disattiva qui
              </button>
            ) : (
              <button
                type="button"
                onClick={activateThisDevice}
                disabled={disabled || supported !== true || !vapidPublicKey}
                className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-pine-950 hover:bg-gold-light disabled:opacity-50"
              >
                Attiva su questo dispositivo
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-cream-300/15 bg-pine-950/40 p-5">
        <h3 className="font-display text-lg font-semibold text-gold-light">
          Cosa vuoi ricevere
        </h3>
        <p className="mt-1 text-sm text-cream-200/70">
          Le notifiche arrivano solo nei giorni sbloccati e nel rispetto del tuo
          orario. Mai prima di una casella e mai prima del finale.
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {KIND_TOGGLES.map((toggle) => (
            <li key={toggle.key}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-300/10 bg-pine-900/40 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={preferences[toggle.key]}
                  disabled={disabled}
                  onChange={(event) => setPreference(toggle.key, event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
                />
                <span>
                  <span className="block text-sm font-medium text-cream-100">
                    {toggle.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-cream-200/55">
                    {toggle.hint}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-cream-200/80">
              Orario preferito
            </span>
            <input
              type="time"
              value={preferences.preferredTime}
              disabled={disabled}
              onChange={(event) => setPreference("preferredTime", event.target.value)}
              className="w-full rounded-lg border border-cream-300/20 bg-pine-950/70 px-3 py-2 text-sm text-cream-50 outline-none focus:border-gold/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-cream-200/80">
              Silenzio dalle
            </span>
            <input
              type="time"
              value={preferences.quietHoursStart}
              disabled={disabled}
              onChange={(event) => setPreference("quietHoursStart", event.target.value)}
              className="w-full rounded-lg border border-cream-300/20 bg-pine-950/70 px-3 py-2 text-sm text-cream-50 outline-none focus:border-gold/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-cream-200/80">
              Silenzio fino alle
            </span>
            <input
              type="time"
              value={preferences.quietHoursEnd}
              disabled={disabled}
              onChange={(event) => setPreference("quietHoursEnd", event.target.value)}
              className="w-full rounded-lg border border-cream-300/20 bg-pine-950/70 px-3 py-2 text-sm text-cream-50 outline-none focus:border-gold/60"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => savePreferences()}
            disabled={disabled}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-pine-950 hover:bg-gold-light disabled:opacity-50"
          >
            {busy ? "Salvataggio…" : "Salva preferenze"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPreferences((current) => ({ ...current, enabled: false }));
              void deactivateEverything();
            }}
            disabled={disabled}
            className="rounded-full border border-christmas-red/45 px-4 py-2 text-xs text-christmas-red-light hover:bg-christmas-red/10 disabled:opacity-50"
          >
            Disattiva tutte le notifiche
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-cream-300/15 bg-pine-950/40 p-5">
        <h3 className="font-display text-lg font-semibold text-gold-light">
          Dispositivi iscritti
        </h3>
        <p className="mt-1 text-sm text-cream-200/70">
          Ogni dispositivo riceve le notifiche in modo indipendente. Rimuovi
          quelli che non usi più.
        </p>

        {overview.subscriptions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-cream-300/10 bg-pine-900/30 px-4 py-3 text-sm text-cream-200/60">
            Nessun dispositivo iscritto.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {overview.subscriptions.map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-300/10 bg-pine-900/35 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cream-100">
                    {device.deviceLabel}
                    {!device.isActive && (
                      <span className="ml-2 rounded-full bg-christmas-red/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-christmas-red-light">
                        inattivo
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-cream-300/50">
                    {device.endpointHint}
                  </p>
                  <p className="mt-0.5 text-[11px] text-cream-300/45">
                    Iscritto il {formatDate(device.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeDevice(device.id)}
                  disabled={disabled}
                  className="rounded-full px-3 py-1.5 text-xs text-christmas-red-light hover:bg-christmas-red/10 disabled:opacity-50"
                >
                  Rimuovi
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className={
            feedback.tone === "error"
              ? "rounded-xl border border-christmas-red/40 bg-christmas-red/10 px-4 py-3 text-sm text-cream-100"
              : feedback.tone === "success"
                ? "rounded-xl border border-pine-300/40 bg-pine-700/20 px-4 py-3 text-sm text-cream-100"
                : "rounded-xl border border-ice-300/30 bg-ice-900/30 px-4 py-3 text-sm text-ice-200"
          }
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
