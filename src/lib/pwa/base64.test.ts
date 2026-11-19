import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./base64";

describe("urlBase64ToUint8Array", () => {
  it("decodifica base64url con e senza padding", () => {
    const bytes = urlBase64ToUint8Array("AQID");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);

    const padded = urlBase64ToUint8Array("AQI");
    expect(Array.from(padded)).toEqual([1, 2]);
  });

  it("gestisce i caratteri - e _ dell'alfabeto url-safe", () => {
    // Verifica contro Buffer, l'implementazione di riferimento in Node.
    const input = "_-7dzA";
    const expected = Array.from(Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
    expect(Array.from(urlBase64ToUint8Array(input))).toEqual(expected);
  });

  it("produce una chiave di 65 byte per un punto EC non compresso", () => {
    const key = Buffer.alloc(65);
    key[0] = 4;
    for (let index = 1; index < 65; index += 1) key[index] = index;
    const encoded = key
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const decoded = urlBase64ToUint8Array(encoded);
    expect(decoded).toHaveLength(65);
    expect(decoded[0]).toBe(4);
    expect(Array.from(decoded)).toEqual(Array.from(key));
  });

  it("restituisce un Uint8Array con buffer dedicato", () => {
    const decoded = urlBase64ToUint8Array("AQID");
    expect(decoded.buffer).toBeInstanceOf(ArrayBuffer);
    expect(decoded.byteLength).toBe(3);
  });
});
