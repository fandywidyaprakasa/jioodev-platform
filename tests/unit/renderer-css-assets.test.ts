import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectCssAssets, resolveCssAssetPath } from "@/modules/workspace";
import type { RenderAsset } from "@/modules/renderer";

describe("CSS asset path resolution", () => {
  it("resolves a relative asset inside the base directory", () => {
    expect(resolveCssAssetPath("themes/split-edt", "fonts/dm-sans.woff2")).toEqual({
      type: "asset",
      path: "themes/split-edt/fonts/dm-sans.woff2",
    });
  });

  it("resolves a parent reference that stays inside the root", () => {
    expect(resolveCssAssetPath("themes/split-edt/css", "../fonts/dm-sans.woff2")).toEqual({
      type: "asset",
      path: "themes/split-edt/fonts/dm-sans.woff2",
    });
  });

  it("marks an escaping parent reference", () => {
    expect(resolveCssAssetPath("themes/split-edt", "../../../secret.txt")).toEqual({
      type: "escape",
    });
  });

  it("marks a root-level parent reference as escaping", () => {
    expect(resolveCssAssetPath(".", "../secret.txt")).toEqual({ type: "escape" });
    expect(resolveCssAssetPath("", "../secret.txt")).toEqual({ type: "escape" });
  });

  it("skips absolute, protocol, and fragment-only references", () => {
    expect(resolveCssAssetPath("themes/split-edt", "/api/projects/p1/assets/a/file")).toEqual({ type: "skip" });
    expect(resolveCssAssetPath("themes/split-edt", "https://cdn.example.com/x.css")).toEqual({ type: "skip" });
    expect(resolveCssAssetPath("themes/split-edt", "#anchor")).toEqual({ type: "skip" });
  });
});

describe("CSS asset collection", () => {
  let root = "";

  afterEach(async () => {
    if (root) await fs.rm(root, { recursive: true, force: true });
    root = "";
  });

  it("collects a referenced file and hashes its bytes", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "css-assets-"));
    const assetDir = path.join(root, "themes", "split-edt", "fonts");
    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(path.join(assetDir, "dm-sans.woff2"), "font-bytes");
    const css = 'body { font-family: url("fonts/dm-sans.woff2"); }';
    const assets: RenderAsset[] = [];
    await collectCssAssets("themes/split-edt/tokens.css", css, assets, root);
    expect(assets).toEqual([
      { path: "themes/split-edt/fonts/dm-sans.woff2", hash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/) },
    ]);
  });

  it("fails closed when a referenced file is missing", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "css-assets-"));
    await fs.mkdir(path.join(root, "themes", "split-edt"), { recursive: true });
    const css = 'body { background: url("missing.png"); }';
    const assets: RenderAsset[] = [];
    await expect(
      collectCssAssets("themes/split-edt/tokens.css", css, assets, root),
    ).rejects.toThrow(/Asset not found or unreadable/);
  });

  it("fails closed when a reference escapes the root", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "css-assets-"));
    await fs.mkdir(path.join(root, "themes", "split-edt"), { recursive: true });
    const css = 'body { background: url("../../../etc/passwd"); }';
    const assets: RenderAsset[] = [];
    await expect(
      collectCssAssets("themes/split-edt/tokens.css", css, assets, root),
    ).rejects.toThrow(/Asset path out of root/);
  });

  it("detects a hash mismatch for the same path", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "css-assets-"));
    const assetDir = path.join(root, "themes", "split-edt", "fonts");
    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(path.join(assetDir, "dm-sans.woff2"), "first");
    const assets: RenderAsset[] = [
      { path: "themes/split-edt/fonts/dm-sans.woff2", hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000" },
    ];
    const css = 'body { font-family: url("fonts/dm-sans.woff2"); }';
    await expect(
      collectCssAssets("themes/split-edt/tokens.css", css, assets, root),
    ).rejects.toThrow(/Asset hash mismatch/);
  });
});
