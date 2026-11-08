import { NextRequest, NextResponse } from "next/server";
import { getTemplate } from "@/modules/catalog";
import { notFound } from "@/modules/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const template = await getTemplate(params.code);
  if (!template) return notFound("Template tidak ditemukan.");
  return NextResponse.json(template);
}
