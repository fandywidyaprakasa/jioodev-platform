import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireUser } from "@/shared/lib/server-auth";
import {
  canAccess,
  findProject,
  patchProject,
  saveBusinessProfile,
} from "@/shared/lib/projects-server";
import type { BusinessContext } from "@/shared/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const project = await findProject(params.id);
  if (!project || !canAccess(project, auth.user.id, auth.user.role === "admin")) {
    return notFound();
  }

  const body = (await request.json().catch(() => null)) as
    | Partial<BusinessContext>
    | null;
  if (!body?.businessName) {
    return badRequest("businessName wajib diisi.", { field: "businessName" });
  }

  const ctx: BusinessContext = {
    businessName: body.businessName,
    industry: body.industry ?? "",
    businessPurpose: body.businessPurpose ?? [],
    targetAudience: body.targetAudience ?? "",
    channels: body.channels ?? [],
    designPref: body.designPref ?? "",
    businessGoals: body.businessGoals ?? "",
  };

  try {
    await saveBusinessProfile(params.id, ctx);
    await patchProject(params.id, {
      client_label: ctx.businessName,
      status: "INTAKE",
    });
    return NextResponse.json(ctx);
  } catch (e) {
    console.error("[context] save failed", e);
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan business context." } },
      { status: 502 },
    );
  }
}
