import { describe, expect, it } from "vitest";
import { defaultFormValues, getResource } from "./resources";
import { pickAllowedValues, validateAdminValues } from "./validation";

describe("validazione admin", () => {
  it("rifiuta colonne non dichiarate nella risorsa", () => {
    const resource = getResource("physical_contents")!;
    const result = validateAdminValues(resource, {
      title: "Indizio",
      day_number: 5,
      password_hash: "hash rubato",
    });

    expect(result.success).toBe(false);
  });

  it("rifiuta un giorno fuori dal range 1-24", () => {
    const resource = getResource("advent_days")!;
    const result = validateAdminValues(resource, {
      day_number: 25,
      title: "Giorno 25",
      description: "",
      unlock_date: "2026-12-25T23:00:00Z",
    });

    expect(result.success).toBe(false);
  });

  it("accetta valori validi e rimuove i campi readonly", () => {
    const resource = getResource("users")!;
    const result = validateAdminValues(resource, { role: "admin" });
    expect(result.success).toBe(true);

    const payload = pickAllowedValues(resource, {
      role: "admin",
      id: "non-deve-passare",
      email: "non-deve-passare",
    });
    expect(payload).toEqual({ role: "admin" });
  });

  it("rifiuta ruoli non ammessi", () => {
    const resource = getResource("users")!;
    expect(validateAdminValues(resource, { role: "superadmin" }).success).toBe(false);
  });

  it("precompila le colonne NOT NULL delle notifiche con i default del database", () => {
    const resource = getResource("scheduled_notifications", { phase7: true })!;
    const values = defaultFormValues(resource);

    expect(values).toMatchObject({
      kind: "special",
      audience: "all",
      url: "/dashboard",
      is_active: false,
    });

    // Il form converte i campi vuoti in null prima di inviarli al server.
    const stored = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value === "" ? null : value])
    );
    stored.title = "Promemoria";
    stored.body = "Testo";
    expect(validateAdminValues(resource, stored).success).toBe(true);
  });

  it("rifiuta URL esterni nelle notifiche programmate", () => {
    const resource = getResource("scheduled_notifications", { phase7: true })!;
    const base = { title: "Test", body: "Testo", kind: "special" };

    expect(validateAdminValues(resource, { ...base, url: "/dashboard" }).success).toBe(true);
    expect(
      validateAdminValues(resource, { ...base, url: "https://esempio.it" }).success
    ).toBe(false);
    expect(
      validateAdminValues(resource, { ...base, url: "//esempio.it" }).success
    ).toBe(false);
  });
});
