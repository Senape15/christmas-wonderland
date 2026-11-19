import { describe, expect, it } from "vitest";
import { cssLength, cssNumber, cssRgb } from "./css-values";

describe("cssNumber", () => {
  it("rounds to the requested precision without trailing zeros", () => {
    expect(cssNumber(59.23396520302049)).toBe("59.23");
    expect(cssNumber(4.693343894879945)).toBe("4.69");
    expect(cssNumber(56.4)).toBe("56.4");
    expect(cssNumber(0.5638576427106614)).toBe("0.56");
  });

  it("never emits more than six significant digits", () => {
    for (const value of [0.123456789, 12.3456789, 99.999999]) {
      const digits = cssNumber(value).replace(/[^0-9]/g, "").length;
      expect(digits).toBeLessThanOrEqual(6);
    }
  });

  it("falls back to 0 for non-finite values", () => {
    expect(cssNumber(Number.NaN)).toBe("0");
    expect(cssNumber(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

describe("cssLength", () => {
  it("appends only the unit", () => {
    expect(cssLength(4.693343894879945, "px")).toBe("4.69px");
    expect(cssLength(56.43951276688313, "%")).toBe("56.44%");
    expect(cssLength(2.9138582558953203, "s")).toBe("2.91s");
    expect(cssLength(1, "s")).toBe("1s");
  });
});

describe("cssRgb", () => {
  it("converts hex colors to the CSSOM rgb() form", () => {
    expect(cssRgb("#4dabf7")).toBe("rgb(77, 171, 247)");
    expect(cssRgb("#D4A843")).toBe("rgb(212, 168, 67)");
    expect(cssRgb("#fff")).toBe("rgb(255, 255, 255)");
  });

  it("leaves other color formats untouched", () => {
    expect(cssRgb("rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
    expect(cssRgb("transparent")).toBe("transparent");
  });
});
