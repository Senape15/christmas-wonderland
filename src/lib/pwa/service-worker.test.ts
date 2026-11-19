import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sw = readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8");
const offline = readFileSync(
  new URL("../../../public/offline.html", import.meta.url),
  "utf8"
);
const logout = readFileSync(
  new URL("../../components/layout/logout-button.tsx", import.meta.url),
  "utf8"
);

describe("Service Worker", () => {
  it("gestisce installazione, attivazione e aggiornamento", () => {
    expect(sw).toContain('addEventListener("install"');
    expect(sw).toContain('addEventListener("activate"');
    expect(sw).toContain("skipWaiting");
    expect(sw).toContain("clients.claim");
    expect(sw).toContain("caches.delete");
  });

  it("non intercetta né memorizza percorsi privati", () => {
    expect(sw).toContain('"/dashboard"');
    expect(sw).toContain('"/admin"');
    expect(sw).toContain('"/api/"');
    expect(sw).toContain("isPrivatePath(url.pathname)");
    // Nessuna cache di richieste cross-origin (Supabase/Storage).
    expect(sw).toContain("url.origin !== self.location.origin");
  });

  it("usa network-first per le navigazioni con fallback offline", () => {
    expect(sw).toContain('request.mode === "navigate"');
    expect(sw).toContain("await fetch(request)");
    expect(sw).toContain('"/offline.html"');
    expect(sw).toContain("event.respondWith");
  });

  it("memorizza solo asset statici e versiona la cache", () => {
    expect(sw).toContain('const CACHE_VERSION = "cw-v1"');
    expect(sw).toContain("STATIC_CACHE");
    expect(sw).toContain('url.pathname.startsWith("/_next/static/")');
    expect(sw).not.toContain("supabase.co");
  });

  it("riceve le push e apre l'app dalla notifica", () => {
    expect(sw).toContain('addEventListener("push"');
    expect(sw).toContain("showNotification");
    expect(sw).toContain('addEventListener("notificationclick"');
    expect(sw).toContain("clients.openWindow");
  });

  it("in sviluppo non usa la cache statica", () => {
    expect(sw).toContain("const IS_DEV");
    expect(sw).toContain("if (IS_DEV) return;");
  });
});

describe("pagina offline", () => {
  it("spiega cosa non è disponibile senza connessione", () => {
    expect(offline).toContain("Sei offline");
    expect(offline).toContain("connessione");
    expect(offline.toLowerCase()).toContain("progressi");
  });

  it("dichiara che nessun dato privato resta sul dispositivo", () => {
    expect(offline).toContain("Nessun dato privato");
  });

  it("rispetta prefers-reduced-motion", () => {
    expect(offline).toContain("prefers-reduced-motion");
  });
});

describe("logout e privacy del dispositivo", () => {
  it("rimuove la subscription locale e server prima di chiudere la sessione", () => {
    const unsubscribeIndex = logout.indexOf("unsubscribeFromPush");
    const removeIndex = logout.indexOf("removePushSubscription");
    const signOutIndex = logout.indexOf("await signOut()");

    expect(unsubscribeIndex).toBeGreaterThan(-1);
    expect(removeIndex).toBeGreaterThan(-1);
    expect(signOutIndex).toBeGreaterThan(-1);
    // Prima si scollega il dispositivo, poi si chiude la sessione.
    expect(unsubscribeIndex).toBeLessThan(signOutIndex);
    expect(removeIndex).toBeLessThan(signOutIndex);
  });

  it("il logout non si blocca se le notifiche falliscono", () => {
    expect(logout).toContain("catch");
    expect(logout).toContain("finally");
  });
});
