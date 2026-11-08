import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/modules/account";
import { notFound, requireUser } from "@/modules/auth";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const updated = await markNotificationRead(auth.user.id, params.id).catch(
    () => null,
  );
  if (!updated) return notFound();
  return NextResponse.json(updated);
}
