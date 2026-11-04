import { NextRequest, NextResponse } from "next/server";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import {
  findPublishedPageByProject,
  publishProject,
  toPublishedPage,
  unpublishProject,
} from "@/shared/lib/published-server";
import { notFound, requireUser } from "@/shared/lib/server-auth";
import { markPublished, suspendDeployment } from "@/shared/lib/deploy-server";

async function owned(projectId: string, userId: string, isAdmin: boolean) {
  const project = await findProject(projectId).catch(() => null);
  if (!project || !canAccess(project, userId, isAdmin)) return null;
  return project;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await owned(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  const page = await findPublishedPageByProject(params.id).catch(() => null);
  return NextResponse.json({
    published: page?.status === "PUBLISHED",
    page: page ? toPublishedPage(page) : null,
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await owned(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  const result = await publishProject(params.id).catch(() => null);
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
  await markPublished(params.id, result.page.url, result.page.slug).catch(
    () => null,
  );
  return NextResponse.json(result.page);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await owned(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  const result = await unpublishProject(params.id).catch(() => null);
  if (!result || !result.ok) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Halaman belum dipublish." } },
      { status: 404 },
    );
  }
  await suspendDeployment(params.id).catch(() => null);
  return NextResponse.json({ ok: true, page: result.page });
}
