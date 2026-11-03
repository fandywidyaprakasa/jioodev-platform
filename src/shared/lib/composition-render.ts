import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProductType } from "@/shared/types";

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
  return { theme, css: rewritten };
}

async function loadVariant(slot: string, variantCode: string, themeId: string, tier: string) {
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
  return { variant, html, css };
}

export async function renderComposition(
  compositionId: string,
  options: RenderCompositionOptions = {},
) {
  if (!safeId(compositionId)) throw new Error("Composition ID tidak valid.");

  const dir = path.join(libraryRoot(), "compositions", compositionId);
  const composition = await readJson<Composition>(path.join(dir, "composition.json"));
  const defaultContent = await readJson<Record<string, unknown>>(path.join(dir, "content.json"));
  if (composition.status !== "READY") throw new Error("Composition belum READY.");

  const themeId = options.themeId ?? composition.theme_id;
  const tier = options.tier ?? composition.tier;
  const blocks = (options.blocks ?? composition.blocks)
    .filter((block) => block.enabled)
    .sort((a, b) => a.order - b.order);

  const theme = await loadTheme(themeId);
  const sections: string[] = [];
  const styles: string[] = [];

  for (const block of blocks) {
    const loaded = await loadVariant(block.slot, block.variant, themeId, tier);
    const content = options.content?.[block.slot] ?? defaultContent[block.slot] ?? {};
    sections.push(
      `<div data-slot="${block.slot}" data-variant="${block.variant}">${renderTemplate(loaded.html, content)}</div>`,
    );
    styles.push(loaded.css);
  }

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(composition.display_name)} — JiooDev</title>
<style>${BASE_CSS}\n${theme.css}\n${styles.join("\n")}</style>
</head>
<body>${sections.join("\n")}</body>
</html>`;

  return {
    html,
    composition: { ...composition, theme_id: themeId, tier },
    theme: theme.theme,
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
