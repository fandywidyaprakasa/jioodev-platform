import { NextRequest, NextResponse } from "next/server";
import { mockTemplates } from "@/shared/lib/mock-data";
import { notFound } from "@/shared/lib/server-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } },
) {
  const template = mockTemplates.find((item) => item.code === params.code);
  return template ? NextResponse.json(template) : notFound("Template tidak ditemukan.");
}
