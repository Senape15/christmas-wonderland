import { describe, expect, it } from "vitest";
import { hashUnit } from "./deterministic";

describe("hashUnit", () => {
  it("stays within [0, 1)", () => {
    for (let index = 0; index < 200; index += 1) {
      const value = hashUnit(index, index % 7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is stable for the same inputs", () => {
    expect(hashUnit(42, 3)).toBe(hashUnit(42, 3));
  });

  it("differs across indices and salts", () => {
    expect(hashUnit(0, 1)).not.toBe(hashUnit(1, 1));
    expect(hashUnit(0, 1)).not.toBe(hashUnit(0, 2));
  });

  it("produces the same sequence on repeated calls", () => {
    const first = Array.from({ length: 24 }, (_, index) => hashUnit(index, 5));
    const second = Array.from({ length: 24 }, (_, index) => hashUnit(index, 5));
    expect(second).toEqual(first);
  });
});
