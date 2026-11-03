import { NextRequest, NextResponse } from "next/server";
import { confirmPayment } from "@/shared/lib/admin-server";
import { logActivity } from "@/shared/lib/activity-server";
import { notFound, requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const payment = await confirmPayment(params.id, auth.user.id).catch(
    () => null,
  );
  if (!payment) return notFound("Pembayaran tidak ditemukan.");
  await logActivity({
    userId: auth.user.id,
    actor: auth.user.email ?? "admin",
    action: "payment.confirm",
    entityType: "payment",
    entityId: params.id,
  });
  return NextResponse.json({ ok: true, payment });
}
