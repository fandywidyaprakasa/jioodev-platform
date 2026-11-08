import { createHash } from "node:crypto";
import type {
  RenderAsset,
  RenderBlock,
  RenderRequest,
} from "./contract";

export interface RenderHashResolution {
  renderer_version: string;
  theme_token_hash: string;
  content: Record<string, unknown>;
  assets: RenderAsset[];
}

export interface RenderHashInput {
  hash_algorithm_version: string;
  contract_version: string;
  adapter: {
    id: string;
    version: string;
  };
  renderer_version: string;
  snapshot_schema_version: number;
  composition: {
    composition_id: string;
    composition_version: string;
    theme_id: string;
    theme_token_hash: string;
    tier: string;
  };
  blocks: RenderBlock[];
  content: Record<string, unknown>;
  site_settings: Record<string, unknown>;
  page_settings: Record<string, unknown>;
  assets: {
    manifest: RenderAsset[];
  };
  options: {
    device: string;
    no_js: boolean;
    locale: string;
  };
}

export function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const entry = (value as Record<string, unknown>)[key];
        if (entry !== undefined) acc[key] = canonicalizeJson(entry);
        return acc;
      }, {});
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value));
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashAsset(value: string | Uint8Array): string {
  return `sha256:${sha256Hex(value)}`;
}

export function sortRenderAssets(assets: RenderAsset[]): RenderAsset[] {
  return [...assets].sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.hash.localeCompare(right.hash),
  );
}

export function enabledBlocks(blocks: RenderBlock[]): RenderBlock[] {
  return blocks
    .filter((block) => block.enabled)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.slot.localeCompare(right.slot) ||
        left.variant.localeCompare(right.variant),
    );
}

export function buildRenderHashInput(
  request: RenderRequest,
  resolution: RenderHashResolution,
): RenderHashInput {
  return {
    hash_algorithm_version: request.hash_algorithm_version,
    contract_version: request.contract_version,
    adapter: {
      id: request.adapter.id,
      version: request.adapter.version,
    },
    renderer_version: resolution.renderer_version,
    snapshot_schema_version: request.snapshot.snapshot_schema_version,
    composition: {
      composition_id: request.snapshot.composition.composition_id,
      composition_version: request.snapshot.composition.composition_version,
      theme_id: request.snapshot.composition.theme_id,
      theme_token_hash: resolution.theme_token_hash,
      tier: request.snapshot.composition.tier,
    },
    blocks: enabledBlocks(request.snapshot.composition.blocks),
    content: resolution.content,
    site_settings: request.snapshot.site.site_settings,
    page_settings: request.snapshot.page.settings,
    assets: {
      manifest: sortRenderAssets(resolution.assets),
    },
    options: {
      device: request.options.device,
      no_js: request.options.no_js,
      locale: request.options.locale,
    },
  };
}

export function computeRenderHash(input: RenderHashInput): string {
  return `sha256:${sha256Hex(stableJson(input))}`;
}


export function normalizeRenderAssetPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let candidate = value.trim().replace(/\\/g, "/");
  if (!candidate) return null;
  if (candidate.startsWith("/") || candidate.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) return null;
  while (candidate.startsWith("./")) candidate = candidate.slice(2);
  const segments = candidate.split("/");
  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        /^[a-zA-Z]:$/.test(segment),
    )
  ) {
    return null;
  }
  return segments.join("/");
}

export function normalizeRenderAssetHash(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLowerCase();
  if (/^sha256:[a-f0-9]{64}$/.test(candidate)) return candidate;
  if (/^[a-f0-9]{64}$/.test(candidate)) return `sha256:${candidate}`;
  return null;
}
