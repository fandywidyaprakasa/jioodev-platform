import { NextResponse } from "next/server";
import { listTemplates } from "@/shared/lib/templates-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listTemplates());
}
