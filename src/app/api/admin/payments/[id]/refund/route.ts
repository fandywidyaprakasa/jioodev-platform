import { NextRequest, NextResponse } from "next/server";
import { refundPayment } from "@/modules/payments";
import { notFound, requireUser } from "@/modules/auth";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const payment = await refundPayment(params.id, auth.user.email).catch(
    () => null,
  );
  if (!payment) return notFound("Pembayaran tidak ditemukan atau refund gagal.");
  return NextResponse.json({ ok: true, payment });
}
