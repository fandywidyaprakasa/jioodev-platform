import {
  publishedAssetType,
  readPublishedAsset,
} from "@/modules/publishing";

export async function GET(
  _request: Request,
  props: { params: Promise<{ slug: string; path: string[] }> }
) {
  const params = await props.params;
  const data = await readPublishedAsset(params.slug, "assets", params.path);
  if (!data) return new Response("Not found", { status: 404 });
  const type = publishedAssetType(params.path[params.path.length - 1] ?? "");
  return new Response(data, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
