import { NextResponse } from "next/server";
import { listDeployments } from "@/shared/lib/deploy-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  return NextResponse.json(await listDeployments().catch(() => []));
}
