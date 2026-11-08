import { NextRequest, NextResponse } from "next/server";
import { addDomain, listDomains } from "@/modules/publishing";
import { canAccess, findProject } from "@/modules/projects";
import { badRequest, notFound, requireUser } from "@/modules/auth";

async function authorize(projectId: string, userId: string, isAdmin: boolean) {
  const project = await findProject(projectId).catch(() => null);
  if (!project || !canAccess(project, userId, isAdmin)) return null;
  return project;
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!(await authorize(params.id, auth.user.id, auth.user.role === "admin"))) {
    return notFound();
  }
  return NextResponse.json(await listDomains(params.id));
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!(await authorize(params.id, auth.user.id, auth.user.role === "admin"))) {
    return notFound();
  }

  const body = (await request.json().catch(() => null)) as { domain?: unknown } | null;
  if (!body || typeof body.domain !== "string" || !body.domain.trim()) {
    return badRequest("domain wajib diisi.");
  }
  const result = await addDomain(params.id, body.domain).catch(() => null);
  if (!result) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menambah domain." } },
      { status: 502 },
    );
  }
  if (!result.ok) {
    if (result.code === "CONFLICT") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: result.message } },
        { status: 409 },
      );
    }
    return badRequest(result.message);
  }
  return NextResponse.json(result.domain, { status: 201 });
}
