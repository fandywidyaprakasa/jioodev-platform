import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const pb = process.env.POCKETBASE_PLATFORM_URL;
  let pbOk: boolean | null = null;
  if (pb) {
    const response = await fetch(`${pb}/api/health`, {
      signal: AbortSignal.timeout(2500),
    }).catch(() => null);
    pbOk = Boolean(response?.ok);
  }

  return NextResponse.json({
    ok: pbOk !== false,
    service: "jioodev-platform",
    checks: {
      pocketbase: pb ? (pbOk ? "ok" : "fail") : "not-configured",
      masterHub: process.env.MASTER_HUB_URL ? "configured" : "not-configured",
      qris: process.env.QRIS_API_URL ? "configured" : "manual",
      hermes:
        process.env.HERMES_JOB_URL || process.env.HERMES_CALLBACK_SECRET
          ? "configured"
          : "not-configured",
      email: process.env.RESEND_API_KEY ? "configured" : "not-configured",
    },
  });
}
