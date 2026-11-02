import { NextRequest, NextResponse } from "next/server";
import { mockTemplates } from "@/shared/lib/mock-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productType = searchParams.get("product_type");
  const query = searchParams.get("q")?.toLowerCase();

  const items = mockTemplates.filter((template) => {
    const byType = !productType || template.productType === productType;
    const haystack = `${template.name} ${template.code} ${template.industries.join(" ")}`.toLowerCase();
    return byType && (!query || haystack.includes(query));
  });

  return NextResponse.json(items);
}
