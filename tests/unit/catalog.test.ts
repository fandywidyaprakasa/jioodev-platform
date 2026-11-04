import { describe, expect, it } from "vitest";
import { themeScore, themesForProduct } from "@/shared/lib/catalog-server";
import type { Theme, Template } from "@/shared/types";

function variant(
  code: string,
  tier: "BASIC" | "PRO",
  industries: string[],
  purposes: string[],
): Template {
  return {
    code,
    name: code,
    productType: "LAND",
    layout: "L-MENU",
    style: "EDT",
    industries,
    purposes,
    description: "",
    previewUrl: `/template-preview/${code}`,
    themeId: "demo",
    tier,
  };
}

const theme: Theme = {
  themeId: "demo",
  name: "Demo",
  description: "",
  style: "EDT",
  status: "READY",
  variantCount: 3,
  products: [
    {
      type: "LAND",
      tiers: [
        { tier: "BASIC", variants: [variant("a", "BASIC", ["FNB"], ["ORD"])] },
        {
          tier: "PRO",
          variants: [variant("b", "PRO", ["BEA"], ["VIS", "SSV"])],
        },
      ],
    },
    {
      type: "WEB",
      tiers: [{ tier: "BASIC", variants: [] }],
    },
  ],
};

describe("catalog helpers", () => {
  it("filters themes by product and recomputes variant count", () => {
    const land = themesForProduct([theme], "LAND");
    expect(land).toHaveLength(1);
    expect(land[0].products).toHaveLength(1);
    expect(land[0].products[0].type).toBe("LAND");
    expect(land[0].variantCount).toBe(2);
  });

  it("returns empty when product is unavailable", () => {
    expect(themesForProduct([theme], "COMM")).toEqual([]);
  });

  it("scores themes by industry and purpose", () => {
    expect(themeScore(theme, "BEA", ["VIS"])).toBe(3);
    expect(themeScore(theme, "FNB", ["ORD"])).toBe(3);
    expect(themeScore(theme, "HTH", [])).toBe(0);
  });
});
