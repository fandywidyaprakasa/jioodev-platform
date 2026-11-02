import { NextRequest, NextResponse } from "next/server";
import { mockSections } from "@/shared/lib/mock-data";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json(mockSections);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  return NextResponse.json(body ?? mockSections);
}
