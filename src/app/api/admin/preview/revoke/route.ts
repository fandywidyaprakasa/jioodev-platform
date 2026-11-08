import { NextResponse } from "next/server";
import { decodePreviewToken, revokeOutput } from "@/modules/generation";
import { badRequest, requireUser } from "@/modules/auth";

export async function POST(request: Request) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { output_id?: string; token?: string }
    | null;
  if (!body) return badRequest("Body tidak valid.");

  const outputId =
    body.output_id ??
    (body.token ? decodePreviewToken(body.token)?.outputId : null);
  if (!outputId) return badRequest("output_id atau token wajib diisi.");

  const result = await revokeOutput(outputId);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Output tidak ditemukan." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, output_id: outputId });
}
