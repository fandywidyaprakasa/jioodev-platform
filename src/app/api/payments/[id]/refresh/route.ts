import { NextRequest, NextResponse } from "next/server";
import { getPaymentForUser, refreshPayment } from "@/modules/payments";
import { notFound, requireUser } from "@/modules/auth";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const owned = await getPaymentForUser(
    params.id,
    auth.user.id,
    auth.user.role === "admin",
  ).catch(() => null);
  if (!owned) return notFound("Pembayaran tidak ditemukan.");

  const payment = await refreshPayment(params.id).catch(() => null);
  if (!payment) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memperbarui status." } },
      { status: 502 },
    );
  }
  return NextResponse.json(payment);
}
