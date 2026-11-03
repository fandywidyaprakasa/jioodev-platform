import { NextRequest, NextResponse } from "next/server";
import { getPlatformSettings, savePlatformSettings } from "@/shared/lib/settings-server";
import { logActivity } from "@/shared/lib/activity-server";
import { badRequest, requireUser } from "@/shared/lib/server-auth";

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

  const settings = await savePlatformSettings(body).catch(() => null);
  if (!settings) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan pengaturan." } },
      { status: 502 },
    );
  }
  await logActivity({
    userId: auth.user.id,
    actor: auth.user.email ?? "admin",
    action: "settings.update",
    entityType: "settings",
    meta: body,
  });
  return NextResponse.json(settings);
}
