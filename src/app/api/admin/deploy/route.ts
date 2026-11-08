import { NextResponse } from "next/server";
import { listDeployments } from "@/modules/publishing";
import { requireUser } from "@/modules/auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  return NextResponse.json(await listDeployments().catch(() => []));
}
