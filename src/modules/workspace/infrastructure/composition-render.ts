import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProductType } from "@/shared/types";
import {
  assertSupportedVersions,
  HTML_ADAPTER_ID,
  HTML_ADAPTER_VERSION,
  HTML_CONTENT_SCHEMA_VERSION,
  HTML_HASH_ALGORITHM_VERSION,
  HTML_PLATFORM_CONTRACT_VERSION,
  HTML_RENDERER_VERSION,
  HTML_SNAPSHOT_SCHEMA_VERSION,
} from "@/modules/adapters";
import {
  buildRenderHashInput,
  computeRenderHash,
  DEFAULT_RENDER_OPTIONS,
  enabledBlocks,
  hashAsset,
  normalizeRenderAssetHash,
  normalizeRenderAssetPath,
  sortRenderAssets,
  SUPPORTED_RENDER_MODES,
  type RenderAsset,
  type RenderMode,
  type RenderRequest,
  type RenderResult,
  type RenderWrapper,
} from "@/modules/renderer";

interface CompositionBlock {
  slot: string;
  variant: string;
  enabled: boolean;
  order: number;
}

interface Composition {
  composition_id: string;
  display_name: string;
  slug: string;
  theme_id: string;
  type: "LANDING" | "WEB";
  model: "HTML" | "NEXT" | "OTHER";
  tier: "BASIC" | "PRO" | "AGENCY";
  blocks: CompositionBlock[];
  status: string;
  license: string;
  version?: number;
}

interface Theme {
  theme_id: string;
  status: string;
  tokens?: { color?: { text?: string } };
}

interface Variant {
  code: string;
  slot_code: string;
  html_partial: string;
  css_scope: string;
  js_scope?: string;
  compatible_themes?: string[];
  compatible_tiers?: string[];
  status: string;
}

export interface RenderCompositionOptions {
  themeId?: string;
  tier?: Composition["tier"];
  blocks?: CompositionBlock[];
  content?: Record<string, unknown>;
  renderMode?: RenderMode;
  siteId?: string;
  pageId?: string;
  pageSlug?: string;
  siteSettings?: Record<string, unknown>;
  pageSettings?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  assets?: {
    base_url?: string;
    manifest?: RenderAsset[];
  };
  device?: "web" | "tablet" | "mobile";
  noJs?: boolean;
  locale?: string;
  snapshotSchemaVersion?: number;
  contentSchemaVersion?: number;
  rendererVersion?: string;
  hashAlgorithmVersion?: string;
  platformContractVersion?: string;
  adapterVersion?: string;
  adapterId?: string;
}

export type RenderCompositionResult = RenderResult & {
  composition: Composition;
  theme: Theme;
};

interface PinnedVersions {
  adapterId: string;
  adapterVersion: string;
  platformContractVersion: string;
  contentSchemaVersion: number;
  snapshotSchemaVersion: number;
  rendererVersion: string;
  hashAlgorithmVersion: string;
}

const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:var(--font-body);color:var(--color-text);background:var(--color-bg);line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
a{color:inherit}
h1,h2,h3{font-family:var(--font-display);line-height:1.15;margin:0 0 .5em;font-weight:600}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

function libraryRoot() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

function safeId(value: string) {
  return /^[A-Za-z0-9-]+$/.test(value) ? value : null;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, "utf8")) as T;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getPath(data: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((value, part) => {
    if (value && typeof value === "object" && part in value) {
      return (value as Record<string, unknown>)[part];
    }
    return undefined;
  }, data);
}

function renderTemplate(html: string, data: unknown): string {
  const repeated = html.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_match, key: string, block: string) => {
      const value = getPath(data, key);
      if (!Array.isArray(value)) return "";
      return value.map((item) => renderTemplate(block, item)).join("");
    },
  );

  return repeated.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = getPath(data, key);
    if (value === undefined || value === null) return "";
    return escapeHtml(String(value));
  });
}

