/**
 * Rilevamento puro delle condizioni di installazione PWA.
 *
 * Non tocca `window`: i valori vengono passati dai componenti client, così le
 * regole restano testabili in Node.
 */

export type InstallHint =
  | "installed"
  | "prompt"
  | "ios-safari"
  | "ios-other-browser"
  | "unsupported";

export interface StandaloneInput {
  navigatorStandalone?: boolean;
  displayModeStandalone?: boolean;
  displayModeMinimalUi?: boolean;
}

/** `true` quando l'app è già aperta come applicazione installata. */
export function detectStandalone(input: StandaloneInput): boolean {
  return Boolean(
    input.navigatorStandalone ||
      input.displayModeStandalone ||
      input.displayModeMinimalUi
  );
}

/** iPadOS 13+ si presenta come Mac: serve `maxTouchPoints`. */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iphone|ipad|ipod/i.test(userAgent)) return true;
  return /macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

/**
 * Safari su iOS è l'unico browser che espone "Aggiungi alla schermata Home".
 * Gli altri browser iOS (Chrome, Firefox, Edge, Opera) usano WebKit ma non
 * possono installare la PWA.
 */
export function isIosSafari(userAgent: string): boolean {
  if (!/safari/i.test(userAgent)) return false;
  return !/(crios|fxios|edgios|opios|opr\/|chrome\/)/i.test(userAgent);
}

export interface InstallContext {
  standalone: boolean;
  ios: boolean;
  iosSafari: boolean;
  canPrompt: boolean;
}

export function installHint(context: InstallContext): InstallHint {
  if (context.standalone) return "installed";
  if (context.ios) return context.iosSafari ? "ios-safari" : "ios-other-browser";
  if (context.canPrompt) return "prompt";
  return "unsupported";
}

export const IOS_INSTALL_INSTRUCTIONS =
  "Tocca il pulsante Condividi di Safari, poi scegli «Aggiungi alla schermata Home».";

/** API necessarie per Web Push (Safari iOS 16.4+ le espone in PWA). */
export function isPushApiSupported(input: {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
}): boolean {
  return input.hasServiceWorker && input.hasPushManager && input.hasNotification;
}

/** Chiave localStorage usata per non ripetere il suggerimento. */
export const INSTALL_DISMISS_KEY = "cw:install-dismissed";
