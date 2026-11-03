import { NextRequest, NextResponse } from "next/server";
import {
  canAccess,
  findProject,
} from "@/shared/lib/projects-server";
import {
  ensureProjectPayment,
  getLatestProjectPayment,
} from "@/shared/lib/payments-server";
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

  const project = await authorize(
    params.id,
    auth.user.id,
    auth.user.role === "admin",
  );
  if (!project) return notFound();

  const payment = await getLatestProjectPayment(params.id).catch(() => null);
  if (!payment) return notFound("Pembayaran belum dibuat.");
  return NextResponse.json(payment);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const project = await authorize(
    params.id,
    auth.user.id,
    auth.user.role === "admin",
  );
  if (!project) return notFound();

  const body = (await request.json().catch(() => ({}))) as {
    package_id?: string;
  };

  const payment = await ensureProjectPayment(
    params.id,
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