async function loadTheme(themeId: string) {
  const dir = path.join(libraryRoot(), "themes", themeId);
  const theme = await readJson<Theme>(path.join(dir, "theme.json"));
  if (theme.status !== "READY") throw new Error(`Theme ${themeId} belum READY.`);
  const css = await fs.readFile(path.join(dir, "tokens.css"), "utf8");
  const rewritten = css.replace(
    /url\((["']?)(fonts\/[^)"']+)\1\)/g,
    `url("/theme-assets/${themeId}/$2")`,
  );
  return { theme, css: rewritten, rawCss: css, cssPath: `themes/${themeId}/tokens.css` };
}

async function loadVariant(
  slot: string,
  variantCode: string,
  themeId: string,
  tier: string,
) {
  const dir = path.join(libraryRoot(), "sections", slot, variantCode);
  const variant = await readJson<Variant>(path.join(dir, "variant.json"));
  if (variant.status !== "READY") throw new Error(`${variantCode} belum READY.`);
  if (variant.slot_code !== slot) throw new Error(`${variantCode} bukan untuk ${slot}.`);
  if (!variant.compatible_themes?.includes(themeId)) {
    throw new Error(`${variantCode} tidak kompatibel dengan ${themeId}.`);
  }
  if (!variant.compatible_tiers?.includes(tier)) {
    throw new Error(`${variantCode} tidak kompatibel dengan tier ${tier}.`);
  }
  if (variant.js_scope) throw new Error(`${variantCode} memakai JS; Basic harus tanpa JS.`);
  const html = await fs.readFile(path.join(libraryRoot(), variant.html_partial), "utf8");
  const css = await fs.readFile(path.join(libraryRoot(), variant.css_scope), "utf8");
  return { variant, html, css, cssPath: variant.css_scope };
}

function collectCssReferences(css: string): string[] {
  const references: string[] = [];
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]+))\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    const reference = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (reference) references.push(reference);
  }
  return references;
}

type CssAssetResolution =
  | { type: "skip" }
  | { type: "escape" }
  | { type: "asset"; path: string };

export function resolveCssAssetPath(baseDir: string, reference: string): CssAssetResolution {
  const cleaned = reference.split("?")[0].split("#")[0].trim();
  if (!cleaned || cleaned.startsWith("#")) return { type: "skip" };
  if (cleaned.startsWith("/")) return { type: "skip" };
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleaned)) return { type: "skip" };

  const segments =
    baseDir === "." || baseDir === ""
      ? []
      : baseDir.split("/").filter((segment) => segment && segment !== ".");
  let escaped = false;
  for (const part of cleaned.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (segments.length === 0) {
        escaped = true;
        break;
      }
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  if (escaped) return { type: "escape" };
  if (segments.length === 0) return { type: "skip" };
  return { type: "asset", path: segments.join("/") };
}

export async function collectCssAssets(
  cssPath: string,
  cssContent: string,
  assets: RenderAsset[],
  root: string,
) {
  const baseDir = path.posix.dirname(cssPath);
  const rootPath = path.resolve(root);
  let realRoot: string;
  try {
    realRoot = await fs.realpath(rootPath);
  } catch {
    throw new Error(`Asset root not found or unreadable: ${rootPath}`);
  }
  for (const reference of collectCssReferences(cssContent)) {
    const resolved = resolveCssAssetPath(baseDir, reference);
    if (resolved.type === "skip") continue;
    if (resolved.type === "escape") {
      throw new Error(`Asset path out of root: ${reference}`);
    }
    const normalized = normalizeRenderAssetPath(resolved.path);
    if (!normalized) {
      throw new Error(`Asset path is not a confined relative path: ${reference}`);
    }
    const absolute = path.resolve(rootPath, ...normalized.split("/"));
    if (
      absolute !== rootPath &&
      !absolute.startsWith(rootPath + path.sep)
    ) {
      throw new Error(`Asset path out of root: ${reference}`);
    }
    let realAbsolute: string;
    try {
      realAbsolute = await fs.realpath(absolute);
    } catch {
      throw new Error(`Asset not found or unreadable: ${normalized}`);
    }
    if (
      realAbsolute !== realRoot &&
      !realAbsolute.startsWith(realRoot + path.sep)
    ) {
      throw new Error(`Asset path out of root: ${reference}`);
    }
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(realAbsolute);
    } catch {
      throw new Error(`Asset not found or unreadable: ${normalized}`);
    }
    const hash = hashAsset(buffer);
    const existing = assets.find((entry) => entry.path === normalized);
    if (existing && existing.hash !== hash) {
      throw new Error(`Asset hash mismatch for path: ${normalized}`);
    }
    if (!existing) assets.push({ path: normalized, hash });
  }
}

function wrapperFromSeo(seo: Record<string, unknown> | undefined): RenderWrapper {
  return {
    title: typeof seo?.title === "string" ? seo.title : "",
    description: typeof seo?.description === "string" ? seo.description : "",
    canonical: typeof seo?.canonical === "string" ? seo.canonical : "",
    noindex: Boolean(seo?.noindex),
  };
}

