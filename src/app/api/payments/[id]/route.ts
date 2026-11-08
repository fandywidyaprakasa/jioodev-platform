import { NextRequest, NextResponse } from "next/server";
import { getPaymentForUser } from "@/modules/payments";
import { notFound, requireUser } from "@/modules/auth";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
