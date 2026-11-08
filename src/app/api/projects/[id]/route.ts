import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import {
  applyProjectUpdate,
  canAccess,
  findProject,
  removeProject,
  toProject,
} from "@/modules/projects";
import type { Project, ProjectStatus } from "@/shared/types";

const STATUSES: ProjectStatus[] = [
  "DRAFT",
  "INTAKE",
  "COMPREHENDED",
  "TEMPLATE_CHOSEN",
  "GENERATING",
  "PREVIEWS",
  "PICKED",
  "PAID",
  "DEPLOYED",
  "ACTIVE",
];

async function owned(id: string) {
  const auth = await requireActor();
  if ("response" in auth) return { response: auth.response };
  const project = await findProject(id);
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

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ownedRes = await owned(params.id);
  if ("response" in ownedRes) return ownedRes.response;
  return NextResponse.json(toProject(ownedRes.project));
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ownedRes = await owned(params.id);
  if ("response" in ownedRes) return ownedRes.response;

  const body = (await request.json().catch(() => ({}))) as Partial<Project>;
  if (body.status && !STATUSES.includes(body.status)) {
    return badRequest("status tidak valid.", { field: "status" });
  }

  try {
    const result = await applyProjectUpdate(params.id, body);
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.code === "NOT_FOUND" ? 404 : 409 },
      );
    }
    return NextResponse.json(result.value);
  } catch (e) {
    console.error("[projects] patch failed", e);
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan perubahan." } },
      { status: 502 },
    );
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ownedRes = await owned(params.id);
  if ("response" in ownedRes) return ownedRes.response;

  try {
    await removeProject(params.id);
    return NextResponse.json({ ok: true, id: params.id });
  } catch (e) {
    console.error("[projects] delete failed", e);
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menghapus project." } },
      { status: 502 },
    );
  }
}
