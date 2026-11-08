import { NextResponse } from "next/server";
import { ALL_PRODUCT_TYPES } from "@/shared/types";
import { getTheme } from "@/modules/catalog";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const theme = await getTheme(params.id, ALL_PRODUCT_TYPES).catch(() => null);
  if (!theme) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Theme tidak ditemukan." } },
      { status: 404 },
    );
  }
  return NextResponse.json(theme);
}
