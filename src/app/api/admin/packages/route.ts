import { NextRequest, NextResponse } from "next/server";
import { mockPackages } from "@/shared/lib/mock-data";
import { badRequest, requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;
  return NextResponse.json(mockPackages);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { name?: string; price?: number; quota?: number }
    | null;
  if (!body?.name || !body.price || !body.quota) {
    return badRequest("name, price, dan quota wajib diisi.");
  }

  const item = {
    id: `pkg_${Date.now()}`,
    name: body.name,
    price: body.price,
    quota: body.quota,
    active: true,
  };
  mockPackages.push(item);
  return NextResponse.json(item, { status: 201 });
}
