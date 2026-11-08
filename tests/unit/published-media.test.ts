import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();
const deleteRecord = vi.fn();
const getRecord = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  deleteRecord: (...args: unknown[]) => deleteRecord(...args),
  getRecord: (...args: unknown[]) => getRecord(...args),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

vi.mock("@/shared/infrastructure/pocketbase/admin-token", () => ({
  pbAdminToken: async () => "admin-token",
}));

function page(items: unknown[]) {
  return { page: 1, perPage: 200, totalItems: items.length, totalPages: 1, items };
}

function sha256Buffer(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

describe("published project media resolver", () => {
  const assetId = "asset1";
  const slug = "my-slug";
  const projectId = "proj-1";
  const bytes = Buffer.from("published-image-bytes");
  const hash = sha256Buffer(bytes);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POCKETBASE_PLATFORM_URL = "http://pb.test";
    listRecords.mockImplementation(async (collection: string) => {
      if (collection === "published_pages") {
        return page([{ id: "pp1", slug, project_id: projectId, output_id: "out-1", template: "t", status: "PUBLISHED" }]);
      }
      return page([]);
    });
    getRecord.mockImplementation(async (collection: string, id: string) => {
      if (collection === "production_outputs" && id === "out-1") {
        return {
          id: "out-1",
          project_id: projectId,
          status: "READY",
          report: {
            kind: "publish",
            pages: [{ html: `<img src="/api/projects/${projectId}/assets/${assetId}/file">` }],
            asset_manifest: [{ path: `media/${assetId}`, hash }],
          },
        };
      }
      if (collection === "projects" && id === projectId) {
        return { id: projectId };
      }
      if (collection === "content_assets" && id === assetId) {
        return { id: assetId, project_id: projectId, file: "file.png", meta: { mime: "image/png" } };
      }
      return null;
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes, { status: 200, headers: { "content-type": "image/png" } })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.POCKETBASE_PLATFORM_URL;
  });

  it("returns bytes for an active manifest-referenced asset", async () => {
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    const result = await readPublishedProjectAsset(slug, assetId);
    expect(result).not.toBeNull();
    const reader = result!.stream!.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    expect(Buffer.concat(chunks).toString()).toBe("published-image-bytes");
    expect(result!.contentType).toBe("image/png");
    expect(createRecord).not.toHaveBeenCalled();
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it("returns null for an unreferenced asset", async () => {
    getRecord.mockImplementation(async (collection: string, id: string) => {
      if (collection === "production_outputs" && id === "out-1") {
        return { id: "out-1", project_id: "proj-1", status: "READY", report: { kind: "publish", pages: [], asset_manifest: [] } };
      }
      if (collection === "projects" && id === projectId) return { id: projectId };
      if (collection === "content_assets" && id === assetId) return { id: assetId, project_id: projectId, file: "file.png", meta: { mime: "image/png" } };
      return null;
    });
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset(slug, assetId)).toBeNull();
  });

  it("returns null for an unpublished or unknown slug", async () => {
    listRecords.mockResolvedValue(page([]));
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset("missing-slug", assetId)).toBeNull();
  });

  it("returns null for traversal asset ids", async () => {
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset(slug, "../secret")).toBeNull();
    expect(await readPublishedProjectAsset(slug, "a/b")).toBeNull();
  });

  it("returns null when the current bytes no longer match the manifest hash", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(Buffer.from("changed-bytes"), { status: 200, headers: { "content-type": "image/png" } })));
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset(slug, assetId)).toBeNull();
  });

  it("does not publicly serve SVG or missing files", async () => {
    getRecord.mockImplementation(async (collection: string, id: string) => {
      if (collection === "production_outputs" && id === "out-1") {
        return { id: "out-1", project_id: "proj-1", status: "READY", report: { kind: "publish", pages: [], asset_manifest: [{ path: `media/${assetId}`, hash }] } };
      }
      if (collection === "projects" && id === projectId) return { id: projectId };
      if (collection === "content_assets" && id === assetId) return { id: assetId, project_id: projectId, file: "file.svg", meta: { mime: "image/svg+xml" } };
      return null;
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes, { status: 200, headers: { "content-type": "image/svg+xml" } })));
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset(slug, assetId)).toBeNull();

    getRecord.mockImplementation(async (collection: string, id: string) => {
      if (collection === "content_assets" && id === assetId) return null;
      if (collection === "production_outputs" && id === "out-1") {
        return { id: "out-1", project_id: "proj-1", status: "READY", report: { kind: "publish", pages: [], asset_manifest: [{ path: `media/${assetId}`, hash }] } };
      }
      if (collection === "projects" && id === projectId) return { id: projectId };
      return null;
    });
    expect(await readPublishedProjectAsset(slug, assetId)).toBeNull();
  });

  it("rejects an asset whose output is not a publish snapshot", async () => {
    getRecord.mockImplementation(async (collection: string, id: string) => {
      if (collection === "production_outputs" && id === "out-1") {
        return { id: "out-1", project_id: "proj-1", status: "READY", report: { kind: "generation", pages: [], asset_manifest: [{ path: `media/${assetId}`, hash }] } };
      }
      if (collection === "projects" && id === projectId) return { id: projectId };
      if (collection === "content_assets" && id === assetId) return { id: assetId, project_id: projectId, file: "file.png", meta: { mime: "image/png" } };
      return null;
    });
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset(slug, assetId)).toBeNull();
  });

  it("rejects an asset stored under a different project", async () => {
    getRecord.mockImplementation(async (collection: string, id: string) => {
      if (collection === "production_outputs" && id === "out-1") {
        return { id: "out-1", project_id: "proj-1", status: "READY", report: { kind: "publish", pages: [], asset_manifest: [{ path: `media/${assetId}`, hash }] } };
      }
      if (collection === "projects" && id === projectId) return { id: projectId };
      if (collection === "content_assets" && id === assetId) return { id: assetId, project_id: "other-project", file: "file.png", meta: { mime: "image/png" } };
      return null;
    });
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset(slug, assetId)).toBeNull();
  });

  it("rejects a READY output with missing project_id", async () => {
    getRecord.mockImplementation(async (collection: string, id: string) => {
      if (collection === "production_outputs" && id === "out-1") {
        return { id: "out-1", status: "READY", report: { kind: "publish", pages: [], asset_manifest: [{ path: `media/${assetId}`, hash }] } };
      }
      if (collection === "projects" && id === projectId) return { id: projectId };
      if (collection === "content_assets" && id === assetId) return { id: assetId, project_id: projectId, file: "file.png", meta: { mime: "image/png" } };
      return null;
    });
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset(slug, assetId)).toBeNull();
  });

  it("rejects a READY output with mismatched project_id", async () => {
    getRecord.mockImplementation(async (collection: string, id: string) => {
      if (collection === "production_outputs" && id === "out-1") {
        return { id: "out-1", project_id: "other-project", status: "READY", report: { kind: "publish", pages: [], asset_manifest: [{ path: `media/${assetId}`, hash }] } };
      }
      if (collection === "projects" && id === projectId) return { id: projectId };
      if (collection === "content_assets" && id === assetId) return { id: assetId, project_id: projectId, file: "file.png", meta: { mime: "image/png" } };
      return null;
    });
    const { readPublishedProjectAsset } = await import("@/modules/publishing");
    expect(await readPublishedProjectAsset(slug, assetId)).toBeNull();
  });
});
