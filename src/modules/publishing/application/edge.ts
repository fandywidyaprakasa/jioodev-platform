import path from "node:path";

export type EdgeEntryKind = "page" | "asset";

export interface EdgeEntry {
  path: string;
  kind: EdgeEntryKind;
  contentType: string;
  cache: string;
}

export interface EdgeManifest {
  host: string;
  slug: string;
  version: number;
  generatedAt: string;
  entries: Record<string, EdgeEntry>;
}

export interface EdgeResolution {
  status: 200 | 404;
  kind?: EdgeEntryKind;
  entry?: EdgeEntry;
  key?: string;
}

const HTML_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
const ASSET_CACHE = "public, max-age=31536000, immutable";

const ASSET_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

export function edgeAssetType(file: string): string {
  return ASSET_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

/** Canonical site path: decoded, dot-segment resolved, no trailing slash. */
export function normalizeEdgePath(input: string): string {
  const raw = (input.split("?")[0] ?? "").split("#")[0] ?? "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const parts: string[] = [];
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return `/${parts.join("/")}`;
}

export function edgeCacheControl(kind: EdgeEntryKind): string {
  return kind === "asset" ? ASSET_CACHE : HTML_CACHE;
}

export function edgeKvManifestKey(host: string): string {
  return `manifest:${host.toLowerCase()}`;
}

export function edgeKvEntryKey(host: string, version: number, sitePath: string): string {
  return `site:${host.toLowerCase()}:v${version}:${normalizeEdgePath(sitePath)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Absolute site paths referenced by a rendered page (assets + shared). */
export function extractEdgeAssetPaths(html: string, slug: string): string[] {
  if (!/^[A-Za-z0-9-]+$/.test(slug)) return [];
  const pattern = new RegExp(
    `/p/${escapeRegExp(slug)}/(?:assets|shared)/[^"'()\\s?#]+`,
    "g",
  );
  const found = new Set<string>();
  for (const match of html.match(pattern) ?? []) {
    found.add(normalizeEdgePath(match));
  }
  return [...found].sort();
}

export function buildEdgeManifest(input: {
  host: string;
  slug: string;
  version: number;
  generatedAt?: string;
  pages: { path: string }[];
  assets: { path: string }[];
}): EdgeManifest {
  const entries: Record<string, EdgeEntry> = {};
  for (const page of input.pages) {
    const sitePath = normalizeEdgePath(page.path);
    entries[sitePath] = {
      path: sitePath,
      kind: "page",
      contentType: "text/html; charset=utf-8",
      cache: edgeCacheControl("page"),
    };
  }
  for (const asset of input.assets) {
    const sitePath = normalizeEdgePath(asset.path);
    if (entries[sitePath]) continue;
    entries[sitePath] = {
      path: sitePath,
      kind: "asset",
      contentType: edgeAssetType(sitePath),
      cache: edgeCacheControl("asset"),
    };
  }
  return {
    host: input.host.toLowerCase(),
    slug: input.slug,
    version: input.version,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    entries,
  };
}

export function resolveEdgeRequest(
  pathname: string,
  manifest: EdgeManifest,
): EdgeResolution {
  const sitePath = normalizeEdgePath(pathname);
  const entry = manifest.entries[sitePath];
  if (!entry) return { status: 404 };
  return {
    status: 200,
    kind: entry.kind,
    entry,
    key: edgeKvEntryKey(manifest.host, manifest.version, sitePath),
  };
}

export interface EdgeKvEntry {
  key: string;
  value: string;
  base64?: boolean;
  metadata?: Record<string, unknown>;
}

function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}

/**
 * KV bulk payload: versioned immutable entries + the host manifest pointer.
 * Content bodies must be keyed by normalized site path.
 */
export function buildKvEntries(
  manifest: EdgeManifest,
  bodies: Map<string, string | Uint8Array>,
): EdgeKvEntry[] {
  const entries: EdgeKvEntry[] = [];
  for (const [sitePath, entry] of Object.entries(manifest.entries)) {
    const body = bodies.get(sitePath);
    if (body === undefined) continue;
    const key = edgeKvEntryKey(manifest.host, manifest.version, sitePath);
    if (typeof body === "string") {
      entries.push({
        key,
        value: body,
        metadata: { contentType: entry.contentType, cache: entry.cache, version: manifest.version },
      });
    } else {
      entries.push({
        key,
        value: toBase64(body),
        base64: true,
        metadata: { contentType: entry.contentType, cache: entry.cache, version: manifest.version },
      });
    }
  }
  entries.push({
    key: edgeKvManifestKey(manifest.host),
    value: JSON.stringify(manifest),
    metadata: { version: manifest.version },
  });
  return entries;
}
