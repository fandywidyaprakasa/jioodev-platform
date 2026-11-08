import { renderVariantPreview } from "@/modules/workspace";
import { findSlotContent } from "@/modules/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  props: { params: Promise<{ slot: string; variant: string }> }
) {
  const params = await props.params;
  try {
    const content = await findSlotContent(params.slot);
    const html = await renderVariantPreview(params.slot, params.variant, content);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch {
    return new Response("Variant tidak ditemukan.", { status: 404 });
  }
}
