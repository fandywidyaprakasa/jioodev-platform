/**
 * JiooDev site edge worker.
 *
 * Serves published sites from Cloudflare KV with immutable versioned keys.
 * Falls back to the origin deployment when a host has no manifest.
 *
 * Bindings (wrangler.toml):
 *   SITE_KV  KV namespace holding `manifest:<host>` and `site:<host>:v<version>:<path>`
 *   ORIGIN   origin base URL, e.g. https://app.jioo.site
 */

const HTML_FALLBACK_CACHE = "no-store";

function normalizePath(input) {
  const raw = String(input || "/").split("?")[0].split("#")[0];
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const parts = [];
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

function manifestKey(host) {
  return `manifest:${host.toLowerCase()}`;
}

function entryKey(host, version, sitePath) {
  return `site:${host.toLowerCase()}:v${version}:${sitePath}`;
}

async function loadManifest(env, host, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(`https://edge-cache.internal/${manifestKey(host)}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();
  const manifest = await env.SITE_KV.get(manifestKey(host), "json");
  if (!manifest) return null;
  ctx.waitUntil(
    cache.put(
      cacheKey,
      new Response(JSON.stringify(manifest), {
        headers: { "Cache-Control": "public, max-age=30" },
      }),
    ),
  );
  return manifest;
}

async function serveOrigin(request, env) {
  const origin = env.ORIGIN || "";
  if (!origin) return new Response("Site not found.", { status: 404 });
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, origin);
  const response = await fetch(target.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  });
  const headers = new Headers(response.headers);
  headers.set("X-JiooDev-Edge", "origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serveEdge(request, env, ctx, manifest, sitePath) {
  const entry = manifest.entries?.[sitePath];
  if (!entry) return null;
  const key = entryKey(manifest.host, manifest.version, sitePath);
  const etag = `"v${manifest.version}-${sitePath}"`;
  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": entry.cache || HTML_FALLBACK_CACHE },
    });
  }
  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": entry.contentType || "application/octet-stream",
        "Cache-Control": entry.cache || HTML_FALLBACK_CACHE,
        ETag: etag,
        "X-JiooDev-Edge": "hit",
      },
    });
  }
  const body = entry.kind === "asset"
    ? await env.SITE_KV.get(key, { type: "arrayBuffer" })
    : await env.SITE_KV.get(key);
  if (body === null || body === undefined) return null;
  const headers = {
    "Content-Type": entry.contentType || "text/html; charset=utf-8",
    "Cache-Control": entry.cache || HTML_FALLBACK_CACHE,
    ETag: etag,
    "X-JiooDev-Edge": "hit",
  };
  return new Response(body, { status: 200, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const manifest = await loadManifest(env, host, ctx).catch(() => null);
    if (!manifest || !manifest.entries) return serveOrigin(request, env);
    const sitePath = normalizePath(url.pathname);
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;
    const response = await serveEdge(request, env, ctx, manifest, sitePath);
    if (!response) return serveOrigin(request, env);
    if (request.method === "GET" && response.status === 200) {
      ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    }
    return response;
  },
};

export { normalizePath, manifestKey, entryKey };
