"use client";

import { useEffect, useState } from "react";
import {
  INSTALL_DISMISS_KEY,
  IOS_INSTALL_INSTRUCTIONS,
  installHint,
  type InstallHint,
} from "@/lib/pwa/install";
import { readInstallState } from "@/lib/pwa/client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALLED_DISMISS_KEY = "cw:installed-badge-dismissed";

/**
 * Suggerimento di installazione discreto.
 *
 * - Chrome/Edge/Android: usa `beforeinstallprompt`.
 * - iOS Safari: mostra le istruzioni manuali.
 * - iOS con altri browser: spiega che serve Safari.
 * - Desktop senza prompt: nessun messaggio (non promettiamo installazioni
 *   che il browser non supporta).
 */
export function InstallPrompt() {
  const [hint, setHint] = useState<InstallHint | null>(null);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installedDismissed, setInstalledDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Lettura post-mount, fuori dal corpo sincrono dell'effect: evita sia il
    // mismatch di idratazione sia i render a cascata.
    queueMicrotask(() => {
      if (cancelled) return;
      const state = readInstallState();
      setHint(
        installHint({
          standalone: state.standalone,
          ios: state.ios,
          iosSafari: state.iosSafari,
          canPrompt: false,
        })
      );
      setDismissed(window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1");
      setInstalledDismissed(
        window.localStorage.getItem(INSTALLED_DISMISS_KEY) === "1"
      );
    });

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const prompt = event as BeforeInstallPromptEvent;
      setPromptEvent(prompt);
      setHint((current) =>
        current === "installed" ? current : "prompt"
      );
    };

    const onInstalled = () => {
      setPromptEvent(null);
      setHint("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(
      hint === "installed" ? INSTALLED_DISMISS_KEY : INSTALL_DISMISS_KEY,
      "1"
    );
    if (hint === "installed") setInstalledDismissed(true);
    else setDismissed(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setHint("installed");
      setPromptEvent(null);
    } else {
      setDismissed(true);
    }
  };

  // Evita mismatch di idratazione: fino alla lettura del browser non mostrare nulla.
  if (hint === null) return null;

  if (hint === "installed") {
    if (installedDismissed) return null;
    return (
      <div className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full border border-pine-300/40 bg-pine-950/90 px-3 py-1.5 text-[11px] text-cream-100 shadow-[var(--shadow-card)] backdrop-blur">
        <span aria-hidden="true">✓</span> App installata
        <button
          type="button"
          onClick={dismiss}
          aria-label="Nascondi indicatore di installazione"
          className="ml-1 rounded-full px-1 text-cream-300/60 hover:text-cream-50"
        >
          ×
        </button>
      </div>
    );
  }

  if (hint === "unsupported" || dismissed) return null;

  return (
    <aside
      aria-label="Installa Christmas Wonderland"
      className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-sm rounded-2xl border border-gold/35 bg-pine-950/95 p-4 text-cream-100 shadow-[var(--shadow-glow-gold)] backdrop-blur sm:right-auto"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-christmas-red text-lg"
        >
          🎄
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gold-light">
            {hint === "ios-safari"
              ? "Aggiungi Wonderland alla Home"
              : hint === "ios-other-browser"
                ? "Apri in Safari per installare"
                : "Installa Christmas Wonderland"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-cream-200/75">
            {hint === "ios-safari"
              ? IOS_INSTALL_INSTRUCTIONS
              : hint === "ios-other-browser"
                ? "Su iPhone e iPad l'installazione è disponibile solo da Safari. Copia il link e aprilo lì."
                : "Apri l'app a schermo intero, senza browser, e ricevi le notifiche delle nuove caselle."}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-3 py-1.5 text-xs text-cream-300/70 hover:text-cream-50"
        >
          Non ora
        </button>
        {hint === "prompt" && (
          <button
            type="button"
            onClick={install}
            className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-pine-950 transition-colors hover:bg-gold-light"
          >
            Installa
          </button>
        )}
        {(hint === "ios-safari" || hint === "ios-other-browser") && (
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-cream-300/25 px-4 py-1.5 text-xs font-medium text-cream-100 hover:bg-cream-50/10"
          >
            Ho capito
          </button>
        )}
      </div>
    </aside>
  );
}
