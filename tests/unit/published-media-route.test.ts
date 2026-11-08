import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/publishing", () => ({
  readPublishedProjectAssetResult: vi.fn(),
}));

describe("published media route", () => {
  it("returns no-store headers on success", async () => {
    const { readPublishedProjectAssetResult } = await import("@/modules/publishing");
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });
    (readPublishedProjectAssetResult as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "ok",
      stream,
      contentType: "image/png",
    });
    const { GET } = await import("@/app/p/[slug]/media/[assetId]/route");
    const response = await GET(new Request("http://test/p/slug/media/asset1"), {
      params: Promise.resolve({ slug: "slug", assetId: "asset1" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns 404 when the asset is not published", async () => {
    const { readPublishedProjectAssetResult } = await import("@/modules/publishing");
    (readPublishedProjectAssetResult as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "not_found" });
    const { GET } = await import("@/app/p/[slug]/media/[assetId]/route");
    const response = await GET(new Request("http://test/p/slug/media/asset1"), {
      params: Promise.resolve({ slug: "slug", assetId: "asset1" }),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  });

  it("returns 503 when media infrastructure is unavailable", async () => {
    const { readPublishedProjectAssetResult } = await import("@/modules/publishing");
    (readPublishedProjectAssetResult as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "unavailable" });
    const { GET } = await import("@/app/p/[slug]/media/[assetId]/route");
    const response = await GET(new Request("http://test/p/slug/media/asset1"), {
      params: Promise.resolve({ slug: "slug", assetId: "asset1" }),
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  });
});
