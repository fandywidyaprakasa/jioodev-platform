import { NextRequest, NextResponse } from "next/server";
import { createOrGetJob, generationReadiness } from "@/modules/generation";
import { canAccess, findProject } from "@/modules/projects";
import { notFound, requireActor } from "@/modules/auth";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireActor();
  if ("response" in auth) return auth.response;

  const project = await findProject(params.id).catch(() => null);
  if (
    !project ||
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return notFound();
  }

  const readiness = generationReadiness(project);
  if (!readiness.ok) {
    return NextResponse.json(
      { error: { code: readiness.code, message: readiness.message } },
      { status: 409 },
    );
  }

  const job = await createOrGetJob(params.id).catch(() => null);
  if (!job) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memulai generate." } },
      { status: 502 },
    );
  }
  return NextResponse.json(job, { status: 202 });
}
