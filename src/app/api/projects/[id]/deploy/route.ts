import { NextRequest, NextResponse } from "next/server";
import {
  getDeployment,
  requestDeployment,
} from "@/modules/publishing";
import { activateProjectViaEntitlement } from "@/modules/payments";
import { canAccess, findProject } from "@/modules/projects";
import { notFound, requireUser } from "@/modules/auth";

async function authorize(projectId: string, userId: string, isAdmin: boolean) {
  const project = await findProject(projectId).catch(() => null);
  if (!project || !canAccess(project, userId, isAdmin)) return null;
  return project;
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await authorize(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  let deployment;
  try {
    deployment = await getDeployment(params.id);
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memuat deployment." } },
      { status: 502 },
    );
  }
  return NextResponse.json({ deployment, projectStatus: project.status });
}

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const project = await authorize(params.id, auth.user.id, auth.user.role === "admin");
  if (!project) return notFound();

  const status = project.status ?? "";
  if (!["PAID", "DEPLOYED", "ACTIVE"].includes(status)) {
    await activateProjectViaEntitlement(params.id, {
      userId: auth.user.id,
      isAdmin: auth.user.role === "admin",
    }).catch(() => undefined);
  }

  let deployment;
  try {
    deployment = await requestDeployment(params.id);
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menjalankan deploy." } },
      { status: 502 },
    );
  }
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
