import { NextRequest, NextResponse } from "next/server";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/modules/admin";
import { badRequest, requireUser } from "@/modules/auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const settings = await getPlatformSettings().catch(() => null);
  if (!settings) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memuat pengaturan." } },
      { status: 502 },
    );
  }
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Body wajib berupa objek.");
  }

  const settings = await updatePlatformSettings(body, {
    userId: auth.user.id,
    email: auth.user.email,
  }).catch(() => null);
  if (!settings) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan pengaturan." } },
      { status: 502 },
    );
  }
  return NextResponse.json(settings);
}
