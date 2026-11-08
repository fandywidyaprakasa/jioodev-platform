import { NextRequest, NextResponse } from "next/server";
import { canAccess, findProject } from "@/modules/projects";
import {
  findPublishedPageByProject,
  publishAndMarkLive,
  toPublishedPage,
  unpublishAndSuspend,
} from "@/modules/publishing";
import { notFound, requireUser } from "@/modules/auth";

async function owned(projectId: string, userId: string, isAdmin: boolean) {
  const project = await findProject(projectId).catch(() => null);
  if (!project || !canAccess(project, userId, isAdmin)) return null;
  return project;
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await owned(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  try {
    const page = await findPublishedPageByProject(params.id);
    return NextResponse.json({
      published: page?.status === "PUBLISHED",
      page: page ? toPublishedPage(page) : null,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memuat status publish." } },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await owned(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  const idempotencyKey =
    request.headers.get("idempotency-key") ??
    request.headers.get("x-idempotency-key") ??
    undefined;
  const result = await publishAndMarkLive(params.id, { idempotencyKey }).catch(
    () => null,
  );
  if (!result) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal publish halaman." } },
      { status: 502 },
    );
  }
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 409;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }
  return NextResponse.json(result.page);
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await owned(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  let result;
  try {
    result = await unpublishAndSuspend(params.id);
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal unpublish halaman." } },
      { status: 502 },
    );
  }
  if (!result || !result.ok) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Halaman belum dipublish." } },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, page: result.page });
}
