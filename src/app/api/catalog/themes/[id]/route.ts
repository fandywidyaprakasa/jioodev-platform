import { NextResponse } from "next/server";
import { getTheme } from "@/shared/lib/catalog-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const theme = await getTheme(params.id).catch(() => null);
  if (!theme) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Theme tidak ditemukan." } },
      { status: 404 },
    );
  }
  return NextResponse.json(theme);
}
