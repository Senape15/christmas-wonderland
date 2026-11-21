import { afterEach, describe, expect, it, vi } from "vitest";

import { reportServerError } from "./server-error";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reportServerError", () => {
  it("restituisce il messaggio di un Error e lo registra sul server", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const message = reportServerError("test", new Error("Dettaglio errore"));

    expect(message).toBe("Dettaglio errore");
    expect(log).toHaveBeenCalledWith(
      "[test] errore originale",
      expect.objectContaining({ message: "Dettaglio errore" })
    );
  });

  it("recupera il messaggio anche da un errore plain object", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const message = reportServerError("test", {
      code: "42501",
      message: "new row violates row-level security policy",
    });

    expect(message).toBe("new row violates row-level security policy");
  });

  it("redatto token, chiavi e indirizzi email nel messaggio restituito", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const message = reportServerError("test", {
      message: "fail sb_secret_ABC123 for mario.rossi@example.com Bearer eyJabc",
    });

    expect(message).toBe("fail [redatto] for [redatto] [redatto]");
  });

  it("usa il messaggio generico per valori senza messaggio", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(reportServerError("test", { code: 42 })).toBe("Errore sconosciuto");
  });
});
