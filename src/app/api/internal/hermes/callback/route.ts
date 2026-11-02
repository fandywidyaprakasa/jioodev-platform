import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/shared/lib/server-auth";

export async function POST(request: NextRequest) {
  const secret = process.env.HERMES_CALLBACK_SECRET;
  if (secret && request.headers.get("x-hermes-secret") !== secret) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Secret tidak valid." } },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { job_id?: string; status?: string }
    | null;
  if (!body?.job_id || !body.status) {
    return badRequest("job_id dan status wajib diisi.");
  }

  return NextResponse.json({ ok: true });
}
