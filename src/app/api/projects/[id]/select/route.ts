import { NextRequest, NextResponse } from "next/server";
import {
  canTransition,
  resolveProject,
  setProjectStatus,
  canAccess,
  findProject,
} from "@/shared/lib/projects-server";
import { badRequest, notFound, requireActor } from "@/shared/lib/server-auth";

export async function POST(
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

  const body = (await request.json().catch(() => null)) as
    | { variant_id?: string }
    | null;
  if (!body?.variant_id) return badRequest("variant_id wajib diisi.");

  const current = record?.status ?? mock?.status ?? "PREVIEWS";
  if (!canTransition(current, "PICKED")) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TRANSITION",
          message: `Status ${current} tidak dapat menuju PICKED.`,
        },
      },
      { status: 409 },
    );
  }

  await setProjectStatus(params.id, "PICKED", {
    chosen_variant: { id: body.variant_id },
  });
  return NextResponse.json({ status: "PICKED", variant_id: body.variant_id });
}
