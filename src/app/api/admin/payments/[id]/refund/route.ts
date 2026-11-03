import { NextRequest, NextResponse } from "next/server";
import { refundPayment } from "@/shared/lib/payments-server";
import { notFound, requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const payment = await refundPayment(params.id, auth.user.email).catch(
    () => null,
  );
  if (!payment) return notFound("Pembayaran tidak ditemukan atau refund gagal.");
  return NextResponse.json({ ok: true, payment });
}
