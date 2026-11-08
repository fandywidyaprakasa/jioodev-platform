import { readPublishedProjectAssetResult } from "@/modules/publishing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = "no-store, max-age=0";

export async function GET(
  _request: Request,
  props: { params: Promise<{ slug: string; assetId: string }> }
) {
  const params = await props.params;
  const result = await readPublishedProjectAssetResult(
    params.slug,
    params.assetId,
  );
  if (result.status === "unavailable") {
    return new Response("Media sedang tidak tersedia.", {
      status: 503,
      headers: { "Cache-Control": NO_STORE },
    });
  }
  if (result.status !== "ok") {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": NO_STORE },
    });
  }
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": NO_STORE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
