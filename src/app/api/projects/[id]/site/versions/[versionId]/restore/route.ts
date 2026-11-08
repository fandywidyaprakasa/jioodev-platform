import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import { canAccess, findProject } from "@/modules/projects";
import { getRestorePayload, isWorkspaceOperationSupported } from "@/modules/workspace";
import { parseSections, validateSections } from "@/modules/sections";
import { saveProjectSite } from "@/modules/projects";

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
  return { project };
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; versionId: string }> },
) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;

  if (!isWorkspaceOperationSupported(auth.project, "section.content.edit")) {
    return NextResponse.json(
      {
        error: {
          code: "UNSUPPORTED_OPERATION",
          message: "Operasi tidak didukung oleh adapter terpasang.",
        },
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { pageId?: string }
    | null;
  const pageId = body?.pageId ?? "";
  const payload = await getRestorePayload(params.id, pageId, params.versionId);
  if (!payload) return notFound();
  if (!Array.isArray(payload.sections)) {
    return NextResponse.json(
      {
        error: {
          code: "BACKEND_ERROR",
          message: "Versi tidak menyertakan sections.",
        },
      },
      { status: 422 },
    );
  }

  const parsed = parseSections(payload.sections);
  if (!parsed.sections) return badRequest(parsed.error);

  const errors = await validateSections(parsed.sections, {
    themeId: payload.themeId,
    tier: payload.tier,
  });
  if (errors.length) return badRequest(errors[0], { errors });

  const saved = await saveProjectSite(params.id, parsed.sections, {
    pageId: payload.pageId,
    themeId: payload.themeId,
    tier: payload.tier,
    compositionId: payload.compositionId,
  }).catch(() => null);
  if (!saved) {
    return NextResponse.json(
      {
        error: { code: "BACKEND_ERROR", message: "Gagal menyimpan workspace." },
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, sections: saved });
}
