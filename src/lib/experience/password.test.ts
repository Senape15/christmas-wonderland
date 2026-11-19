import { describe, expect, it } from "vitest";
import { computePasswordChallenge, publicSuccessMessage } from "./password";

describe("stato pubblico della password fisica", () => {
  it("non contiene mai l'hash", () => {
    const challenge = computePasswordChallenge(
      { hint: "Guarda sotto l'albero", success_message: "Bravissimo!", max_attempts: 3, is_active: true },
      0,
      false
    );

    expect(challenge).not.toBeNull();
    expect(JSON.stringify(challenge)).not.toContain("scrypt");
    expect(JSON.stringify(challenge)).not.toContain("hash");
  });

  it("calcola i tentativi rimanenti", () => {
    const config = {
      hint: "",
      success_message: "",
      max_attempts: 3,
      is_active: true,
    };

    expect(computePasswordChallenge(config, 0, false)?.remainingAttempts).toBe(3);
    expect(computePasswordChallenge(config, 2, false)?.remainingAttempts).toBe(1);
    expect(computePasswordChallenge(config, 3, false)?.canAttempt).toBe(false);
    expect(computePasswordChallenge(config, 5, false)?.remainingAttempts).toBe(0);
  });

  it("non consente tentativi senza password attiva o già completata", () => {
    const disabled = computePasswordChallenge(
      { hint: "", success_message: "", max_attempts: null, is_active: false },
      0,
      false
    );
    const completed = computePasswordChallenge(
      { hint: "", success_message: "", max_attempts: null, is_active: true },
      1,
      true
    );

    expect(disabled?.canAttempt).toBe(false);
    expect(completed?.canAttempt).toBe(false);
    expect(completed?.completed).toBe(true);
  });

  it("mostra il messaggio dell'admin solo a completamento avvenuto", () => {
    expect(
      publicSuccessMessage(
        { hint: "", success_message: "Sorpresa sbloccata!", max_attempts: null, is_active: true },
        "Fallback"
      )
    ).toBe("Sorpresa sbloccata!");
    expect(publicSuccessMessage(null, "Fallback")).toBe("Fallback");
  });
});
