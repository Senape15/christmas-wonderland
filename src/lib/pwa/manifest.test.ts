import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("manifest PWA", () => {
  const value = manifest();

  it("espone nome, nome breve e descrizione italiani", () => {
    expect(value.name).toBe("Christmas Wonderland");
    expect(value.short_name).toBe("Wonderland");
    expect(value.description).toContain("calendario");
    expect(value.lang).toBe("it");
  });

  it("è installabile: standalone, start_url e scope coerenti", () => {
    expect(value.display).toBe("standalone");
    expect(value.start_url).toBe("/dashboard");
    expect(value.scope).toBe("/");
    expect(value.orientation).toBe("portrait");
  });

  it("usa i colori del tema natalizio", () => {
    expect(value.background_color).toBe("#041f12");
    expect(value.theme_color).toBe("#0b2e1a");
  });

  it("include le icone richieste, compresa la maskable", () => {
    const icons = value.icons ?? [];
    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" }),
        expect.objectContaining({
          src: "/icons/maskable-512.png",
          sizes: "512x512",
          purpose: "maskable",
        }),
      ])
    );
  });

  it("offre scorciatoie verso calendario e impostazioni notifiche", () => {
    const urls = (value.shortcuts ?? []).map((shortcut) => shortcut.url);
    expect(urls).toContain("/dashboard");
    expect(urls).toContain("/dashboard/impostazioni");
  });
});
