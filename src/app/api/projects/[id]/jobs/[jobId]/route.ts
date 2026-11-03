import { NextRequest, NextResponse } from "next/server";
import { getProjectJob } from "@/shared/lib/jobs-server";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import { notFound, requireActor } from "@/shared/lib/server-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; jobId: string } },
) {
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

  const job = await getProjectJob(params.id, params.jobId).catch(() => null);
  if (!job) return notFound("Job tidak ditemukan.");
  return NextResponse.json(job);
}
