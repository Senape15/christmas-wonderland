import { isIosDevice, isIosSafari } from "./install";
import { urlBase64ToUint8Array } from "./base64";

/**
 * Helper browser per Service Worker, permessi e subscription.
 *
 * Tutte le funzioni sono pensate per essere chiamate solo da componenti
 * `"use client"`; non contengono segreti.
 */

export interface BrowserPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    return registration;
  } catch {
    return null;
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function subscribeToPush(
  publicKey: string
): Promise<{ ok: true; subscription: BrowserPushSubscription } | { ok: false; error: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: "Questo browser non supporta le notifiche push." };
  }
  if (!publicKey) {
    return { ok: false, error: "Notifiche non configurate sul server (chiave VAPID assente)." };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, error: "Service Worker non disponibile: ricarica la pagina." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error:
        permission === "denied"
          ? "Permesso negato. Riattivalo dalle impostazioni del browser."
          : "Permesso non concesso: le notifiche restano disattivate.",
    };
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Subscription incompleta: riprova." };
  }

  return {
    ok: true,
    subscription: {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  };
}

export async function getCurrentEndpoint(): Promise<string | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return null;
    const subscription = await registration.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<{ endpoint: string | null; error: string | null }> {
  if (!isPushSupported()) return { endpoint: null, error: null };
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return { endpoint: null, error: null };
    const endpoint = subscription.endpoint;
    const removed = await subscription.unsubscribe();
    return { endpoint, error: removed ? null : "Il browser non ha rimosso la subscription." };
  } catch (error) {
    return {
      endpoint: null,
      error: error instanceof Error ? error.message : "Rimozione non riuscita.",
    };
  }
}

/** Stato dell'installazione, letto dal browser. */
export function readInstallState(): {
  standalone: boolean;
  ios: boolean;
  iosSafari: boolean;
} {
  if (typeof window === "undefined") {
    return { standalone: false, ios: false, iosSafari: false };
  }

  const userAgent = navigator.userAgent;
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const ios = isIosDevice(userAgent, maxTouchPoints);

  return {
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    ios,
    iosSafari: ios && isIosSafari(userAgent),
  };
}
