import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json({
    id: auth.user.id,
    name: "Fandy Widyaprakasa",
    email: auth.user.email ?? "fandy@jioo.site",
    phone: "0812-0000-0000",
    company: "JiooDev",
    locale: "id",
    timezone: "Asia/Jakarta",
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ ok: true, ...body });
}
