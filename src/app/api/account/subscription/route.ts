import { NextResponse } from "next/server";
import { getSubscription } from "@/modules/account";
import { requireUser } from "@/modules/auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const subscription = await getSubscription(auth.user.id).catch(() => null);
  return NextResponse.json(
    subscription ?? {
      plan: "Belum berlangganan",
      status: "EXPIRED",
      quotaUsed: 0,
      quotaTotal: 0,
      renewAt: new Date().toISOString(),
    },
  );
}
