import { NextRequest, NextResponse } from "next/server";
import {
  getAccountProfile,
  saveAccountProfile,
  type AccountProfile,
} from "@/shared/lib/account-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const profile = await getAccountProfile(auth.user.id).catch(() => null);
  return NextResponse.json({
    id: profile?.id ?? auth.user.id,
    name: profile?.name || auth.user.email?.split("@")[0] || "Pengguna",
    email: auth.user.email ?? "",
    phone: profile?.phone ?? "",
    company: profile?.company ?? "",
    locale: profile?.locale ?? "id",
    timezone: profile?.timezone ?? "Asia/Jakarta",
    notificationsPref:
      (profile?.notifications_pref as Record<string, boolean>) ?? {
        email: true,
        preview: true,
        product: false,
      },
  } satisfies AccountProfile);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Partial<AccountProfile>;
  const saved = await saveAccountProfile(auth.user.id, body).catch(() => null);
  if (!saved) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan profil." } },
      { status: 502 },
    );
  }
  return NextResponse.json({
    id: saved.id,
    name: saved.name ?? "",
    email: auth.user.email ?? "",
    phone: saved.phone ?? "",
    company: saved.company ?? "",
    locale: saved.locale ?? "id",
    timezone: saved.timezone ?? "Asia/Jakarta",
    notificationsPref:
      (saved.notifications_pref as Record<string, boolean>) ?? {
        email: true,
        preview: true,
        product: false,
      },
  } satisfies AccountProfile);
}
