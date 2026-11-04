import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REQUIRED_ENV = [
  "POCKETBASE_PLATFORM_URL",
  "PB_ADMIN_EMAIL",
  "PB_ADMIN_PASSWORD",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
];

function hasMasterHub() {
  return Boolean(
    process.env.MASTER_HUB_URL || process.env.POCKETBASE_MASTER_URL,
  );
}

async function libraryOk() {
  const root =
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library");
  try {
    await fs.access(path.join(root, "templates"));
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const pb = process.env.POCKETBASE_PLATFORM_URL;
  let pbOk: boolean | null = null;
  if (pb) {
    const response = await fetch(`${pb}/api/health`, {
      signal: AbortSignal.timeout(2500),
    }).catch(() => null);
    pbOk = Boolean(response?.ok);
  }

  const isProd = process.env.NODE_ENV === "production";
  const allowInsecureMock =
    process.env.JIOODEV_AUTH_MODE === "mock" &&
    (!isProd || process.env.JIOODEV_ALLOW_INSECURE_MOCK === "1");
  const missing = isProd
    ? REQUIRED_ENV.filter((key) => !process.env[key]).concat(
        hasMasterHub() ? [] : ["MASTER_HUB_URL/MASTER_HUB_TOKEN"],
      )
    : [];
  const hasLibrary = await libraryOk();

  return NextResponse.json({
    ok: pbOk !== false && missing.length === 0 && hasLibrary,
    service: "jioodev-platform",
    checks: {
      pocketbase: pb ? (pbOk ? "ok" : "fail") : "not-configured",
      masterHub: hasMasterHub() ? "configured" : "not-configured",
      library: hasLibrary ? "ok" : "missing",
      auth: allowInsecureMock ? "insecure-mock" : "real",
      preview:
        process.env.PREVIEW_TOKEN_SECRET || process.env.NEXTAUTH_SECRET
          ? "configured"
          : "not-configured",
      qris: process.env.QRIS_API_URL ? "configured" : "manual",
      hermes:
        process.env.HERMES_JOB_URL || process.env.HERMES_CALLBACK_SECRET
          ? "configured"
          : "not-configured",
      email: process.env.RESEND_API_KEY ? "configured" : "not-configured",
    },
    missingEnv: missing,
  });
}
