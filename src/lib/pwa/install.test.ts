import { describe, expect, it } from "vitest";
import {
  IOS_INSTALL_INSTRUCTIONS,
  detectStandalone,
  installHint,
  isIosDevice,
  isIosSafari,
  isPushApiSupported,
} from "./install";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";
const IPAD_MASQUERADE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("detectStandalone", () => {
  it("riconosce tutte le forme di modalità standalone", () => {
    expect(detectStandalone({ navigatorStandalone: true })).toBe(true);
    expect(detectStandalone({ displayModeStandalone: true })).toBe(true);
    expect(detectStandalone({ displayModeMinimalUi: true })).toBe(true);
  });

  it("resta false quando l'app è aperta nel browser", () => {
    expect(detectStandalone({})).toBe(false);
  });
});

describe("isIosDevice", () => {
  it("riconosce iPhone e iPad", () => {
    expect(isIosDevice(IPHONE_SAFARI)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
  });

  it("riconosce iPadOS 13+ che si presenta come Mac", () => {
    expect(isIosDevice(IPAD_MASQUERADE, 5)).toBe(true);
    expect(isIosDevice(IPAD_MASQUERADE, 1)).toBe(false);
  });

  it("non confonde desktop e Android", () => {
    expect(isIosDevice(WINDOWS_CHROME)).toBe(false);
    expect(isIosDevice("Mozilla/5.0 (Linux; Android 14) Chrome/120")).toBe(false);
  });
});

describe("isIosSafari", () => {
  it("accetta solo Safari su iOS", () => {
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true);
    expect(isIosSafari(IPHONE_CHROME)).toBe(false);
    expect(isIosSafari("Mozilla/5.0 (iPhone) FxiOS/120 Mobile")).toBe(false);
  });
});

describe("installHint", () => {
  const base = { standalone: false, ios: false, iosSafari: false, canPrompt: false };

  it("dichiara installata l'app già aperta in standalone", () => {
    expect(installHint({ ...base, standalone: true })).toBe("installed");
  });

  it("distingue Safari dagli altri browser iOS", () => {
    expect(installHint({ ...base, ios: true, iosSafari: true })).toBe("ios-safari");
    expect(installHint({ ...base, ios: true, iosSafari: false })).toBe(
      "ios-other-browser"
    );
  });

  it("usa il prompt nativo quando disponibile", () => {
    expect(installHint({ ...base, canPrompt: true })).toBe("prompt");
  });

  it("non promette installazioni non supportate", () => {
    expect(installHint(base)).toBe("unsupported");
  });
});

describe("supporto Web Push", () => {
  it("richiede serviceWorker, PushManager e Notification", () => {
    expect(
      isPushApiSupported({
        hasServiceWorker: true,
        hasPushManager: true,
        hasNotification: true,
      })
    ).toBe(true);
    expect(
      isPushApiSupported({
        hasServiceWorker: true,
        hasPushManager: false,
        hasNotification: true,
      })
    ).toBe(false);
  });

  it("le istruzioni iOS citano Condividi e schermata Home", () => {
    expect(IOS_INSTALL_INSTRUCTIONS).toContain("Condividi");
    expect(IOS_INSTALL_INSTRUCTIONS).toContain("schermata Home");
  });
});
