import { NextResponse } from "next/server";
import { requireActor } from "@/modules/auth";
import { canAccess, findProject } from "@/modules/projects";
import { loadProjectSite } from "@/modules/projects";
import { renderComposition } from "@/modules/workspace";
import type { WorkspaceData } from "@/modules/workspace";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireActor();
  if ("response" in auth) return auth.response;
  const project = await findProject(params.id).catch(() => null);
  if (
    !project ||
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        pageId?: string;
        themeId?: string;
        tier?: "BASIC" | "PRO" | "AGENCY";
        blocks?: WorkspaceData["composition"]["blocks"];
        content?: Record<string, unknown>;
      }
    | null;
  const site = await loadProjectSite(params.id, body?.pageId).catch(() => null);
  if (!site) return NextResponse.json({ error: "Site tidak ditemukan." }, { status: 404 });
  try {
    const { html } = await renderComposition(site.compositionId, {
      themeId: body?.themeId ?? site.themeId,
      tier: body?.tier ?? site.tier,
      blocks: body?.blocks ?? site.composition.blocks,
      content: body?.content ?? site.content,
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
