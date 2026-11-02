import { NextResponse } from "next/server";
import { mockActivity } from "@/shared/lib/mock-data";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json(mockActivity);
}
