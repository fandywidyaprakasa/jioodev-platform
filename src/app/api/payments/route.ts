import { NextRequest, NextResponse } from "next/server";
import {
  ensureProjectPayment,
  getLatestProjectPayment,
} from "@/shared/lib/payments-server";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import { badRequest, notFound, requireUser } from "@/shared/lib/server-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const projectId = request.nextUrl.searchParams.get("project_id");
  if (!projectId) return badRequest("project_id wajib diisi.");
  const project = await findProject(projectId).catch(() => null);
  if (!project || !canAccess(project, auth.user.id, auth.user.role === "admin")) {
    return notFound();
  }
  const payment = await getLatestProjectPayment(projectId).catch(() => null);
  if (!payment) return notFound("Pembayaran belum dibuat.");
  return NextResponse.json(payment);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { project_id?: string; package_id?: string }
    | null;
  if (!body?.project_id) return badRequest("project_id wajib diisi.");

  const project = await findProject(body.project_id).catch(() => null);
  if (
    !project ||
    !canAccess(project, auth.user.id, auth.user.role === "admin")
  ) {
    return notFound();
  }

  const payment = await ensureProjectPayment(
    body.project_id,
    project.user_id ?? auth.user.id,
    body.package_id,
  ).catch(() => null);
  if (!payment) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal membuat pembayaran." } },
      { status: 502 },
    );
  }
  return NextResponse.json(payment, { status: 201 });
}
