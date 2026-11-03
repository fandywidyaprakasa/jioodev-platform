import { NextResponse } from "next/server";
import { decodePreviewToken, getOutput, isOutputRevoked } from "@/shared/lib/jobs-server";
import { updateRecord } from "@/shared/lib/pb-platform";
import { badRequest, requireUser } from "@/shared/lib/server-auth";

export async function POST(request: Request) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { output_id?: string; token?: string }
    | null;
  if (!body) return badRequest("Body tidak valid.");

  const outputId = body.output_id ?? (body.token ? decodePreviewToken(body.token)?.outputId : null);
  if (!outputId) return badRequest("output_id atau token wajib diisi.");

  const output = await getOutput(outputId).catch(() => null);
  if (!output) return NextResponse.json({ error: "Output tidak ditemukan." }, { status: 404 });
  if (isOutputRevoked(output)) return NextResponse.json({ ok: true, output_id: outputId });

  const revokedAt = new Date().toISOString();
  try {
    await updateRecord("production_outputs", outputId, { revoked_at: revokedAt });
  } catch {
    const quality =
      output.quality && typeof output.quality === "object"
        ? (output.quality as Record<string, unknown>)
        : {};
    await updateRecord("production_outputs", outputId, {
      quality: { ...quality, revoked_at: revokedAt },
    });
  }

  return NextResponse.json({ ok: true, output_id: outputId });
}
