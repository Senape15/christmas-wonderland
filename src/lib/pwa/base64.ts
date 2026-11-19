/**
 * Conversione della chiave VAPID pubblica (base64url) nel formato binario
 * richiesto da `PushManager.subscribe({ applicationServerKey })`.
 *
 * Funzione pura e testabile: non tocca `window`.
 *
 * Il valore è costruito sempre su un `ArrayBuffer` dedicato: TypeScript
 * distingue `Uint8Array<ArrayBuffer>` da `Uint8Array<ArrayBufferLike>`, e solo
 * il primo è accettato da `PushManager.subscribe`.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  if (typeof atob === "function") {
    const raw = atob(normalized);
    const output = new Uint8Array(new ArrayBuffer(raw.length));
    for (let index = 0; index < raw.length; index += 1) {
      output[index] = raw.charCodeAt(index);
    }
    return output;
  }

  // Fallback Node (test o runtime senza atob).
  const bytes = Buffer.from(normalized, "base64");
  const output = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  output.set(bytes);
  return output;
}
