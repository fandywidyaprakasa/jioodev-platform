import { NextResponse } from "next/server";
import { listNotifications } from "@/shared/lib/account-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const items = await listNotifications(auth.user.id).catch(() => []);
  return NextResponse.json(items);
}
