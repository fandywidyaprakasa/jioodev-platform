import { NextRequest, NextResponse } from "next/server";
import { getTemplate } from "@/shared/lib/templates-server";
import { notFound } from "@/shared/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } },
) {
  const template = await getTemplate(params.code);
  if (!template) return notFound("Template tidak ditemukan.");
  return NextResponse.json(template);
}
