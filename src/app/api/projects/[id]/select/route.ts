import { NextRequest, NextResponse } from "next/server";
import {
  canAccess,
  findProject,
  selectProjectVariant,
} from "@/modules/projects";
import { badRequest, notFound, requireActor } from "@/modules/auth";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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

  const body = (await request.json().catch(() => null)) as
    | { variant_id?: string }
    | null;
  if (!body?.variant_id) return badRequest("variant_id wajib diisi.");

  const result = await selectProjectVariant(params.id, body.variant_id);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.code === "NOT_FOUND" ? 404 : 409 },
    );
  }
  return NextResponse.json(result.value);
}
