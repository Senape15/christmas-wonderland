import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password delle scatole fisiche:hash lato server.
 *
 * La password in chiaro NON viene mai salvata né inviata al browser.
 * Formato: scrypt:<salt hex>:<hash hex>
 */

const PREFIX = "scrypt";
const KEY_LENGTH = 32;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, KEY_LENGTH);
  return `${PREFIX}:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;

  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const actual = scryptSync(plain, salt, expected.length);

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
