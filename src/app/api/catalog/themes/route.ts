import { NextRequest, NextResponse } from "next/server";
import {
  listThemes,
  themesForProduct,
} from "@/shared/lib/catalog-server";
import type { ProductType } from "@/shared/types";

const PRODUCTS: ProductType[] = ["LAND", "WEB", "COMM"];

export async function GET(request: NextRequest) {
  const product = request.nextUrl.searchParams.get("product");
  const themes = await listThemes().catch(() => []);
  if (product && PRODUCTS.includes(product as ProductType)) {
    return NextResponse.json(themesForProduct(themes, product as ProductType));
  }
  return NextResponse.json(themes);
}
