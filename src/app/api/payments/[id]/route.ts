import { NextRequest, NextResponse } from "next/server";
import { getPaymentForUser } from "@/shared/lib/payments-server";
import { notFound, requireUser } from "@/shared/lib/server-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const payment = await getPaymentForUser(
    params.id,
    auth.user.id,
    auth.user.role === "admin",
  ).catch(() => null);
  if (!payment) return notFound("Pembayaran tidak ditemukan.");
  return NextResponse.json(payment);
}
