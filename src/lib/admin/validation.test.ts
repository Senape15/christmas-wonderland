import { describe, expect, it } from "vitest";
import { getResource } from "./resources";
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
});
