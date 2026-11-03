import { NextResponse } from "next/server";
import { adminStats } from "@/shared/lib/admin-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const stats = await adminStats().catch(() => ({
    projects: 0,
    pendingPayments: 0,
    liveDeployments: 0,
    activeUsers: 0,
  }));
  return NextResponse.json(stats);
}
