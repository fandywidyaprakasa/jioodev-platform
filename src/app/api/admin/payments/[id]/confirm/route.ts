import { NextRequest, NextResponse } from "next/server";
import { confirmPayment } from "@/modules/payments";
import { logActivity } from "@/modules/activity";
import { notFound, requireUser } from "@/modules/auth";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
