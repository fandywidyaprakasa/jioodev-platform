import { NextRequest, NextResponse } from "next/server";
import {
  createPackage,
  deletePackage,
  listPackages,
  updatePackage,
} from "@/modules/admin";
import { badRequest, requireUser } from "@/modules/auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const packages = await listPackages().catch(() => []);
  return NextResponse.json(packages);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        price?: number;
        deploy_included?: number;
        tier?: "FREE" | "PRO" | "AGENCY" | "ADDON";
        billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
      }
    | null;
  if (!body?.name || !body.price || !body.deploy_included) {
    return badRequest("name, price, dan deploy_included wajib diisi.");
  }

  const item = await createPackage({
    name: body.name,
    price: body.price,
    deploy_included: body.deploy_included,
    tier: body.tier,
    billing_type: body.billing_type,
  }).catch(() => null);

  if (!item) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan paket." } },
      { status: 502 },
    );
  }
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        name?: string;
        price?: number;
        deploy_included?: number;
        active?: boolean;
        tier?: "FREE" | "PRO" | "AGENCY" | "ADDON";
        billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
      }
    | null;
  if (!body?.id) return badRequest("id wajib diisi.");

  const item = await updatePackage(body.id, {
    name: body.name,
    price: body.price,
    deploy_included: body.deploy_included,
    active: body.active,
    tier: body.tier,
    billing_type: body.billing_type,
  }).catch(() => null);
  if (!item) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memperbarui paket." } },
      { status: 502 },
    );
  }
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id wajib diisi.");
  await deletePackage(id).catch(() => undefined);
  return NextResponse.json({ ok: true, id });
}
