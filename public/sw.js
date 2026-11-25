/*
 * Christmas Wonderland – Service Worker (Fase 7)
 *
 * Regole di sicurezza:
 *  - nessuna risposta di /dashboard, /admin, /api o di Supabase viene messa in
 *    cache: dopo un logout nessun dato privato resta sul dispositivo;
 *  - solo GET same-origin e solo asset statici finiscono nella cache;
 *  - le navigazioni usano network-first con fallback offline.html.
 *
 * Aggiornamento: il nuovo worker prende il controllo subito (skipWaiting) e
 * cancella le cache con versione diversa in fase di activate.
 */

const CACHE_VERSION = "cw-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
/** In sviluppo gli asset cambiano a ogni HMR: niente cache statica. */
const IS_DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(self.location.hostname);
const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

/** Percorsi che non devono mai essere intercettati o memorizzati. */
const PRIVATE_PREFIXES = ["/dashboard", "/admin", "/api/", "/auth/"];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Solo directory pubbliche note: mai cache di contenuti futuri o utente. */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    // Il villaggio Godot è pubblico e statico: la PWA lo tiene in cache,
    // il sito lo rivalida a ogni visita (vedi next.config.ts).
    url.pathname.startsWith("/village/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline.html"
  );
}

/** Navigazioni delle notifiche: solo percorsi interni, mai URL esterni. */
function safeNotificationUrl(value) {
  return typeof value === "string" && /^\/(?!\/)[^\s\\]*$/.test(value)
    ? value
    : "/dashboard";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      if (!IS_DEV) {
        const cache = await caches.open(STATIC_CACHE);
        await Promise.all(
          PRECACHE.map((asset) =>
            cache.add(new Request(asset, { cache: "reload" })).catch(() => null)
          )
        );
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Cross-origin (Supabase, Storage, CDN): mai in cache, mai intercettato.
  if (url.origin !== self.location.origin) return;
  if (isPrivatePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          return (
            (await cache.match("/offline.html")) ||
            new Response("Sei offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  if (isStaticAsset(url)) {
    if (IS_DEV) return;
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Christmas Wonderland";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-192.png",
    tag: payload.tag || "wonderland",
    renotify: false,
    requireInteraction: false,
    data: {
      url: safeNotificationUrl(payload.url),
      kind: payload.kind || "special",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawTarget =
    (event.notification.data && event.notification.data.url) || "/dashboard";
  const target = new URL(safeNotificationUrl(rawTarget), self.location.origin)
    .href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target).catch(() => null);
          }
          return;
        }
      }

      await self.clients.openWindow(target);
    })()
  );
});
