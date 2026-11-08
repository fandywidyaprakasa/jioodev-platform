import { NextResponse } from "next/server";
import { renderPreview, resolvePreview } from "@/modules/preview";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const context = await resolvePreview(params.token).catch(() => null);
  if (!context) {
    return new Response("Preview tidak ditemukan.", { status: 404 });
  }
  try {
    const html = await renderPreview(context);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response("Preview gagal dirender.", { status: 500 });
  }
}
