import { NextRequest, NextResponse } from "next/server";
import {
  getDeployment,
  requestDeployment,
} from "@/shared/lib/deploy-server";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import { notFound, requireUser } from "@/shared/lib/server-auth";

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
  const project = await authorize(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  const deployment = await getDeployment(params.id).catch(() => null);
  return NextResponse.json({ deployment, projectStatus: project.status });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await authorize(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  const deployment = await requestDeployment(params.id).catch(() => null);
  if (!deployment) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TRANSITION",
          message: "Deploy memerlukan project berstatus PAID.",
        },
      },
      { status: 409 },
    );
  }
  return NextResponse.json(deployment, { status: 202 });
}
