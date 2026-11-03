import { NextRequest, NextResponse } from "next/server";
import { checkDeploymentHealth } from "@/shared/lib/deploy-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const deployment = await checkDeploymentHealth(params.projectId).catch(
    () => null,
  );
  if (!deployment) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Deployment tidak ditemukan." } },
      { status: 404 },
    );
  }
  return NextResponse.json(deployment);
}
