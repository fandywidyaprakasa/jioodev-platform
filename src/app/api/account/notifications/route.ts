import { NextResponse } from "next/server";
import { listNotifications } from "@/modules/account";
import { requireUser } from "@/modules/auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const items = await listNotifications(auth.user.id).catch(() => []);
  return NextResponse.json(items);
}
