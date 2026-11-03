import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/shared/lib/account-server";
import { notFound, requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const updated = await markNotificationRead(auth.user.id, params.id).catch(
    () => null,
  );
  if (!updated) return notFound();
  return NextResponse.json(updated);
}