function resolvePinnedVersions(
  options: RenderCompositionOptions,
): PinnedVersions {
  return {
    adapterId: options.adapterId ?? HTML_ADAPTER_ID,
    adapterVersion: options.adapterVersion ?? HTML_ADAPTER_VERSION,
    platformContractVersion:
      options.platformContractVersion ?? HTML_PLATFORM_CONTRACT_VERSION,
    contentSchemaVersion:
      options.contentSchemaVersion ?? HTML_CONTENT_SCHEMA_VERSION,
    snapshotSchemaVersion:
      options.snapshotSchemaVersion ?? HTML_SNAPSHOT_SCHEMA_VERSION,
    rendererVersion: options.rendererVersion ?? HTML_RENDERER_VERSION,
    hashAlgorithmVersion:
      options.hashAlgorithmVersion ?? HTML_HASH_ALGORITHM_VERSION,
  };
}

function assertPinnedVersions(pinned: PinnedVersions) {
  assertSupportedVersions({
    adapter_id: pinned.adapterId,
    adapter_version: pinned.adapterVersion,
    platform_contract_version: pinned.platformContractVersion,
    content_schema_version: pinned.contentSchemaVersion,
    snapshot_schema_version: pinned.snapshotSchemaVersion,
    renderer_version: pinned.rendererVersion,
    hash_algorithm_version: pinned.hashAlgorithmVersion,
  });
}

function assertRequestShape(request: RenderRequest, rendererVersion: string) {
  if (!request || typeof request !== "object") {
    throw new Error("RenderRequest tidak valid.");
  }
  if (request.contract_version !== HTML_PLATFORM_CONTRACT_VERSION) {
    throw new Error(
      `Unsupported contract_version: ${String(request.contract_version)}.`,
    );
  }
  if (!SUPPORTED_RENDER_MODES.includes(request.render_mode)) {
    throw new Error(
      `Unsupported render_mode: ${String(request.render_mode)}.`,
    );
  }
  assertSupportedVersions({
    adapter_id: request.adapter?.id,
    adapter_version: request.adapter?.version,
    platform_contract_version: request.contract_version,
    content_schema_version: request.snapshot?.content_schema_version,
    snapshot_schema_version: request.snapshot?.snapshot_schema_version,
    renderer_version: rendererVersion,
    hash_algorithm_version: request.hash_algorithm_version,
  });
  const snapshot = request.snapshot;
  if (!snapshot?.composition || typeof snapshot.composition !== "object") {
    throw new Error("Snapshot tidak lengkap: composition wajib ada.");
  }
  if (!safeId(snapshot.composition.composition_id)) {
    throw new Error("Composition ID tidak valid.");
  }
  if (!safeId(snapshot.composition.theme_id)) {
    throw new Error("Theme ID tidak valid.");
  }
  if (!["BASIC", "PRO", "AGENCY"].includes(snapshot.composition.tier)) {
    throw new Error("Tier tidak didukung.");
  }
  if (
    typeof snapshot.composition.composition_version !== "string" ||
    !snapshot.composition.composition_version.trim()
  ) {
    throw new Error(
      "Snapshot tidak lengkap: composition_version wajib ada.",
    );
  }
  if (!Array.isArray(snapshot.composition.blocks)) {
    throw new Error("Snapshot tidak lengkap: blocks wajib berupa array.");
  }
  if (snapshot.composition.blocks.length === 0) {
    throw new Error("Snapshot tidak lengkap: blocks tidak boleh kosong.");
  }
  for (const block of snapshot.composition.blocks) {
    if (!safeId(block.slot) || !safeId(block.variant)) {
      throw new Error("Slot atau variant tidak valid.");
    }
  }
  if (!snapshot.content || typeof snapshot.content !== "object") {
    throw new Error("Snapshot tidak lengkap: content wajib ada.");
  }
  if (!snapshot.assets || !Array.isArray(snapshot.assets.manifest)) {
    throw new Error("Snapshot tidak lengkap: assets.manifest wajib ada.");
  }
  if (!snapshot.site || typeof snapshot.site !== "object") {
    throw new Error("Snapshot tidak lengkap: site wajib ada.");
  }
  if (!snapshot.page || typeof snapshot.page !== "object") {
    throw new Error("Snapshot tidak lengkap: page wajib ada.");
  }
  if (!request.options || typeof request.options !== "object") {
    throw new Error("Snapshot tidak lengkap: options wajib ada.");
  }
  if (!["web", "tablet", "mobile"].includes(request.options.device)) {
    throw new Error("Render option device tidak didukung.");
  }
  if (typeof request.options.no_js !== "boolean") {
    throw new Error("Render option no_js wajib berupa boolean.");
  }
  if (
    typeof request.options.locale !== "string" ||
    !request.options.locale.trim()
  ) {
    throw new Error("Render option locale wajib ada.");
  }
}

