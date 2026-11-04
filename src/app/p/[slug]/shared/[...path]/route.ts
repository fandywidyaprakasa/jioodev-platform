import {
  publishedAssetType,
  readPublishedAsset,
} from "@/shared/lib/published-server";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string; path: string[] } },
) {
  const data = await readPublishedAsset(params.slug, "shared", params.path);
  if (!data) return new Response("Not found", { status: 404 });
  const type = publishedAssetType(params.path[params.path.length - 1] ?? "");
  return new Response(data, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
