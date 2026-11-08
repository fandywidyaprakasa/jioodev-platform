import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

describe("HTML adapter descriptor and conformance", () => {
  it("exposes the supported LAND HTML descriptor", async () => {
    const { HTML_ADAPTER_DESCRIPTOR } = await import("@/modules/adapters");
    expect(HTML_ADAPTER_DESCRIPTOR.adapter_id).toBe("html");
    expect(HTML_ADAPTER_DESCRIPTOR.supported_product_types).toEqual(["LAND"]);
    expect(HTML_ADAPTER_DESCRIPTOR.supports_javascript).toBe(false);
    expect(HTML_ADAPTER_DESCRIPTOR.status).toBe("DRAFT");
  });

  it("passes conformance for the honest DRAFT descriptor", async () => {
    const { validateHtmlAdapterConformance, HTML_ADAPTER_DESCRIPTOR } = await import("@/modules/adapters");
    expect(validateHtmlAdapterConformance(HTML_ADAPTER_DESCRIPTOR)).toEqual([]);
  });

  it("fails conformance when an unsupported product or JS is claimed", async () => {
    const { validateHtmlAdapterConformance, HTML_ADAPTER_DESCRIPTOR } = await import("@/modules/adapters");
    const bad = { ...HTML_ADAPTER_DESCRIPTOR, supported_product_types: ["LAND", "WEB"], supports_javascript: true };
    const errors = validateHtmlAdapterConformance(bad);
    expect(errors.some((error) => error.includes("only LAND"))).toBe(true);
    expect(errors.some((error) => error.includes("supports_javascript"))).toBe(true);
  });

  it("fails closed on unsupported versions", async () => {
    const { assertSupportedVersions } = await import("@/modules/adapters");
    expect(() => assertSupportedVersions({ snapshot_schema_version: 999 })).toThrow(/Unsupported snapshot_schema_version/);
    expect(() => assertSupportedVersions({ renderer_version: "9" })).toThrow(/Unsupported renderer_version/);
  });

  it("accepts supported pinned versions", async () => {
    const { assertSupportedVersions } = await import("@/modules/adapters");
    expect(() => assertSupportedVersions({ snapshot_schema_version: 1, renderer_version: "1", hash_algorithm_version: "uwps-render-hash/1" })).not.toThrow();
  });
});

