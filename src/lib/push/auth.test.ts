import { describe, expect, it } from "vitest";
import { CRON_SECRET_HEADER, authorizeCronRequest } from "./auth";

const SECRET = "un-segreto-molto-lungo-di-test-1234";

function headers(init: Record<string, string> = {}): Headers {
  return new Headers(init);
}

describe("authorizeCronRequest", () => {
  it("rifiuta con 503 se lo scheduler non è configurato", () => {
    const result = authorizeCronRequest(headers(), undefined);
    expect(result).toEqual({
      ok: false,
      status: 503,
      error: expect.stringContaining("PUSH_SCHEDULER_SECRET"),
    });
  });

  it("rifiuta un segreto troppo corto", () => {
    const result = authorizeCronRequest(headers(), "corto");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("accetta il segreto come Bearer", () => {
    const result = authorizeCronRequest(
      headers({ authorization: `Bearer ${SECRET}` }),
      SECRET
    );
    expect(result).toEqual({ ok: true });
  });

  it("accetta il segreto nell'header dedicato", () => {
    const result = authorizeCronRequest(
      headers({ [CRON_SECRET_HEADER]: SECRET }),
      SECRET
    );
    expect(result).toEqual({ ok: true });
  });

  it("rifiuta richieste senza credenziali", () => {
    const result = authorizeCronRequest(headers(), SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rifiuta un segreto errato o di lunghezza diversa senza lanciare", () => {
    expect(
      authorizeCronRequest(headers({ authorization: "Bearer sbagliato" }), SECRET).ok
    ).toBe(false);
    expect(
      authorizeCronRequest(headers({ authorization: `Bearer ${SECRET}x` }), SECRET).ok
    ).toBe(false);
  });

  it("non accetta un prefisso Bearer malformato", () => {
    const result = authorizeCronRequest(
      headers({ authorization: `Basic ${SECRET}` }),
      SECRET
    );
    expect(result.ok).toBe(false);
  });

  it("accetta il segreto con spaziature nella configurazione", () => {
    const result = authorizeCronRequest(
      headers({ authorization: `Bearer ${SECRET}` }),
      `  ${SECRET}  `
    );
    expect(result).toEqual({ ok: true });
  });

  it("rifiuta segreti di lunghezza diversa senza confrontare il testo in chiaro", () => {
    // Copre il ramo che in precedenza usava un controllo di lunghezza non
    // costante: il confronto ora avviene su digest SHA-256 a lunghezza fissa.
    const result = authorizeCronRequest(
      headers({ authorization: "Bearer short" }),
      SECRET
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
    expect(
      authorizeCronRequest(headers({ [CRON_SECRET_HEADER]: SECRET }), SECRET)
    ).toEqual({ ok: true });
  });
});
