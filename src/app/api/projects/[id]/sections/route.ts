import { NextRequest, NextResponse } from "next/server";
import { mockSections } from "@/shared/lib/mock-data";
import {
  getProjectSections,
  normalizeSections,
  saveProjectSections,
  canAccess,
  findProject,
} from "@/shared/lib/projects-server";
import { badRequest, notFound, requireActor } from "@/shared/lib/server-auth";
import { parseSections, validateSections } from "@/shared/lib/section-schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  const parsed = parseSections(await request.json().catch(() => null));
  if (!parsed.sections) {
    return badRequest(parsed.error);
  }

  const errors = await validateSections(parsed.sections);
  if (errors.length) {
    return badRequest(errors[0], { errors });
  }

  const normalized = normalizeSections(parsed.sections);
  const saved = await saveProjectSections(params.id, normalized).catch(
    () => normalized,
  );
  return NextResponse.json(saved);
}
