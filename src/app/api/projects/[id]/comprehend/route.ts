import { NextRequest, NextResponse } from "next/server";
import {
  canTransition,
  getBusinessProfile,
  resolveProject,
  setProjectStatus,
  summarizeBusiness,
  canAccess,
  findProject,
} from "@/shared/lib/projects-server";
import { notFound, requireActor } from "@/shared/lib/server-auth";
import type { ProjectStatus } from "@/shared/types";

export async function POST(
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

  const { record, mock } = await resolveProject(params.id);
  if (!record && !mock) return notFound();

  const current: ProjectStatus = record?.status ?? mock?.status ?? "INTAKE";

  if (current !== "COMPREHENDED") {
    if (!canTransition(current, "COMPREHENDED")) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TRANSITION",
            message: `Status ${current} tidak dapat menuju COMPREHENDED.`,
          },
        },
        { status: 409 },
      );
    }
    await setProjectStatus(params.id, "COMPREHENDED");
  }

  const profile = await getBusinessProfile(params.id).catch(() => null);
  return NextResponse.json(summarizeBusiness(profile));
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

  const { record, mock } = await resolveProject(params.id);
  if (!record && !mock) return notFound();

  const body = (await request.json().catch(() => ({}))) as {
    confirmed?: boolean;
    corrections?: string;
  };
  if (body.confirmed) {
    await setProjectStatus(params.id, "COMPREHENDED");
  }
  return NextResponse.json({ ok: true, corrections: body.corrections ?? null });
}
