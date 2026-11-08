import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import {
  canAccess,
  createProjectPage,
  findProject,
  listProjectPages,
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

function toPage(page: {
  id: string;
  title?: string;
  slug?: string;
  is_home?: boolean;
  order?: number;
  seo?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}) {
  return {
    id: page.id,
    title: page.title ?? (page.is_home ? "Home" : "Halaman"),
    slug: page.slug ?? "",
    isHome: Boolean(page.is_home),
    order: page.order ?? 0,
    seo: page.seo ?? {},
    settings: page.settings ?? {},
  };
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  try {
    const pages = await listProjectPages(params.id);
    return NextResponse.json({ pages: pages.map(toPage) });
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memuat halaman." } },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  if (!isWorkspaceOperationSupported(auth.project, "page.create")) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_OPERATION", message: "Operasi page.create tidak didukung oleh adapter terpasang." } },
      { status: 403 },
    );
  }
  const body = (await request.json().catch(() => null)) as
    | { title?: string; slug?: string }
    | null;
  if (!body) return badRequest("Body tidak valid.");
  try {
    const page = await createProjectPage(params.id, body);
    return NextResponse.json({ page: toPage(page) }, { status: 201 });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Gagal membuat halaman.");
  }
}
