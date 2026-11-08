import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import {
  canAccess,
  deleteProjectPage,
  findProject,
  updateProjectPage,
} from "@/modules/projects";
import { isWorkspaceOperationSupported } from "@/modules/workspace";

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
  return { project };
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; pageId: string }> }
) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        slug?: string;
        order?: number;
        seo?: Record<string, unknown>;
        settings?: Record<string, unknown>;
      }
    | null;
  if (!body) return badRequest("Body tidak valid.");
  const operations: string[] = [];
  if (
    body.title !== undefined ||
    body.slug !== undefined ||
    body.seo !== undefined ||
    body.settings !== undefined
  ) {
    operations.push("page.update");
  }
  if (body.order !== undefined) operations.push("page.reorder");
  if (operations.length === 0) operations.push("page.update");
  for (const operation of operations) {
    if (!isWorkspaceOperationSupported(auth.project, operation)) {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_OPERATION", message: `Operasi ${operation} tidak didukung oleh adapter terpasang.` } },
        { status: 403 },
      );
    }
  }
  try {
    const page = await updateProjectPage(params.id, params.pageId, body);
    if (!page) return notFound();
    return NextResponse.json({ page });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Gagal menyimpan halaman.");
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string; pageId: string }> }
) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  if (!isWorkspaceOperationSupported(auth.project, "page.delete")) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_OPERATION", message: "Operasi page.delete tidak didukung oleh adapter terpasang." } },
      { status: 403 },
    );
  }
  try {
    const deleted = await deleteProjectPage(params.id, params.pageId);
    if (!deleted) return notFound();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Gagal menghapus halaman.");
  }
}
