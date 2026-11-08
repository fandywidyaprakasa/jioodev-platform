import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { completeJob } from "@/modules/generation";
import { badRequest } from "@/modules/auth";
import type { JobVariant } from "@/shared/types";

export async function POST(request: NextRequest) {
  const secret = process.env.HERMES_CALLBACK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Callback belum dikonfigurasi." } },
      { status: 503 },
    );
  }
  const provided = request.headers.get("x-hermes-secret") ?? "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  const valid =
    actual.length === expected.length && timingSafeEqual(actual, expected);
  if (!valid) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Secret tidak valid." } },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        job_id?: string;
        status?: string;
        variants?: JobVariant[];
        html_path?: string;
        quality?: unknown;
      }
    | null;
  if (!body?.job_id || !body.status) {
    return badRequest("job_id dan status wajib diisi.");
  }
  if (!["READY", "FAILED", "PROCESSING"].includes(body.status)) {
    return badRequest("status tidak valid.", { field: "status" });
  }

  const job = await completeJob({
    jobId: body.job_id,
    status: body.status,
    variants: body.variants,
    htmlPath: body.html_path,
    quality: body.quality,
  }).catch(() => null);
  if (!job) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Job tidak ditemukan." } },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, job });
}
