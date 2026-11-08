import { renderTemplateByCode } from "@/modules/preview";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  try {
    const html = await renderTemplateByCode(params.code);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch {
    return new Response("Template tidak ditemukan.", { status: 404 });
  }
}
