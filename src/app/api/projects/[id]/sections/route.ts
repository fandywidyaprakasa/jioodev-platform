import { NextRequest, NextResponse } from "next/server";
import { mockSections } from "@/shared/lib/mock-data";
import {
  getProjectSections,
  normalizeSections,
  saveProjectSections,
  canAccess,
  findProject,
} from "@/modules/projects";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import { parseSections, validateSections } from "@/modules/sections";
import { isWorkspaceOperationSupported } from "@/modules/workspace";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireActor();
  if ("response" in auth) return auth.response;
  const project = await findProject(params.id).catch(() => null);
  if (
    project &&
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return notFound();
  }
  if (!project && auth.user.role !== "admin") return notFound();

  const sections = await getProjectSections(params.id, mockSections).catch(
    () => mockSections,
  );
  return NextResponse.json(sections);
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireActor();
  if ("response" in auth) return auth.response;
  const project = await findProject(params.id).catch(() => null);
  if (
    project &&
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return notFound();
  }
  if (!project && auth.user.role !== "admin") return notFound();

  if (!isWorkspaceOperationSupported(project, "section.content.edit")) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_OPERATION", message: "Operasi section.content.edit tidak didukung oleh adapter terpasang." } },
      { status: 403 },
    );
  }

  const parsed = parseSections(await request.json().catch(() => null));
  if (!parsed.sections) {
    return badRequest(parsed.error);
  }

  const projectState =
    project?.active_sections && typeof project.active_sections === "object" && !Array.isArray(project.active_sections)
      ? (project.active_sections as { theme_id?: string; tier?: "BASIC" | "PRO" | "AGENCY" })
      : {};
  const errors = await validateSections(parsed.sections, {
    themeId: projectState.theme_id,
    tier: projectState.tier,
  });
  if (errors.length) {
    return badRequest(errors[0], { errors });
  }

  const normalized = normalizeSections(parsed.sections);
  const saved = await saveProjectSections(params.id, normalized).catch(
    () => normalized,
  );
  return NextResponse.json(saved);
}
