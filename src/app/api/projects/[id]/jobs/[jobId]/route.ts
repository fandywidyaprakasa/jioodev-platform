import { NextRequest, NextResponse } from "next/server";
import { getProjectJob } from "@/modules/generation";
import { canAccess, findProject } from "@/modules/projects";
import { notFound, requireActor } from "@/modules/auth";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string; jobId: string }> }
) {
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

  const job = await getProjectJob(params.id, params.jobId).catch(() => null);
  if (!job) return notFound("Job tidak ditemukan.");
  return NextResponse.json(job);
}
