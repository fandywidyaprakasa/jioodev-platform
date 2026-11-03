import { NextRequest, NextResponse } from "next/server";
import { createOrGetJob } from "@/shared/lib/jobs-server";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import { notFound, requireActor } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
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

  if (!["TEMPLATE_CHOSEN", "GENERATING", "PREVIEWS"].includes(project.status ?? "")) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TRANSITION",
          message: "Generate hanya tersedia setelah template dipilih.",
        },
      },
      { status: 409 },
    );
  }

  if (!project.template_id) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Pilih template sebelum generate.",
        },
      },
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
