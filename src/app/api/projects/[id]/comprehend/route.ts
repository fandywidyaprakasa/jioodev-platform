import { NextRequest, NextResponse } from "next/server";
import {
  canAccess,
  comprehendProject,
  confirmProjectComprehension,
  findProject,
  resolveProject,
} from "@/modules/projects";
import { notFound, requireActor } from "@/modules/auth";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
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

  const result = await comprehendProject(params.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.code === "NOT_FOUND" ? 404 : 409 },
    );
  }
  return NextResponse.json(result.value);
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

  const { record, mock } = await resolveProject(params.id);
  if (!record && !mock) return notFound();

  const body = (await request.json().catch(() => ({}))) as {
    confirmed?: boolean;
    corrections?: string;
  };
  if (body.confirmed) {
    return NextResponse.json(
      await confirmProjectComprehension(params.id, body.corrections),
    );
  }
  return NextResponse.json({ ok: true, corrections: body.corrections ?? null });
}
