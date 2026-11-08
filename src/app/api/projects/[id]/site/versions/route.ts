import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import type { AuthUser } from "@/modules/auth";
import { canAccess, findProject } from "@/modules/projects";
import { createVersion, listVersions } from "@/modules/workspace";
import type { SiteVersionInput } from "@/modules/workspace";
import type { PbProject } from "@/modules/projects";

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
  return { project: project as PbProject, user: auth.user as AuthUser };
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  const pageId = request.nextUrl.searchParams.get("pageId") ?? "";
  const versions = await listVersions(params.id, pageId).catch(() => null);
  if (versions === null) {
    return NextResponse.json(
      {
        error: { code: "BACKEND_ERROR", message: "Gagal membaca riwayat versi." },
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ versions });
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  const body = (await request.json().catch(() => null)) as
    | { pageId?: string; message?: string; snapshot?: unknown }
    | null;
  if (!body || typeof body.snapshot !== "object" || body.snapshot === null) {
    return badRequest("snapshot wajib diisi.");
  }
  const version = await createVersion(
    params.id,
    body.pageId ?? "",
    body.snapshot as SiteVersionInput,
    {
      author: auth.user.email ?? auth.user.id,
      message: body.message,
    },
  ).catch(() => null);
  if (!version) {
    return NextResponse.json(
      {
        error: { code: "BACKEND_ERROR", message: "Gagal menyimpan versi." },
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, version });
}
