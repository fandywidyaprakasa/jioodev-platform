export type RenderMode = "canvas" | "preview" | "publish";

export type RenderDevice = "web" | "tablet" | "mobile";

export type CompositionTier = "BASIC" | "PRO" | "AGENCY";

export interface RenderBlock {
  slot: string;
  variant: string;
  enabled: boolean;
  order: number;
}

export interface RenderAsset {
  path: string;
  hash: string;
}

export interface RenderSite {
  site_id: string;
  site_settings: Record<string, unknown>;
}

export interface RenderPage {
  id: string;
  slug: string;
  seo: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface RenderComposition {
  composition_id: string;
  display_name?: string;
  composition_version: string;
  theme_id: string;
  theme_token_hash: string;
  tier: CompositionTier;
  blocks: RenderBlock[];
}

export interface RenderSnapshot {
  snapshot_schema_version: number;
  content_schema_version?: number;
  site: RenderSite;
  page: RenderPage;
  composition: RenderComposition;
  content: Record<string, unknown>;
  assets: {
    base_url: string;
    manifest: RenderAsset[];
  };
}

export interface RenderOptions {
  device: RenderDevice;
  no_js: boolean;
  locale: string;
}

export interface RenderRequest {
  contract_version: "0.1";
  hash_algorithm_version: string;
  adapter: {
    id: string;
    version: string;
  };
  render_mode: RenderMode;
  snapshot: RenderSnapshot;
  options: RenderOptions;
}

export interface RenderWrapper {
  title: string;
  description: string;
  canonical: string;
  noindex: boolean;
}

export interface RenderResult {
  status: "READY" | "FAILED";
  html: string;
  assets: RenderAsset[];
  render_hash: string;
  hash_algorithm_version: string;
  renderer_version: string;
  diagnostics: string[];
  warnings: string[];
  wrapper: RenderWrapper;
}

export const SUPPORTED_RENDER_MODES: readonly RenderMode[] = [
  "canvas",
  "preview",
  "publish",
];

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  device: "web",
  no_js: true,
  locale: "id",
};

export const EMPTY_RENDER_WRAPPER: RenderWrapper = {
  title: "",
  description: "",
  canonical: "",
  noindex: false,
};
