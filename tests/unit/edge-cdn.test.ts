import { describe, expect, it, vi } from "vitest";
import {
  buildEdgeManifest,
  buildKvEntries,
  edgeAssetType,
  edgeCacheControl,
  edgeKvEntryKey,
  edgeKvManifestKey,
  extractEdgeAssetPaths,
  normalizeEdgePath,
  resolveEdgeRequest,
} from "@/modules/publishing/application/edge";
import { pushEdgeBundle } from "@/modules/publishing/application/edge-publish";

const manifest = buildEdgeManifest({
  host: "Toko.Example.com",
  slug: "toko-abc",
  version: 7,
  generatedAt: "2026-11-08T00:00:00.000Z",
  pages: [{ path: "/p/toko-abc" }, { path: "/p/toko-abc/tentang" }],
  assets: [
    { path: "/p/toko-abc/assets/logo.svg" },
    { path: "/p/toko-abc/shared/base.css" },
  ],
});

describe("edge path normalization", () => {
  it("canonicalizes slashes, dot segments, encoding, and query/hash", () => {
    expect(normalizeEdgePath("/p//toko-abc/./assets/../assets/logo.svg?x=1#y")).toBe(
      "/p/toko-abc/assets/logo.svg",
    );
    expect(normalizeEdgePath("/p/toko-abc/")).toBe("/p/toko-abc");
    expect(normalizeEdgePath("")).toBe("/");
    expect(normalizeEdgePath("/p/toko%20abc")).toBe("/p/toko abc");
    expect(normalizeEdgePath("/a/%2e%2e/b")).toBe("/b");
    expect(normalizeEdgePath("/bad%E0%A4%A")).toBe("/bad%E0%A4%A");
  });
});

describe("edge asset extraction", () => {
  it("collects assets and shared paths for the given slug only", () => {
    const html = [
      '<link rel="stylesheet" href="/p/toko-abc/shared/base.css">',
      '<img src="/p/toko-abc/assets/logo.svg">',
      '<img src="/p/other-site/assets/logo.svg">',
      '<img src="https://cdn.example.com/x.png">',
      '<img src="/p/toko-abc/assets/logo.svg">',
    ].join("");
    expect(extractEdgeAssetPaths(html, "toko-abc")).toEqual([
      "/p/toko-abc/assets/logo.svg",
      "/p/toko-abc/shared/base.css",
    ]);
  });

  it("rejects invalid slugs", () => {
    expect(extractEdgeAssetPaths('<img src="/p/../assets/x.svg">', "../")).toEqual([]);
  });
});

describe("edge manifest", () => {
  it("maps pages and assets with cache policies", () => {
    expect(manifest.host).toBe("toko.example.com");
    expect(manifest.version).toBe(7);
    expect(Object.keys(manifest.entries)).toEqual([
      "/p/toko-abc",
      "/p/toko-abc/tentang",
      "/p/toko-abc/assets/logo.svg",
      "/p/toko-abc/shared/base.css",
    ]);
    expect(manifest.entries["/p/toko-abc"]?.kind).toBe("page");
    expect(manifest.entries["/p/toko-abc"]?.contentType).toContain("text/html");
    expect(manifest.entries["/p/toko-abc/assets/logo.svg"]?.contentType).toBe(
      "image/svg+xml",
    );
    expect(edgeCacheControl("page")).toContain("s-maxage=300");
    expect(edgeCacheControl("asset")).toContain("immutable");
    expect(edgeAssetType("file.UNKNOWN")).toBe("application/octet-stream");
  });

  it("resolves requests against the manifest", () => {
    const hit = resolveEdgeRequest("/p/toko-abc/tentang/", manifest);
    expect(hit.status).toBe(200);
    expect(hit.kind).toBe("page");
    expect(hit.key).toBe("site:toko.example.com:v7:/p/toko-abc/tentang");
    expect(resolveEdgeRequest("/p/toko-abc/missing", manifest).status).toBe(404);
    expect(resolveEdgeRequest("/", manifest).status).toBe(404);
  });

  it("uses versioned keys and a host manifest pointer", () => {
    expect(edgeKvEntryKey("Toko.Example.com", 7, "/p/toko-abc")).toBe(
      "site:toko.example.com:v7:/p/toko-abc",
    );
    expect(edgeKvManifestKey("Toko.Example.com")).toBe("manifest:toko.example.com");
  });
});

describe("edge kv payload", () => {
  it("encodes text pages and base64 assets plus the manifest pointer", () => {
    const bodies = new Map<string, string | Uint8Array>([
      ["/p/toko-abc", "<html>home</html>"],
      ["/p/toko-abc/assets/logo.svg", new Uint8Array([60, 115, 118, 103, 62])],
    ]);
    const entries = buildKvEntries(manifest, bodies);
    const keys = entries.map((entry) => entry.key);
    expect(keys).toContain("manifest:toko.example.com");
    expect(keys).toContain("site:toko.example.com:v7:/p/toko-abc");
    expect(keys).toContain("site:toko.example.com:v7:/p/toko-abc/assets/logo.svg");
    expect(keys).not.toContain("site:toko.example.com:v7:/p/toko-abc/tentang");
    const asset = entries.find((entry) => entry.key.endsWith("logo.svg"));
    expect(asset?.base64).toBe(true);
    expect(asset?.value).toBe(Buffer.from("<svg>").toString("base64"));
  });
});

describe("edge push", () => {
  const bundle = {
    projectId: "p1",
    host: "toko.example.com",
    slug: "toko-abc",
    version: 7,
    manifest,
    bodies: new Map<string, string | Uint8Array>([["/p/toko-abc", "<html></html>"]]),
    skippedAssets: [],
  };

  it("skips upload without credentials", async () => {
    const result = await pushEdgeBundle(bundle, { credentials: null });
    expect(result.pushed).toBe(false);
    expect(result.reason).toBe("CLOUDFLARE_CREDENTIALS_MISSING");
  });

  it("requires a valid host", async () => {
    const result = await pushEdgeBundle(
      { ...bundle, host: "" },
      { credentials: { token: "t", accountId: "a", namespaceId: "n" } },
    );
    expect(result.pushed).toBe(false);
    expect(result.reason).toBe("EDGE_HOST_MISSING");
  });

  it("uploads entries in one bulk request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await pushEdgeBundle(bundle, {
      credentials: { token: "t", accountId: "acct", namespaceId: "ns" },
      fetchImpl,
    });
    expect(result.pushed).toBe(true);
    expect(result.entries).toBeGreaterThan(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acct/storage/kv/namespaces/ns/bulk",
    );
    expect(init.method).toBe("PUT");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  it("reports failed uploads", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 502 }));
    const result = await pushEdgeBundle(bundle, {
      credentials: { token: "t", accountId: "a", namespaceId: "n" },
      fetchImpl,
    });
    expect(result.pushed).toBe(false);
    expect(result.reason).toBe("EDGE_PUSH_FAILED_502");
  });
});