async function executeRender(
  request: RenderRequest,
  context: { defaultContent?: Record<string, unknown>; title?: string } = {},
) {
  assertRequestShape(request, HTML_RENDERER_VERSION);

  const snapshot = request.snapshot;
  const themeId = snapshot.composition.theme_id;
  const tier = snapshot.composition.tier;
  const loadedTheme = await loadTheme(themeId);
  const themeTokenHash = hashAsset(loadedTheme.css);
  const blocks = enabledBlocks(snapshot.composition.blocks);
  const sections: string[] = [];
  const styles: string[] = [];
  const finalContent: Record<string, unknown> = {};
  const assets: RenderAsset[] = [
    {
      path: `themes/${themeId}/tokens.css`,
      hash: themeTokenHash,
    },
  ];

  const root = libraryRoot();
  await collectCssAssets(
    loadedTheme.cssPath,
    loadedTheme.rawCss,
    assets,
    root,
  );

  for (const block of blocks) {
    const loaded = await loadVariant(block.slot, block.variant, themeId, tier);
    const content =
      snapshot.content[block.slot] ??
      context.defaultContent?.[block.slot] ??
      {};
    finalContent[block.slot] = content;
    const htmlPath = normalizeRenderAssetPath(loaded.variant.html_partial);
    if (!htmlPath) {
      throw new Error(
        `Asset path is not a confined relative path: ${String(
          loaded.variant.html_partial,
        )}`,
      );
    }
    const cssPath = normalizeRenderAssetPath(loaded.variant.css_scope);
    if (!cssPath) {
      throw new Error(
        `Asset path is not a confined relative path: ${String(
          loaded.variant.css_scope,
        )}`,
      );
    }
    assets.push({
      path: htmlPath,
      hash: hashAsset(loaded.html),
    });
    assets.push({
      path: cssPath,
      hash: hashAsset(loaded.css),
    });
    await collectCssAssets(cssPath, loaded.css, assets, root);
    sections.push(
      `<div data-slot="${escapeHtml(block.slot)}" data-variant="${escapeHtml(block.variant)}">${renderTemplate(loaded.html, content)}</div>`,
    );
    styles.push(loaded.css);
  }

  for (const asset of snapshot.assets.manifest) {
    const normalizedPath = normalizeRenderAssetPath(asset?.path);
    if (!normalizedPath) {
      throw new Error(
        `Asset path is not a confined relative path: ${String(asset?.path)}`,
      );
    }
    const normalizedHash = normalizeRenderAssetHash(asset?.hash);
    if (!normalizedHash) {
      throw new Error(
        `Asset hash is invalid: ${String(asset?.hash)}`,
      );
    }
    const existing = assets.find((entry) => entry.path === normalizedPath);
    if (existing && existing.hash !== normalizedHash) {
      throw new Error(`Asset hash mismatch for path: ${normalizedPath}`);
    }
    if (!existing) assets.push({ path: normalizedPath, hash: normalizedHash });
  }
  const resolvedAssets = sortRenderAssets(assets);

  const renderHash = computeRenderHash(
    buildRenderHashInput(request, {
      renderer_version: HTML_RENDERER_VERSION,
      theme_token_hash: themeTokenHash,
      content: finalContent,
      assets: resolvedAssets,
    }),
  );

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(context.title ?? snapshot.composition.display_name ?? snapshot.composition.composition_id)} — JiooDev</title>
<style>${BASE_CSS}\n${loadedTheme.css}\n${styles.join("\n")}</style>
</head>
<body>${sections.join("\n")}</body>
</html>`;

  return {
    result: {
      status: "READY",
      html,
      assets: resolvedAssets,
      render_hash: renderHash,
      hash_algorithm_version: request.hash_algorithm_version,
      renderer_version: HTML_RENDERER_VERSION,
      diagnostics: [],
      warnings: [],
      wrapper: wrapperFromSeo(snapshot.page.seo),
    } satisfies RenderResult,
    theme: loadedTheme.theme,
  };
}

function failedRenderResult(
  error: unknown,
  hashAlgorithmVersion: string,
  wrapper: RenderWrapper,
): RenderResult {
  return {
    status: "FAILED",
    html: "",
    assets: [],
    render_hash: "",
    hash_algorithm_version: hashAlgorithmVersion,
    renderer_version: HTML_RENDERER_VERSION,
    diagnostics: [error instanceof Error ? error.message : String(error)],
    warnings: [],
    wrapper,
  };
}

export async function renderCompositionRequest(
  request: RenderRequest,
): Promise<RenderResult> {
  const hashAlgorithmVersion =
    typeof request?.hash_algorithm_version === "string"
      ? request.hash_algorithm_version
      : HTML_HASH_ALGORITHM_VERSION;
  try {
    const executed = await executeRender(request);
    return executed.result;
  } catch (error) {
    return failedRenderResult(
      error,
      hashAlgorithmVersion,
      wrapperFromSeo(request?.snapshot?.page?.seo),
    );
  }
}

export async function renderComposition(
  compositionId: string,
  options: RenderCompositionOptions = {},
): Promise<RenderCompositionResult> {
  if (!safeId(compositionId)) throw new Error("Composition ID tidak valid.");

  const dir = path.join(libraryRoot(), "compositions", compositionId);
  const composition = await readJson<Composition>(path.join(dir, "composition.json"));
  const defaultContent = await readJson<Record<string, unknown>>(path.join(dir, "content.json"));
  if (composition.type !== "LANDING") throw new Error("Composition type tidak didukung.");
  if (composition.model !== "HTML") throw new Error("Composition model tidak didukung.");
  if (composition.status !== "READY") throw new Error("Composition belum READY.");

  const pinned = resolvePinnedVersions(options);
  assertPinnedVersions(pinned);
  const themeId = options.themeId ?? composition.theme_id;
  if (!safeId(themeId)) throw new Error("Theme ID tidak valid.");
  const tier = options.tier ?? composition.tier;
  if (!["BASIC", "PRO", "AGENCY"].includes(tier)) {
    throw new Error("Tier tidak didukung.");
  }
  const blocks = (options.blocks ?? composition.blocks)
    .filter((block) => block.enabled)
    .sort((a, b) => a.order - b.order);
  for (const block of blocks) {
    if (!safeId(block.slot) || !safeId(block.variant)) {
      throw new Error("Slot atau variant tidak valid.");
    }
  }

  const request: RenderRequest = {
    contract_version: HTML_PLATFORM_CONTRACT_VERSION as "0.1",
    hash_algorithm_version: pinned.hashAlgorithmVersion,
    adapter: {
      id: pinned.adapterId,
      version: pinned.adapterVersion,
    },
    render_mode: options.renderMode ?? "canvas",
    snapshot: {
      snapshot_schema_version: pinned.snapshotSchemaVersion,
      content_schema_version: pinned.contentSchemaVersion,
      site: {
        site_id: options.siteId ?? compositionId,
        site_settings: options.siteSettings ?? {},
      },
      page: {
        id: options.pageId ?? "legacy",
        slug: options.pageSlug ?? "",
        seo: options.seo ?? {},
        settings: options.pageSettings ?? {},
      },
      composition: {
        composition_id: composition.composition_id,
        display_name: composition.display_name,
        composition_version: String(composition.version ?? 1),
        theme_id: themeId,
        theme_token_hash: "",
        tier,
        blocks,
      },
      content: options.content ?? {},
      assets: {
        base_url: options.assets?.base_url ?? "",
        manifest: options.assets?.manifest ?? [],
      },
    },
    options: {
      device: options.device ?? DEFAULT_RENDER_OPTIONS.device,
      no_js: options.noJs ?? DEFAULT_RENDER_OPTIONS.no_js,
      locale: options.locale ?? DEFAULT_RENDER_OPTIONS.locale,
    },
  };

  const executed = await executeRender(request, {
    defaultContent,
    title: composition.display_name,
  });
  return {
    ...executed.result,
    composition: { ...composition, theme_id: themeId, tier },
    theme: executed.theme,
  };
}

export type { Composition, CompositionBlock, ProductType };

export async function renderVariantPreview(
  slot: string,
  variantCode: string,
  content: unknown = {},
) {
  if (!safeId(slot) || !safeId(variantCode)) throw new Error("Variant tidak valid.");
  const theme = await loadTheme("split-edt");
  const loaded = await loadVariant(slot, variantCode, "split-edt", "BASIC");
  const body = renderTemplate(loaded.html, content);
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(slot)} / ${escapeHtml(variantCode)} — JiooDev</title>
<style>${BASE_CSS}\n${theme.css}\n${loaded.css}</style>
</head>
<body><div data-slot="${slot}" data-variant="${variantCode}">${body}</div></body>
</html>`;
}
