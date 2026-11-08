import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth";
import { renderComposition } from "@/modules/workspace";
import type { CompositionBlock } from "@/modules/workspace";

export const dynamic = "force-dynamic";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

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
