import {
  buildPublicPath,
  findPublishedPageByProject,
  readPublishedAsset,
  renderPublishedPage,
} from "./published";
import {
  buildEdgeManifest,
  buildKvEntries,
  edgeKvManifestKey,
  extractEdgeAssetPaths,
  normalizeEdgePath,
  type EdgeEntry,
  type EdgeKvEntry,
  type EdgeManifest,
} from "./edge";
import { getOutput } from "@/modules/generation";

export interface EdgeBundle {
  projectId: string;
  host: string;
  slug: string;
  version: number;
  manifest: EdgeManifest;
  /** Content bodies keyed by canonical site path. */
  bodies: Map<string, string | Uint8Array>;
  skippedAssets: string[];
}

export interface EdgePushResult {
  pushed: boolean;
  reason?: string;
  status?: number;
  entries?: number;
  version?: number;
}

export interface EdgeCredentials {
  token: string;
  accountId: string;
  namespaceId: string;
}

export function readEdgeCredentials(
  env: Record<string, string | undefined> = process.env,
): EdgeCredentials | null {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = env.CLOUDFLARE_KV_NAMESPACE_ID;
  if (!token || !accountId || !namespaceId) return null;
  return { token, accountId, namespaceId };
}

/** Builds the edge bundle for a published project (no network writes). */
export async function exportEdgeSite(
  projectId: string,
  options: { host?: string; origin?: string } = {},
): Promise<EdgeBundle | null> {
  const page = await findPublishedPageByProject(projectId);
  if (!page || page.status !== "PUBLISHED" || !page.slug) return null;
  const slug = page.slug;

  const output = page.output_id ? await getOutput(page.output_id).catch(() => null) : null;
  const pageSnapshots = output?.report?.pages ?? [];

  const pages: { path: string }[] = [];
  const bodies = new Map<string, string | Uint8Array>();
  const assetPaths = new Set<string>();

  for (const snapshot of pageSnapshots) {
    if (snapshot.settings?.hidden === true) continue;
    const html = await renderPublishedPage(slug, options.origin, snapshot.isHome ? undefined : snapshot.slug);
    if (!html) continue;
    const sitePath = normalizeEdgePath(
      buildPublicPath(slug, snapshot.isHome ? undefined : snapshot.slug),
    );
    pages.push({ path: sitePath });
    bodies.set(sitePath, html);
    for (const assetPath of extractEdgeAssetPaths(html, slug)) assetPaths.add(assetPath);
  }

  if (pages.length === 0) {
    const html = await renderPublishedPage(slug, options.origin);
    if (!html) return null;
    const sitePath = normalizeEdgePath(buildPublicPath(slug));
    pages.push({ path: sitePath });
    bodies.set(sitePath, html);
    for (const assetPath of extractEdgeAssetPaths(html, slug)) assetPaths.add(assetPath);
  }

  const assets: { path: string }[] = [];
  const skippedAssets: string[] = [];
  for (const assetPath of [...assetPaths].sort()) {
    const prefix = `/p/${slug}/`;
    if (!assetPath.startsWith(prefix)) {
      skippedAssets.push(assetPath);
      continue;
    }
    const segments = assetPath.slice(prefix.length).split("/");
    const kind = segments[0];
    if (kind !== "assets" && kind !== "shared") {
      skippedAssets.push(assetPath);
      continue;
    }
    const data = await readPublishedAsset(slug, kind, segments.slice(1)).catch(() => null);
    if (!data) {
      skippedAssets.push(assetPath);
      continue;
    }
    assets.push({ path: assetPath });
    bodies.set(assetPath, new Uint8Array(data));
  }

  const host = (options.host ?? page.custom_domain ?? "").trim().toLowerCase();
  const version = Number(page.version ?? 1) || 1;
  const manifest = buildEdgeManifest({ host, slug, version, pages, assets });
  return { projectId, host, slug, version, manifest, bodies, skippedAssets };
}

export function kvEntriesForBundle(bundle: EdgeBundle): EdgeKvEntry[] {
  return buildKvEntries(bundle.manifest, bundle.bodies);
}

/**
 * Uploads the bundle to Cloudflare KV in bulk. Never throws on missing
 * credentials; returns a result describing what happened. Tokens are never
 * logged.
 */
export async function pushEdgeBundle(
  bundle: EdgeBundle,
  options: { credentials?: EdgeCredentials | null; fetchImpl?: typeof fetch } = {},
): Promise<EdgePushResult> {
  const credentials =
    options.credentials === undefined ? readEdgeCredentials() : options.credentials;
  if (!credentials) {
    return { pushed: false, reason: "CLOUDFLARE_CREDENTIALS_MISSING", version: bundle.version };
  }
  if (!bundle.host || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(bundle.host)) {
    return { pushed: false, reason: "EDGE_HOST_MISSING", version: bundle.version };
  }
  const entries = kvEntriesForBundle(bundle);
  if (entries.length === 0) {
    return { pushed: false, reason: "EDGE_BUNDLE_EMPTY", version: bundle.version };
  }
  const doFetch = options.fetchImpl ?? fetch;
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    credentials.accountId,
  )}/storage/kv/namespaces/${encodeURIComponent(credentials.namespaceId)}/bulk`;
  const response = await doFetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entries),
  });
  if (!response.ok) {
    return {
      pushed: false,
      reason: `EDGE_PUSH_FAILED_${response.status}`,
      status: response.status,
      version: bundle.version,
    };
  }
  return { pushed: true, status: response.status, entries: entries.length, version: bundle.version };
}

export function edgeManifestPointer(bundle: EdgeBundle): string {
  return edgeKvManifestKey(bundle.host);
}

export type { EdgeEntry, EdgeManifest };
