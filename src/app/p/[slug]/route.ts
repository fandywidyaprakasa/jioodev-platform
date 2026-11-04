import { renderPublishedPage } from "@/shared/lib/published-server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const origin = new URL(request.url).origin;
  const html = await renderPublishedPage(params.slug, origin).catch(() => null);
  if (!html) {
    return new Response("Halaman tidak ditemukan.", { status: 404 });
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
