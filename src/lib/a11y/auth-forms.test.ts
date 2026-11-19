import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Non esiste un ambiente DOM nel progetto: questo test impedisce la
 * regressione delle etichette dei form di autenticazione controllando che
 * ogni `<label>` abbia un `htmlFor` collegato a un `id` dell'input.
 */
describe("etichette dei form di autenticazione", () => {
  it("collega etichetta e campo per login e registrazione", () => {
    const cases = [
      {
        file: new URL("../../components/auth/login-form.tsx", import.meta.url),
        ids: ["login-email", "login-password"],
      },
      {
        file: new URL("../../components/auth/register-form.tsx", import.meta.url),
        ids: ["register-name", "register-email", "register-password", "register-confirm"],
      },
    ];

    for (const { file, ids } of cases) {
      const source = readFileSync(file, "utf8");
      for (const id of ids) {
        expect(source, `htmlFor mancante per ${id}`).toContain(`htmlFor="${id}"`);
        expect(source, `id mancante per ${id}`).toContain(`id="${id}"`);
      }
    }
  });
});
