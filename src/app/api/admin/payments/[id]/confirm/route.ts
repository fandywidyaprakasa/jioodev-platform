import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  return NextResponse.json({ ok: true, payment_id: params.id, status: "CONFIRMED" });
}
