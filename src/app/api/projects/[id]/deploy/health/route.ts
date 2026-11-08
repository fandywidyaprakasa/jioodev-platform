import { NextRequest, NextResponse } from "next/server";
import { checkDeploymentHealth } from "@/modules/publishing";
import { canAccess, findProject } from "@/modules/projects";
import { notFound, requireUser } from "@/modules/auth";

async function authorize(projectId: string, userId: string, isAdmin: boolean) {
  const project = await findProject(projectId).catch(() => null);
  if (!project || !canAccess(project, userId, isAdmin)) return null;
  return project;
}

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await authorize(
    params.id,
    auth.user.id,
    auth.user.role === "admin",
  );
  if (!project) return notFound();

  let deployment;
  try {
    deployment = await checkDeploymentHealth(params.id);
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memeriksa health deploy." } },
      { status: 502 },
    );
  }
  if (!deployment) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Deployment tidak ditemukan." } },
      { status: 404 },
    );
  }
  return NextResponse.json(deployment);
}
