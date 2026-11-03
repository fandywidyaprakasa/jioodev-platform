import { NextResponse } from "next/server";
import { renderComposition } from "@/shared/lib/composition-render";
import type { CompositionBlock } from "@/shared/lib/composition-render";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = (await request.json().catch(() => null)) as
    | {
        themeId?: string;
        tier?: "BASIC" | "PRO" | "AGENCY";
        blocks?: CompositionBlock[];
        content?: Record<string, unknown>;
      }
    | null;

  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  try {
    const { html } = await renderComposition(params.id, {
      themeId: body.themeId,
      tier: body.tier,
      blocks: Array.isArray(body.blocks) ? body.blocks : undefined,
      content: body.content && typeof body.content === "object" ? body.content : undefined,
    });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response("Gagal merender workspace.", { status: 400 });
  }
}
