import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/modules/activity";
import { badRequest } from "@/modules/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; message?: string }
    | null;
  if (!body?.name || !body?.email || !body?.message) {
    return badRequest("name, email, dan message wajib diisi.");
  }
  if (body.message.length > 4000) return badRequest("Pesan terlalu panjang.");

  await logActivity({
    actor: body.email,
    action: "contact.submit",
    entityType: "contact",
    meta: { name: body.name, email: body.email, message: body.message },
  });
  return NextResponse.json({ ok: true });
}
