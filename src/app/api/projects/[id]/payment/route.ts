import { NextRequest, NextResponse } from "next/server";
import {
  canAccess,
  findProject,
} from "@/modules/projects";
import {
  activateProjectViaEntitlement,
  ensureProjectPayment,
  getLatestProjectPayment,
} from "@/modules/payments";
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

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const project = await authorize(
    params.id,
    auth.user.id,
    auth.user.role === "admin",
  );
  if (!project) return notFound();

  const status = project.status ?? "";
  if (["PAID", "DEPLOYED", "ACTIVE"].includes(status)) {
    return NextResponse.json({ activated: true });
  }

  const activation = await activateProjectViaEntitlement(params.id, {
    userId: project.user_id ?? auth.user.id,
    isAdmin: auth.user.role === "admin",
  });
  if (activation.activated) {
    return NextResponse.json({ activated: true });
  }

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