describe("HTML adapter live render", () => {
  it("renders the repository LAND HTML composition", async () => {
    const { renderComposition } = await import("@/modules/workspace");
    const rendered = await renderComposition("split-editorial-basic-v1");
    expect(rendered.html).toContain("<!doctype html>");
    expect(rendered.html).toContain('data-slot="S-HERO"');
  });

  it("rejects incompatible supplied versions", async () => {
    const { renderComposition } = await import("@/modules/workspace");
    await expect(
      renderComposition("split-editorial-basic-v1", { snapshotSchemaVersion: 999 }),
    ).rejects.toThrow(/Unsupported snapshot_schema_version/);
  });

  it("rejects traversal-like theme, slot, or variant identifiers", async () => {
    const { renderComposition } = await import("@/modules/workspace");
    await expect(
      renderComposition("split-editorial-basic-v1", { themeId: "../secret" }),
    ).rejects.toThrow(/Theme ID tidak valid/);
    await expect(
      renderComposition("split-editorial-basic-v1", {
        blocks: [{ slot: "../x", variant: "hero-split", enabled: true, order: 1 }],
      }),
    ).rejects.toThrow(/Slot atau variant tidak valid/);
  });

  it("rejects a real variant with non-empty js_scope", async () => {
    const { renderComposition } = await import("@/modules/workspace");
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "js-variant-"));
    const previous = process.env.JIOODEV_LIBRARY_DIR;
    try {
      const themeDir = path.join(root, "themes", "split-edt");
      const variantDir = path.join(root, "sections", "S-HERO", "js-hero");
      const compositionDir = path.join(root, "compositions", "js-comp");
      await fs.mkdir(themeDir, { recursive: true });
      await fs.mkdir(variantDir, { recursive: true });
      await fs.mkdir(compositionDir, { recursive: true });
      await fs.writeFile(path.join(themeDir, "theme.json"), JSON.stringify({ theme_id: "split-edt", status: "READY" }));
      await fs.writeFile(path.join(themeDir, "tokens.css"), "body{}");
      await fs.writeFile(path.join(variantDir, "variant.json"), JSON.stringify({
        code: "js-hero",
        slot_code: "S-HERO",
        status: "READY",
        html_partial: "sections/S-HERO/js-hero/index.html",
        css_scope: "sections/S-HERO/js-hero/style.css",
        js_scope: "console.log(1)",
        compatible_themes: ["split-edt"],
        compatible_tiers: ["BASIC"],
      }));
      await fs.writeFile(path.join(variantDir, "index.html"), "<section>JS</section>");
      await fs.writeFile(path.join(variantDir, "style.css"), ".x{}");
      await fs.writeFile(path.join(compositionDir, "composition.json"), JSON.stringify({
        composition_id: "js-comp",
        display_name: "JS Comp",
        slug: "js-comp",
        theme_id: "split-edt",
        type: "LANDING",
        model: "HTML",
        tier: "BASIC",
        blocks: [{ slot: "S-HERO", variant: "js-hero", enabled: true, order: 1 }],
        status: "READY",
        version: 1,
      }));
      await fs.writeFile(path.join(compositionDir, "content.json"), "{}");
      process.env.JIOODEV_LIBRARY_DIR = root;
      await expect(renderComposition("js-comp")).rejects.toThrow(/memakai JS/);
    } finally {
      if (previous === undefined) delete process.env.JIOODEV_LIBRARY_DIR;
      else process.env.JIOODEV_LIBRARY_DIR = previous;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects variant traversal before filesystem access", async () => {
    const { renderComposition } = await import("@/modules/workspace");
    await expect(
      renderComposition("split-editorial-basic-v1", {
        blocks: [{ slot: "S-HERO", variant: "../secret", enabled: true, order: 1 }],
      }),
    ).rejects.toThrow(/Slot atau variant tidak valid/);
  });

  it("fails closed when rendererVersion is an empty string", async () => {
    const { renderComposition } = await import("@/modules/workspace");
    await expect(
      renderComposition("split-editorial-basic-v1", { rendererVersion: "" }),
    ).rejects.toThrow(/Unsupported renderer_version/);
  });

  async function withTempLibrary(composition: Record<string, unknown>, run: () => Promise<void>) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "html-adapter-"));
    const compositionDir = path.join(root, "compositions", String(composition.composition_id));
    await fs.mkdir(compositionDir, { recursive: true });
    await fs.writeFile(path.join(compositionDir, "composition.json"), JSON.stringify(composition));
    await fs.writeFile(path.join(compositionDir, "content.json"), "{}");
    const previous = process.env.JIOODEV_LIBRARY_DIR;
    process.env.JIOODEV_LIBRARY_DIR = root;
    try {
      await run();
    } finally {
      if (previous === undefined) delete process.env.JIOODEV_LIBRARY_DIR;
      else process.env.JIOODEV_LIBRARY_DIR = previous;
      await fs.rm(root, { recursive: true, force: true });
    }
  }

  it("rejects a non-LANDING composition type", async () => {
    const { renderComposition } = await import("@/modules/workspace");
    await withTempLibrary(
      {
        composition_id: "bad-type",
        display_name: "Bad Type",
        slug: "bad-type",
        theme_id: "split-edt",
        type: "WEB",
        model: "HTML",
        tier: "BASIC",
        blocks: [],
        status: "READY",
        version: 1,
      },
      async () => {
        await expect(renderComposition("bad-type")).rejects.toThrow(/Composition type tidak didukung/);
      },
    );
  });

  it("rejects a non-HTML composition model", async () => {
    const { renderComposition } = await import("@/modules/workspace");
    await withTempLibrary(
      {
        composition_id: "bad-model",
        display_name: "Bad Model",
        slug: "bad-model",
        theme_id: "split-edt",
        type: "LANDING",
        model: "NEXT",
        tier: "BASIC",
        blocks: [],
        status: "READY",
        version: 1,
      },
      async () => {
        await expect(renderComposition("bad-model")).rejects.toThrow(/Composition model tidak didukung/);
      },
    );
  });

  it("rejects an empty supplied version override", async () => {
    const { assertSupportedVersions } = await import("@/modules/adapters");
    expect(() => assertSupportedVersions({ renderer_version: "" })).toThrow(/Unsupported renderer_version/);
  });
});
