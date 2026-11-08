import { NextResponse } from "next/server";
import { listPayments } from "@/modules/payments";
import { requireUser } from "@/modules/auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const payments = await listPayments().catch(() => []);
  return NextResponse.json(payments);
}
