import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";
import { buildSimulationPreview, isSimulationDateValid } from "./simulation";

describe("password hashing", () => {
  it("verifica una password corretta", () => {
    const hash = hashPassword("Stella2026!");
    expect(hash).toMatch(/^scrypt:/);
    expect(hash).not.toContain("Stella2026!");
    expect(verifyPassword("Stella2026!", hash)).toBe(true);
  });

  it("rifiuta una password errata e hash malformati", () => {
    const hash = hashPassword("Stella2026!");
    expect(verifyPassword("sbagliata", hash)).toBe(false);
    expect(verifyPassword("Stella2026!", "non-un-hash")).toBe(false);
  });

  it("genera salt diversi per la stessa password", () => {
    expect(hashPassword("uguale")).not.toBe(hashPassword("uguale"));
  });
});

describe("simulazione date", () => {
  const days = [
    { day_number: 1, title: "Uno", unlock_date: "2026-12-01T12:00:00Z" },
    { day_number: 5, title: "Cinque", unlock_date: "2026-12-05T12:00:00Z" },
    { day_number: 24, title: "Ventiquattro", unlock_date: "2026-12-24T12:00:00Z" },
  ];

  it("mostra sbloccati solo i giorni fino alla data simulata", () => {
    const preview = buildSimulationPreview(days, "2026-12-05");
    expect(preview.map((day) => day.wouldBeUnlocked)).toEqual([true, true, false]);
  });

  it("non modifica i dati di partenza", () => {
    const snapshot = JSON.stringify(days);
    buildSimulationPreview(days, "2026-12-24");
    expect(JSON.stringify(days)).toBe(snapshot);
  });

  it("valida il formato della data", () => {
    expect(isSimulationDateValid("2026-12-24")).toBe(true);
    expect(isSimulationDateValid("2026-02-30")).toBe(false);
    expect(isSimulationDateValid("24-12-2026")).toBe(false);
  });
});
