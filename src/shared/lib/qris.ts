export interface QrisCharge {
  provider: string;
  chargeId: string;
  reference: string;
  qrString: string;
  expiresAt: string;
  rawResponse?: unknown;
}

const BASE = (process.env.QRIS_API_URL ?? process.env.QRIS_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const KEY = process.env.QRIS_API_KEY;
const ENABLED =
  process.env.QRIS_ENABLED !== "false" && process.env.QRIS_ENABLED !== "0";

export function qrisConfigured() {
  return Boolean(ENABLED && BASE && KEY);
}

/**
 * Creates a QRIS charge. When no provider credentials are configured, falls
 * back to a manual reference that an admin verifies from the payment queue.
 */
export async function createQrisCharge(input: {
  amount: number;
  reference: string;
  description: string;
}): Promise<QrisCharge> {
  if (!qrisConfigured()) {
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    return {
      provider: "manual",
      chargeId: `manual_${input.reference}`,
      reference: input.reference,
      qrString: `JIOODEV-MANUAL|${input.reference}|${input.amount}|${expires}`,
      expiresAt: expires,
    };
  }

  const response = await fetch(`${BASE}/qris-api/charges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      reference: input.reference,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`QRIS charge gagal (${response.status}).`);
  }
  const body = (await response.json()) as {
    id?: string;
    reference?: string;
    reference_id?: string;
    qr_string?: string;
    expires_at?: string;
  };
  if (!body.id || !body.qr_string) {
    throw new Error("Respons QRIS tidak lengkap.");
  }
  return {
    provider: "qris",
    chargeId: body.id,
    reference: body.reference_id ?? body.reference ?? input.reference,
    qrString: body.qr_string,
    expiresAt:
      body.expires_at ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    rawResponse: body,
  };
}

export type QrisStatus = "PENDING" | "CONFIRMED" | "FAILED" | "EXPIRED";

export function mapQrisStatus(status: string | undefined): QrisStatus {
  switch (status) {
    case "paid":
    case "settled":
    case "success":
    case "CONFIRMED":
      return "CONFIRMED";
    case "failed":
    case "FAILED":
      return "FAILED";
    case "expired":
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

export async function checkQrisCharge(
  chargeId: string,
): Promise<QrisStatus | null> {
  if (!qrisConfigured() || chargeId.startsWith("manual_")) return null;
  const response = await fetch(
    `${BASE}/qris-api/charges/${encodeURIComponent(chargeId)}`,
    {
      headers: { Authorization: `Bearer ${KEY}` },
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { status?: string };
  return mapQrisStatus(body.status);
}

export async function refundQrisCharge(
  chargeId: string,
  amount: number,
): Promise<boolean> {
  if (!qrisConfigured() || chargeId.startsWith("manual_")) return true;
  const response = await fetch(`${BASE}/qris-api/refunds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ charge_id: chargeId, amount }),
    cache: "no-store",
  }).catch(() => null);
  return Boolean(response?.ok);
}
