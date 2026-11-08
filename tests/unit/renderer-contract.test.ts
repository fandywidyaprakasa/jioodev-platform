import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadWorkspace,
  renderComposition,
  renderCompositionRequest,
  type RenderMode,
  type RenderRequest,
} from "@/modules/workspace";
import { renderSiteSnapshot } from "@/modules/projects";
import {
  buildRenderHashInput,
  computeRenderHash,
} from "@/modules/renderer";

const FIXTURE_LIBRARY = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "library",
);

async function makeRequest(
  overrides: Partial<RenderRequest> = {},
): Promise<RenderRequest> {
  const base = await loadWorkspace("split-editorial-basic-v1");
  if (!base) throw new Error("fixture composition missing");
  const request: RenderRequest = {
    contract_version: "0.1",
    hash_algorithm_version: "uwps-render-hash/1",
    adapter: { id: "html", version: "1" },
    render_mode: "canvas",
    snapshot: {
      snapshot_schema_version: 1,
      content_schema_version: 1,
      site: { site_id: "proj_test", site_settings: {} },
      page: { id: "page_test", slug: "", seo: {}, settings: {} },
      composition: {
        composition_id: base.composition.composition_id,
        display_name: base.composition.display_name,
        composition_version: "1",
        theme_id: base.composition.theme_id,
        theme_token_hash: "",
        tier: base.composition.tier,
        blocks: base.composition.blocks,
      },
      content: base.content,
      assets: { base_url: "", manifest: [] },
    },
    options: { device: "web", no_js: true, locale: "id" },
  };
  return { ...request, ...overrides };
}

