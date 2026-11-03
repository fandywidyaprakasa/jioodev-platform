import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/shared/lib/server-auth";
import {
  canAccess,
  canTransition,
  findProject,
  patchProject,
  removeProject,
  toProject,
} from "@/shared/lib/projects-server";
import type { Project, ProjectStatus } from "@/shared/types";

const PATCHABLE: Partial<Record<keyof Project, string>> = {
  businessName: "client_label",
  templateCode: "template_id",
  status: "status",
  previewUrl: "preview_url",
};

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ownedRes = await owned(params.id);
  if ("response" in ownedRes) return ownedRes.response;
  return NextResponse.json(toProject(ownedRes.project));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ownedRes = await owned(params.id);
  if ("response" in ownedRes) return ownedRes.response;

  const body = (await request.json().catch(() => ({}))) as Partial<Project>;
  if (body.status && !STATUSES.includes(body.status)) {
    return badRequest("status tidak valid.", { field: "status" });
  }

  const current = ownedRes.project.status ?? "DRAFT";
  if (body.status && !canTransition(current, body.status)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TRANSITION",
          message: `Transisi ${current} → ${body.status} tidak diizinkan.`,
        },
      },
      { status: 409 },
    );
  }

  const patch: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(PATCHABLE)) {
    const value = (body as Record<string, unknown>)[key];
    if (col && value !== undefined) patch[col] = value;
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json(toProject(ownedRes.project));
  }

  try {
    const project = await patchProject(params.id, patch);
    return NextResponse.json(project);
  } catch (e) {
    console.error("[projects] patch failed", e);
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan perubahan." } },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
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
