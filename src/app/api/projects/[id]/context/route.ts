import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import {
  canAccess,
  findProject,
  getBusinessProfile,
  saveProjectBusinessContext,
} from "@/modules/projects";
import type { BusinessContext } from "@/shared/types";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireActor();
  if ("response" in auth) return auth.response;

  const project = await findProject(params.id);
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

  const profile = await getBusinessProfile(params.id);
  if (!profile) return notFound("Business context belum diisi.");
  return NextResponse.json({
    businessName: profile.business_name ?? "",
    industry: profile.industry ?? "",
    businessPurpose: profile.business_purpose ?? [],
    targetAudience: profile.target_audience ?? "",
    channels: profile.channels ?? [],
    designPref: profile.design_pref ?? "",
    businessGoals: profile.business_goals ?? "",
  } satisfies BusinessContext);
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireActor();
  if ("response" in auth) return auth.response;

  const project = await findProject(params.id);
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
    await saveProjectBusinessContext(params.id, ctx);
    return NextResponse.json(ctx);
  } catch (e) {
    console.error("[context] save failed", e);
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan business context." } },
      { status: 502 },
    );
  }
}
