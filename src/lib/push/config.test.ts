import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isPushConfigured, publicVapidKey, readVapidConfig } from "./config";

const env = {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "  public-key  ",
  VAPID_PRIVATE_KEY: "  private-key  ",
  VAPID_SUBJECT: "admin@example.com",
};

describe("readVapidConfig", () => {
  it("restituisce null finché entrambe le chiavi non sono presenti", () => {
    expect(readVapidConfig({})).toBeNull();
    expect(readVapidConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "solo-pubblica" })).toBeNull();
    expect(readVapidConfig({ VAPID_PRIVATE_KEY: "solo-privata" })).toBeNull();
  });

  it("normalizza spazi e subject", () => {
    const config = readVapidConfig(env);
    expect(config).toEqual({
      publicKey: "public-key",
      privateKey: "private-key",
      subject: "mailto:admin@example.com",
    });
  });

  it("mantiene un subject già in formato mailto o https", () => {
    expect(readVapidConfig({ ...env, VAPID_SUBJECT: "mailto:x@y.z" })?.subject).toBe(
      "mailto:x@y.z"
    );
    expect(readVapidConfig({ ...env, VAPID_SUBJECT: "https://example.com" })?.subject).toBe(
      "https://example.com"
    );
  });

  it("espone solo la chiave pubblica al client", () => {
    expect(publicVapidKey(env)).toBe("public-key");
    expect(publicVapidKey({})).toBe("");
    expect(isPushConfigured(env)).toBe(true);
    expect(isPushConfigured({})).toBe(false);
  });
});
