import { NextRequest, NextResponse } from "next/server";
import { getDeployment, requestDeployment } from "@/modules/publishing";
import { activateProjectViaEntitlement } from "@/modules/payments";
import { canAccess, findProject } from "@/modules/projects";
import { notFound, requireUser } from "@/modules/auth";

type DeployFailureCode =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "PAYMENT_REQUIRED"
  | "NO_OUTPUT"
  | "HEALTH_FAILED"
  | "VALIDATION_FAILED"
  | "RENDER_FAILED"
  | "CONFLICT";

const FAILURE_STATUS: Record<DeployFailureCode, number> = {
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  PAYMENT_REQUIRED: 402,
  NO_OUTPUT: 409,
  HEALTH_FAILED: 409,
  VALIDATION_FAILED: 409,
  RENDER_FAILED: 409,
  CONFLICT: 409,
};

function isDeployFailureCode(value: unknown): value is DeployFailureCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(FAILURE_STATUS, value)
  );
}

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
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (isDeployFailureCode(code)) {
      return NextResponse.json(
        {
          error: {
            code,
            message:
              error instanceof Error ? error.message : "Deploy gagal diproses.",
          },
        },
        { status: FAILURE_STATUS[code] },
      );
    }
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
