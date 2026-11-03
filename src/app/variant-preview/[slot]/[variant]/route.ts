import { renderVariantPreview } from "@/shared/lib/composition-render";
import { findSlotContent } from "@/shared/lib/workspace-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slot: string; variant: string } },
) {
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
