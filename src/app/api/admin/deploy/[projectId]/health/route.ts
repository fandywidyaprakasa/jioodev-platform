import { NextRequest, NextResponse } from "next/server";
import { checkDeploymentHealth } from "@/modules/publishing";
import { requireUser } from "@/modules/auth";

export async function POST(_request: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  let deployment;
  try {
    deployment = await checkDeploymentHealth(params.projectId);
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
