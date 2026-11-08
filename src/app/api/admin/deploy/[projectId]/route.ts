import { NextRequest, NextResponse } from "next/server";
import { requestDeployment } from "@/modules/publishing";
import { requireUser } from "@/modules/auth";

export async function POST(_request: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  let deployment;
  try {
    deployment = await requestDeployment(params.projectId);
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menjalankan deploy." } },
      { status: 502 },
    );
  }
  if (!deployment) {
    return NextResponse.json(
      { error: { code: "INVALID_TRANSITION", message: "Deploy tidak dapat dijalankan." } },
      { status: 409 },
    );
  }
  return NextResponse.json(deployment, { status: 202 });
}
