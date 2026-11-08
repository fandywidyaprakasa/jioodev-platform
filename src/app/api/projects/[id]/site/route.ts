import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import type { AuthUser } from "@/modules/auth";
import { canAccess, findProject } from "@/modules/projects";
import { loadProjectSite, saveProjectSite } from "@/modules/projects";
import {
  createVersion,
  isWorkspaceOperationSupported,
} from "@/modules/workspace";
import { parseSections, validateSections } from "@/modules/sections";
import type { PbProject } from "@/modules/projects";

async function authorize(id: string) {
  const auth = await requireActor();
  if ("response" in auth) return { response: auth.response };
  const project = await findProject(id).catch(() => null);
  if (
    !project ||
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return { response: notFound() };
  }
  return { project: project as PbProject, user: auth.user as AuthUser };
}

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  const pageId = request.nextUrl.searchParams.get("pageId") ?? undefined;
  const site = await loadProjectSite(params.id, pageId).catch(() => null);
  if (!site) return notFound();
  return NextResponse.json(site);
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  const body = (await request.json().catch(() => null)) as
    | {
        sections?: unknown;
        pageId?: string;
        themeId?: string;
        tier?: "BASIC" | "PRO" | "AGENCY";
        compositionId?: string;
      }
    | null;
  if (!body?.sections) return badRequest("sections wajib diisi.");

  const operations: string[] = [];
  if (body.themeId !== undefined) operations.push("theme.select");
  if (body.tier !== undefined) operations.push("tier.select");
  if (body.sections !== undefined) operations.push("section.content.edit");
  if (operations.length === 0) operations.push("section.content.edit");
  for (const operation of operations) {
    if (!isWorkspaceOperationSupported(auth.project, operation)) {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_OPERATION", message: `Operasi ${operation} tidak didukung oleh adapter terpasang.` } },
        { status: 403 },
      );
    }
  }

  const parsed = parseSections(body.sections);
  if (!parsed.sections) return badRequest(parsed.error);
  const projectState =
    auth.project?.active_sections && typeof auth.project.active_sections === "object" && !Array.isArray(auth.project.active_sections)
      ? (auth.project.active_sections as { theme_id?: string; tier?: "BASIC" | "PRO" | "AGENCY" })
      : {};
  const errors = await validateSections(parsed.sections, {
    themeId: body.themeId ?? projectState.theme_id,
    tier: body.tier ?? projectState.tier,
  });
  if (errors.length) return badRequest(errors[0], { errors });

  const saved = await saveProjectSite(params.id, parsed.sections, {
    pageId: body.pageId,
    themeId: body.themeId,
    tier: body.tier,
    compositionId: body.compositionId,
  }).catch(() => null);
  if (!saved) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan workspace." } },
      { status: 502 },
    );
  }
  void createVersion(params.id, body.pageId ?? "", {
    sections: parsed.sections,
    themeId: body.themeId,
    tier: body.tier,
    compositionId: body.compositionId,
    pageId: body.pageId,
  }, { author: auth.user.email ?? auth.user.id }).catch(() => null);
  return NextResponse.json({ ok: true, sections: saved });
}
