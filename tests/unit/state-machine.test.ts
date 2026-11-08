import { describe, expect, it } from "vitest";
import { canTransition, normalizeSections } from "@/modules/projects";

describe("project state machine", () => {
  it("allows the canonical happy path", () => {
    const path = [
      "DRAFT",
      "INTAKE",
      "COMPREHENDED",
      "TEMPLATE_CHOSEN",
      "GENERATING",
      "PREVIEWS",
      "PICKED",
      "PAID",
      "DEPLOYED",
      "ACTIVE",
    ] as const;
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it("rejects skipping payment", () => {
    expect(canTransition("PICKED", "DEPLOYED")).toBe(false);
    expect(canTransition("PREVIEWS", "PAID")).toBe(false);
    expect(canTransition("DRAFT", "PREVIEWS")).toBe(false);
  });

  it("allows regeneration from generating", () => {
    expect(canTransition("GENERATING", "TEMPLATE_CHOSEN")).toBe(true);
  });

  it("treats same-state as valid", () => {
    expect(canTransition("PAID", "PAID")).toBe(true);
  });
});

describe("section normalization", () => {
  it("keeps hero enabled and re-adds it when missing", () => {
    const disabledHero = normalizeSections([
      { code: "S-HERO", name: "Hero", enabled: false, order: 1 },
    ]);
    expect(disabledHero[0].enabled).toBe(true);

    const missingHero = normalizeSections([
      { code: "S-MENU", name: "Menu", enabled: true, order: 1 },
    ]);
    expect(missingHero.some((section) => section.code === "S-HERO")).toBe(true);
    expect(missingHero[0].enabled).toBe(true);
  });
});
