import { NextResponse } from "next/server";
import { listActivity } from "@/shared/lib/account-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const items = await listActivity(auth.user.id).catch(() => []);
  return NextResponse.json(items);
}
