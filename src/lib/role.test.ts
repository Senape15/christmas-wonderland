import { describe, expect, it } from "vitest";
import { resolveAppRole } from "./role";

const USER_ID = "d87ace72-e99e-49da-bdcc-b58b0239ff1c";

describe("resolveAppRole", () => {
  it("restituisce admin quando la riga è corretta", () => {
    expect(resolveAppRole(USER_ID, { id: USER_ID, role: "admin" })).toBe("admin");
  });

  it("restituisce user quando la riga è corretta", () => {
    expect(resolveAppRole(USER_ID, { id: USER_ID, role: "user" })).toBe("user");
  });

  it("non nasconde un errore RLS con il fallback a user", () => {
    expect(() =>
      resolveAppRole(USER_ID, null, {
        code: "P0001",
        message: "infinite recursion detected in policy for relation users",
      })
    ).toThrowError(/infinite recursion detected in policy for relation users/);
  });

  it("segnala una riga mancante senza assegnare un ruolo", () => {
    expect(() => resolveAppRole(USER_ID, null)).toThrowError(
      /Nessun record in public\.users/
    );
  });

  it("verifica che la riga appartenga all'utente autenticato", () => {
    expect(() =>
      resolveAppRole(USER_ID, {
        id: "00000000-0000-0000-0000-000000000000",
        role: "admin",
      })
    ).toThrowError(/non corrisponde all'utente autenticato/);
  });

  it("rifiuta ruoli non validi", () => {
    expect(() =>
      resolveAppRole(USER_ID, { id: USER_ID, role: "superuser" })
    ).toThrowError(/Ruolo non valido/);
  });
});
