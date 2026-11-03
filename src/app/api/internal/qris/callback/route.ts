import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyQrisCallback } from "@/shared/lib/payments-server";
import { badRequest, notFound } from "@/shared/lib/server-auth";

interface QrisWebhookBody {
  charge_id?: string;
  id?: string;
  status?: string;
  data?: { charge_id?: string; id?: string; status?: string };
}

function matchesSecret(provided: string | null, secret: string) {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.QRIS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_CONFIGURED",
          message: "QRIS webhook belum dikonfigurasi.",
        },
      },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("x-qris-signature") ??
    request.headers.get("x-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!matchesSecret(provided, secret)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Signature webhook tidak valid." } },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | QrisWebhookBody
    | null;
  const chargeId =
    body?.charge_id ?? body?.id ?? body?.data?.charge_id ?? body?.data?.id;
  const status = body?.status ?? body?.data?.status;
  if (!chargeId || !status) {
    return badRequest("charge_id dan status wajib diisi.");
  }

  const payment = await applyQrisCallback({ chargeId, status }).catch(
    () => null,
  );
  if (!payment) return notFound("Pembayaran untuk charge_id tidak ditemukan.");
  return NextResponse.json({ ok: true, payment });
}