async function withLibrary<T>(root: string, run: () => Promise<T>) {
  const previous = process.env.JIOODEV_LIBRARY_DIR;
  process.env.JIOODEV_LIBRARY_DIR = root;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.JIOODEV_LIBRARY_DIR;
    else process.env.JIOODEV_LIBRARY_DIR = previous;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renderer contract hash", () => {
  it("is stable, canonical, and versioned", async () => {
    const first = await renderComposition("split-editorial-basic-v1");
    const second = await renderComposition("split-editorial-basic-v1");

    expect(first.render_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(first.render_hash).toBe(second.render_hash);
    expect(first.html).toBe(second.html);
    expect(first.hash_algorithm_version).toBe("uwps-render-hash/1");
    expect(first.renderer_version).toBe("1");

    const hero = { eyebrow: "Atas", headline: "Judul", subheadline: "Bawah" };
    const reversed = Object.fromEntries(Object.entries(hero).reverse());
    const ordered = await renderComposition("split-editorial-basic-v1", {
      content: { "S-HERO": hero },
    });
    const reordered = await renderComposition("split-editorial-basic-v1", {
      content: { "S-HERO": reversed },
    });

    expect(reordered.render_hash).toBe(ordered.render_hash);
  });

  it("changes when content, theme, tier, or variant changes", async () => {
    await withLibrary(FIXTURE_LIBRARY, async () => {
      const content = { "S-HERO": { headline: "Satu" } };
      const base = await renderComposition("test-basic", { content });
      const nextContent = await renderComposition("test-basic", {
        content: { "S-HERO": { headline: "Dua" } },
      });
      const nextTheme = await renderComposition("test-basic", {
        content,
        themeId: "alt",
      });
      const nextTier = await renderComposition("test-basic", {
        content,
        tier: "PRO",
      });
      const nextVariant = await renderComposition("test-basic", {
        content,
        blocks: [
          { slot: "S-HERO", variant: "hero-alt", enabled: true, order: 1 },
        ],
      });

      const hashes = [
        base.render_hash,
        nextContent.render_hash,
        nextTheme.render_hash,
        nextTier.render_hash,
        nextVariant.render_hash,
      ];
      expect(new Set(hashes).size).toBe(hashes.length);

      const withDisabled = await renderComposition("test-basic", {
        content,
        blocks: [
          { slot: "S-HERO", variant: "hero-split", enabled: true, order: 1 },
          { slot: "S-BEN", variant: "missing", enabled: false, order: 2 },
        ],
      });
      expect(withDisabled.render_hash).toBe(base.render_hash);
    });
  });

  it("binds adapter, renderer, option, and snapshot versions into the hash", async () => {
    const request = await makeRequest();
    const resolution = {
      renderer_version: "1",
      theme_token_hash: "sha256:theme",
      content: request.snapshot.content,
      assets: [],
    };
    const base = buildRenderHashInput(request, resolution);
    const baseHash = computeRenderHash(base);

    const adapterChanged = computeRenderHash(
      buildRenderHashInput(
        { ...request, adapter: { id: "html", version: "2" } },
        resolution,
      ),
    );
    const rendererChanged = computeRenderHash(
      buildRenderHashInput(request, {
        ...resolution,
        renderer_version: "2",
      }),
    );
    const optionsChanged = computeRenderHash(
      buildRenderHashInput(
        {
          ...request,
          options: { ...request.options, locale: "en" },
        },
        resolution,
      ),
    );
    const snapshotChanged = computeRenderHash(
      buildRenderHashInput(
        {
          ...request,
          snapshot: { ...request.snapshot, snapshot_schema_version: 2 },
        },
        resolution,
      ),
    );

    expect(
      new Set([
        baseHash,
        adapterChanged,
        rendererChanged,
        optionsChanged,
        snapshotChanged,
      ]).size,
    ).toBe(5);
  });

  it("excludes render_mode, SEO, and canonical wrapper metadata", async () => {
    const request = await makeRequest();
    const canvas = await renderCompositionRequest({
      ...request,
      render_mode: "canvas",
      snapshot: {
        ...request.snapshot,
        page: {
          ...request.snapshot.page,
          seo: {
            title: "Canvas",
            description: "canvas",
            canonical: "/canvas",
            noindex: true,
          },
        },
      },
    });
    const publish = await renderCompositionRequest({
      ...request,
      render_mode: "publish",
      snapshot: {
        ...request.snapshot,
        page: {
          ...request.snapshot.page,
          seo: {
            title: "Publish",
            description: "publish",
            canonical: "/publish",
            noindex: false,
          },
        },
      },
    });

    expect(canvas.status).toBe("READY");
    expect(publish.status).toBe("READY");
    expect(canvas.render_hash).toBe(publish.render_hash);
    expect(canvas.html).toBe(publish.html);
    expect(canvas.wrapper.title).toBe("Canvas");
    expect(publish.wrapper.title).toBe("Publish");
  });

  it("includes locally resolved theme and variant asset inputs", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renderer-assets-"));
    try {
      await fs.cp(FIXTURE_LIBRARY, root, { recursive: true });
      await withLibrary(root, async () => {
        const options = { content: { "S-HERO": { headline: "Lokal" } } };
        const before = await renderComposition("test-basic", options);

        await fs.appendFile(
          path.join(root, "themes", "base", "tokens.css"),
          "\n:root{--probe:1}",
        );
        const themeChanged = await renderComposition("test-basic", options);
        expect(themeChanged.render_hash).not.toBe(before.render_hash);

        await fs.appendFile(
          path.join(root, "sections", "S-HERO", "hero-split", "style.css"),
          "\n.probe{}",
        );
        const variantChanged = await renderComposition("test-basic", options);
        expect(variantChanged.render_hash).not.toBe(themeChanged.render_hash);
      });
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe("renderer contract parity", () => {
  it("uses the same snapshot function for canvas, preview, publish, and typed requests", async () => {
    const base = await loadWorkspace("split-editorial-basic-v1");
    expect(base).not.toBeNull();
    if (!base) return;

    const snapshot = {
      compositionId: base.composition.composition_id,
      themeId: base.composition.theme_id,
      tier: base.composition.tier,
      blocks: base.composition.blocks,
      content: base.content,
    };
    const viaCanvas = await renderComposition(base.composition.composition_id, {
      themeId: snapshot.themeId,
      tier: snapshot.tier,
      blocks: snapshot.blocks,
      content: snapshot.content,
      renderMode: "canvas",
    });
    const viaPreview = await renderSiteSnapshot(snapshot, {
      renderMode: "preview",
    });
    const viaPublish = await renderSiteSnapshot(snapshot, {
      renderMode: "publish",
    });
    const viaRequest = await renderCompositionRequest(await makeRequest());

    expect(viaPreview.render_hash).toBe(viaCanvas.render_hash);
    expect(viaPublish.render_hash).toBe(viaCanvas.render_hash);
    expect(viaRequest.render_hash).toBe(viaCanvas.render_hash);
    expect(viaPreview.html).toBe(viaCanvas.html);
    expect(viaPublish.html).toBe(viaCanvas.html);
    expect(viaRequest.html).toBe(viaCanvas.html);
  });
});

describe("renderer contract purity and failure", () => {
  it("does not write files or domain records while rendering", async () => {
    const base = await loadWorkspace("split-editorial-basic-v1");
    expect(base).not.toBeNull();
    if (!base) return;

    const writeMethods = [
      "writeFile",
      "appendFile",
      "mkdir",
      "rm",
      "unlink",
      "rename",
      "copyFile",
    ] as const;
    const spies = writeMethods.map((method) =>
      vi.spyOn(fs, method as never),
    );

    await renderComposition(base.composition.composition_id);
    await renderSiteSnapshot({
      compositionId: base.composition.composition_id,
      themeId: base.composition.theme_id,
      tier: base.composition.tier,
      blocks: base.composition.blocks,
      content: base.content,
    });

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("fails closed with diagnostics for unsupported modes and versions", async () => {
    const request = await makeRequest();
    const unsupportedMode = await renderCompositionRequest({
      ...request,
      render_mode: "print" as RenderMode,
    });
    const unsupportedAdapter = await renderCompositionRequest({
      ...request,
      adapter: { id: "next", version: "1" },
    });
    const unsupportedSnapshot = await renderCompositionRequest({
      ...request,
      snapshot: { ...request.snapshot, snapshot_schema_version: 999 },
    });
    const unsupportedHash = await renderCompositionRequest({
      ...request,
      hash_algorithm_version: "uwps-render-hash/9",
    });

    for (const result of [
      unsupportedMode,
      unsupportedAdapter,
      unsupportedSnapshot,
      unsupportedHash,
    ]) {
      expect(result.status).toBe("FAILED");
      expect(result.html).toBe("");
      expect(result.render_hash).toBe("");
      expect(result.diagnostics.length).toBeGreaterThan(0);
    }
    expect(unsupportedMode.diagnostics.join(" ")).toMatch(/render_mode/);
    expect(unsupportedAdapter.diagnostics.join(" ")).toMatch(/adapter/i);
    expect(unsupportedSnapshot.diagnostics.join(" ")).toMatch(
      /snapshot_schema_version/,
    );
    expect(unsupportedHash.diagnostics.join(" ")).toMatch(
      /hash_algorithm_version/,
    );
  });

  it("fails closed with diagnostics for incomplete snapshots", async () => {
    const request = await makeRequest();
    const missingTheme = await renderCompositionRequest({
      ...request,
      snapshot: {
        ...request.snapshot,
        composition: { ...request.snapshot.composition, theme_id: "" },
      },
    });
    const missingContent = await renderCompositionRequest({
      ...request,
      snapshot: {
        ...request.snapshot,
        content: undefined as unknown as Record<string, unknown>,
      },
    });
    const missingAssets = await renderCompositionRequest({
      ...request,
      snapshot: {
        ...request.snapshot,
        assets: undefined as unknown as RenderRequest["snapshot"]["assets"],
      },
    });
    const emptyBlocks = await renderCompositionRequest({
      ...request,
      snapshot: {
        ...request.snapshot,
        composition: { ...request.snapshot.composition, blocks: [] },
      },
    });

    expect(missingTheme.status).toBe("FAILED");
    expect(missingTheme.diagnostics.join(" ")).toMatch(/Theme ID/);
    expect(missingContent.status).toBe("FAILED");
    expect(missingContent.diagnostics.join(" ")).toMatch(/content/);
    expect(missingAssets.status).toBe("FAILED");
    expect(missingAssets.diagnostics.join(" ")).toMatch(/assets/);
    expect(emptyBlocks.status).toBe("FAILED");
    expect(emptyBlocks.diagnostics.join(" ")).toMatch(/blocks/);
  });

  it("keeps the legacy throwing call site fail-closed", async () => {
    await expect(
      renderComposition("split-editorial-basic-v1", {
        renderMode: "print" as RenderMode,
      }),
    ).rejects.toThrow(/Unsupported render_mode/);

    await expect(
      renderComposition("split-editorial-basic-v1", {
        snapshotSchemaVersion: 999,
      }),
    ).rejects.toThrow(/Unsupported snapshot_schema_version/);
  });
});
