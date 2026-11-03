import { renderComposition } from "@/shared/lib/composition-render";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { html } = await renderComposition(params.id);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch {
    return new Response("Composition tidak ditemukan.", { status: 404 });
  }
}
