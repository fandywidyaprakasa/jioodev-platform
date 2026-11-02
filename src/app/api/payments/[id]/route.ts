import { NextRequest, NextResponse } from "next/server";
import { mockPayment } from "@/shared/lib/mock-data";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json({ ...mockPayment, id: params.id });
}
