import { NextResponse } from "next/server";
import { listAudit } from "@/shared/lib/activity-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const audit = await listAudit().catch(() => []);
  return NextResponse.json(audit);
}
