import { renderPublishedPage } from "@/modules/publishing";

export const dynamic = "force-dynamic";

export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const origin = new URL(request.url).origin;
  let html: string | null;
  try {
    html = await renderPublishedPage(params.slug, origin);
  } catch {
    return new Response("Halaman sedang tidak tersedia.", { status: 503 });
  }
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
