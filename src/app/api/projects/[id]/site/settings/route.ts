import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import { canAccess, findProject } from "@/modules/projects";
import { saveSiteSettings } from "@/modules/projects";
import { isWorkspaceOperationSupported } from "@/modules/workspace";

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

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  if (!isWorkspaceOperationSupported(auth.project, "site.settings.edit")) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_OPERATION", message: "Operasi site.settings.edit tidak didukung oleh adapter terpasang." } },
      { status: 403 },
    );
  }
  const body = (await request.json().catch(() => null)) as
    | { siteName?: string; footerTagline?: string }
    | null;
  if (!body) return badRequest("Body tidak valid.");
  const saved = await saveSiteSettings(params.id, {
    ...(body.siteName !== undefined ? { site_name: body.siteName.trim() } : {}),
    ...(body.footerTagline !== undefined
      ? { footer_tagline: body.footerTagline.trim() }
      : {}),
  }).catch(() => null);
  if (!saved) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan site settings." } },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, siteSettings: saved });
}
