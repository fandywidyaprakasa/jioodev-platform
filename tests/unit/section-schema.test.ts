import { describe, expect, it } from "vitest";
import {
  parseSections,
  validateSectionContent,
  validateSections,
} from "@/modules/sections";
import type { Section } from "@/shared/types";

const base: Section = {
  code: "S-HERO",
  name: "Hero",
  enabled: true,
  order: 1,
};

describe("parseSections", () => {
  it("rejects invalid payloads", () => {
    expect(parseSections(null).error).toBeTruthy();
    expect(parseSections({}).error).toBeTruthy();
    expect(parseSections([{ name: "Hero" }]).error).toContain("code");
    expect(parseSections([{ code: "S-HERO", content: [] }]).error).toContain(
      "content",
    );
    expect(parseSections([{ code: "S-HERO", order: 0 }]).error).toContain(
      "order",
    );
  });

  it("normalizes fields and accepts snake_case variant", () => {
    const result = parseSections([
      {
        code: "S-HERO",
        variant_id: "hero-split",
        content: { headline: "Halo" },
      },
    ]);
    expect(result.error).toBeUndefined();
    expect(result.sections?.[0]).toMatchObject({
      code: "S-HERO",
      name: "S-HERO",
      enabled: true,
      order: 1,
      variantId: "hero-split",
      content: { headline: "Halo" },
    });
  });
});

describe("validateSections", () => {
  it("accepts a known variant and required content", async () => {
    const errors = await validateSections([
      { ...base, variantId: "hero-split", content: { headline: "Halo" } },
    ]);
    expect(errors).toEqual([]);
  });

  it("rejects unknown variants and invalid slot ownership", async () => {
    expect(
      await validateSections([{ ...base, variantId: "tidak-ada" }]),
    ).toContainEqual(expect.stringContaining("tidak ditemukan"));

    expect(
      await validateSections([{ ...base, variantId: "ben-grid-3" }]),
    ).toContainEqual(expect.stringContaining("tidak ditemukan"));
  });

  it("rejects content that breaks the slot schema", async () => {
    const errors = await validateSections([{ ...base, content: {} }]);
    expect(errors).toContain("S-HERO.headline: wajib diisi.");

    const wrongType = await validateSections([
      { ...base, content: { headline: 123 } },
    ]);
    expect(wrongType).toContain("S-HERO.headline: harus berupa teks.");
  });

  it("validates enum and array fields when present", async () => {
    const slot = {
      code: "S-HERO",
      name: "Hero",
      content_schema: {
        fields: {
          alignment: { type: "enum", values: ["left", "center"] },
          items: { type: "array", required: true },
        },
      },
    };
    expect(
      validateSectionContent(slot, { alignment: "right", items: [] }),
    ).toContain("S-HERO.alignment: harus salah satu dari: left, center.");
    expect(validateSectionContent(slot, { alignment: "left", items: [] })).toEqual(
      [],
    );
  });

  it("rejects duplicate section codes", async () => {
    const errors = await validateSections([base, { ...base, order: 2 }]);
    expect(errors).toContain("S-HERO: duplikat.");
  });
});
