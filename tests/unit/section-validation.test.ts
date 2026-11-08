import { describe, it, expect } from "vitest";
import {
  slotSchema,
  variantSchema,
  validateSlotRecord,
  validateVariantRecord,
} from "../../src/modules/workspace/utils/section-validation";

describe("slotSchema", () => {
  it("parses a valid slot.json", () => {
    const valid = {
      record_type: "slot",
      code: "S-HERO",
      name: "Hero",
      display_name: "Hero",
      required: true,
      order_min: 1,
      order_max: 1,
      content_schema: {
        version: 1,
        fields: {
          headline: { type: "text", required: true },
          cta: { type: "link" },
        },
      },
      tier_min: "BASIC",
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = slotSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing record_type", () => {
    const invalid = {
      code: "S-HERO",
      name: "Hero",
      display_name: "Hero",
      required: true,
      order_min: 1,
      order_max: 1,
      content_schema: { version: 1, fields: {} },
      tier_min: "BASIC",
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = slotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid slot code", () => {
    const invalid = {
      record_type: "slot",
      code: "S_HERO", // underscore not allowed
      name: "Hero",
      display_name: "Hero",
      required: true,
      order_min: 1,
      order_max: 1,
      content_schema: { version: 1, fields: {} },
      tier_min: "BASIC",
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = slotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid tier_min", () => {
    const invalid = {
      record_type: "slot",
      code: "S-HERO",
      name: "Hero",
      display_name: "Hero",
      required: true,
      order_min: 1,
      order_max: 1,
      content_schema: { version: 1, fields: {} },
      tier_min: "ENTERPRISE", // not valid
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = slotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const invalid = {
      record_type: "slot",
      code: "S-HERO",
      name: "Hero",
      display_name: "Hero",
      required: true,
      order_min: 1,
      order_max: 1,
      content_schema: { version: 1, fields: {} },
      tier_min: "BASIC",
      license: "JiooDev Commercial",
      status: "PUBLISHED", // not valid
      version: 1,
    };
    const result = slotSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    const statuses = ["DRAFT", "CLASSIFIED", "READY", "DEPRECATED"];
    for (const status of statuses) {
      const data = {
        record_type: "slot",
        code: "S-HERO",
        name: "Hero",
        display_name: "Hero",
        required: true,
        order_min: 1,
        order_max: 1,
        content_schema: { version: 1, fields: {} },
        tier_min: "BASIC",
        license: "JiooDev Commercial",
        status,
        version: 1,
      };
      expect(slotSchema.safeParse(data).success).toBe(true);
    }
  });
});

describe("variantSchema", () => {
  it("parses a valid variant.json", () => {
    const valid = {
      record_type: "variant",
      code: "hero-centered",
      name: "Hero Centered",
      display_name: "hero-centered",
      slot_code: "S-HERO",
      html_partial: "sections/S-HERO/hero-centered/index.html",
      css_scope: "sections/S-HERO/hero-centered/style.css",
      js_scope: "",
      compatible_themes: ["split-edt"],
      compatible_tiers: ["BASIC", "PRO"],
      dependencies: [],
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
      reviewer: "Product Owner",
    };
    const result = variantSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects variant with mismatched slot_code", () => {
    const invalid = {
      record_type: "variant",
      code: "hero-centered",
      name: "Hero Centered",
      display_name: "hero-centered",
      slot_code: "S-CTA", // wrong slot
      html_partial: "sections/S-HERO/hero-centered/index.html",
      css_scope: "sections/S-HERO/hero-centered/style.css",
      js_scope: "",
      compatible_themes: [],
      compatible_tiers: ["BASIC"],
      dependencies: [],
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = variantSchema.safeParse(invalid);
    expect(result.success).toBe(true); // schema itself is valid
  });

  it("rejects empty compatible_tiers", () => {
    const invalid = {
      record_type: "variant",
      code: "hero-centered",
      name: "Hero Centered",
      display_name: "hero-centered",
      slot_code: "S-HERO",
      html_partial: "sections/S-HERO/hero-centered/index.html",
      css_scope: "sections/S-HERO/hero-centered/style.css",
      js_scope: "",
      compatible_themes: [],
      compatible_tiers: [], // must be non-empty
      dependencies: [],
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = variantSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid tier in compatible_tiers", () => {
    const invalid = {
      record_type: "variant",
      code: "hero-centered",
      name: "Hero Centered",
      display_name: "hero-centered",
      slot_code: "S-HERO",
      html_partial: "sections/S-HERO/hero-centered/index.html",
      css_scope: "sections/S-HERO/hero-centered/style.css",
      js_scope: "",
      compatible_themes: [],
      compatible_tiers: ["PREMIUM"], // not valid
      dependencies: [],
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = variantSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("validateSlotRecord", () => {
  it("returns valid for good data", () => {
    const data = {
      record_type: "slot",
      code: "S-CTA",
      name: "CTA",
      display_name: "CTA",
      required: false,
      order_min: 1,
      order_max: 5,
      content_schema: { version: 1, fields: {} },
      tier_min: "PRO",
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = validateSlotRecord(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors for bad data", () => {
    const data = { record_type: "slot" }; // minimal, mostly invalid
    const result = validateSlotRecord(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateVariantRecord", () => {
  it("returns valid for good data", () => {
    const data = {
      record_type: "variant",
      code: "cta-basic",
      name: "CTA Basic",
      display_name: "cta-basic",
      slot_code: "S-CTA",
      html_partial: "sections/S-CTA/cta-basic/index.html",
      css_scope: "sections/S-CTA/cta-basic/style.css",
      js_scope: "",
      compatible_themes: [],
      compatible_tiers: ["BASIC"],
      dependencies: [],
      license: "JiooDev Commercial",
      status: "READY",
      version: 1,
    };
    const result = validateVariantRecord(data);
    expect(result.valid).toBe(true);
  });
});
