import { NextRequest, NextResponse } from "next/server";
import { addDomain, listDomains } from "@/shared/lib/deploy-server";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import { badRequest, notFound, requireUser } from "@/shared/lib/server-auth";

async function authorize(projectId: string, userId: string, isAdmin: boolean) {
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
  if (!(await authorize(params.id, auth.user.id, auth.user.role === "admin"))) {
    return notFound();
  }
  return NextResponse.json(await listDomains(params.id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!(await authorize(params.id, auth.user.id, auth.user.role === "admin"))) {
    return notFound();
  }

  const body = (await request.json().catch(() => null)) as { domain?: string } | null;
  if (!body?.domain) return badRequest("domain wajib diisi.");
  const domain = await addDomain(params.id, body.domain).catch(() => null);
  if (!domain) return badRequest("Format domain tidak valid.");
  return NextResponse.json(domain, { status: 201 });
}
