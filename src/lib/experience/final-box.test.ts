import { describe, expect, it } from "vitest";
import { gateFinalBoxDetails, gateFinalBoxMessage } from "./final-box";

describe("gate della scatola finale", () => {
  it("non invia indizi o oggetti prima del completamento", () => {
    expect(gateFinalBoxDetails(["indizio segreto", "oggetto"], false)).toEqual([]);
    expect(gateFinalBoxDetails(null, false)).toEqual([]);
  });

  it("invia indizi e oggetti solo dopo il completamento", () => {
    expect(gateFinalBoxDetails(["indizio", "oggetto"], true)).toEqual([
      "indizio",
      "oggetto",
    ]);
  });

  it("non invia il messaggio finale prima del completamento", () => {
    expect(gateFinalBoxMessage("Il colpevole è…", false)).toBe("");
    expect(gateFinalBoxMessage("Il colpevole è…", true)).toBe("Il colpevole è…");
  });
});
