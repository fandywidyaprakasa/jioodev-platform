import { NextResponse } from "next/server";
import { renderPreview, resolvePreview } from "@/shared/lib/preview-render";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
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
