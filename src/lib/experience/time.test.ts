import { describe, expect, it } from "vitest";
import {
  createDateContext,
  isDayUnlocked,
  isValidRomeDate,
  toRomeDateString,
} from "./time";

describe("date contesto Europa/Roma", () => {
  it("sblocca il giorno alla mezzanotte civile di Roma", () => {
    // 30 novembre 23:30 UTC = 1 dicembre 00:30 a Roma.
    const context = createDateContext(null, new Date("2026-11-30T23:30:00Z"));

    expect(isDayUnlocked("2026-12-01T00:00:00+01:00", context)).toBe(true);
    expect(isDayUnlocked("2026-12-02T00:00:00+01:00", context)).toBe(false);
  });

  it("rispetta il confine di mezzanotte a Roma anche in UTC", () => {
    // 3 dicembre 22:59 UTC = 23:59 a Roma: il 3 è sbloccato, il 4 no.
    const beforeMidnight = createDateContext(
      null,
      new Date("2026-12-03T22:59:00Z")
    );
    expect(isDayUnlocked("2026-12-03T00:00:00Z", beforeMidnight)).toBe(true);
    expect(isDayUnlocked("2026-12-04T00:00:00Z", beforeMidnight)).toBe(false);

    // 3 dicembre 23:01 UTC = 00:01 del 4 a Roma (mezzanotte CET = 23:00 UTC).
    const afterMidnight = createDateContext(
      null,
      new Date("2026-12-03T23:01:00Z")
    );
    expect(isDayUnlocked("2026-12-04T00:00:00+01:00", afterMidnight)).toBe(true);
  });

  it("con la simulazione sblocca l'intera data scelta", () => {
    const context = createDateContext(
      { simulated_date: "2026-12-10", note: "", is_active: true },
      new Date("2026-11-18T12:00:00Z")
    );

    expect(context.isSimulation).toBe(true);
    expect(context.simulation?.date).toBe("2026-12-10");
    expect(isDayUnlocked("2026-12-10T18:00:00Z", context)).toBe(true);
    expect(isDayUnlocked("2026-12-11T00:00:00Z", context)).toBe(false);
  });

  it("ignora una simulazione disattivata", () => {
    const context = createDateContext(
      { simulated_date: "2026-12-24", note: "", is_active: false },
      new Date("2026-11-18T12:00:00Z")
    );

    expect(context.isSimulation).toBe(false);
    expect(isDayUnlocked("2026-12-01T00:00:00Z", context)).toBe(false);
  });

  it("formatta e valida le date civili", () => {
    expect(toRomeDateString(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    expect(isValidRomeDate("2026-12-24")).toBe(true);
    expect(isValidRomeDate("2026-02-30")).toBe(false);
    expect(isValidRomeDate("24/12/2026")).toBe(false);
  });
});
