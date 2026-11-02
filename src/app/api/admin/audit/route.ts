import { NextResponse } from "next/server";
import { mockAudit } from "@/shared/lib/mock-data";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  return NextResponse.json(mockAudit);
}
