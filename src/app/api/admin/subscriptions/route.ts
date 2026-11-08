import { NextRequest, NextResponse } from "next/server";
import {
  grantSubscription,
  listUsersWithSubscriptions,
} from "@/modules/admin";
import { badRequest, requireUser } from "@/modules/auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const users = await listUsersWithSubscriptions().catch(() => []);
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        userId?: string;
        packageId?: string;
        periodEnd?: string | null;
        quotaLanding?: number;
        quotaWeb?: number;
      }
    | null;

  if (!body?.userId || !body?.packageId) {
    return badRequest("userId dan packageId wajib diisi.");
  }

  const result = await grantSubscription({
    userId: body.userId,
    packageId: body.packageId,
    periodEnd: body.periodEnd ?? null,
    quotaLanding: body.quotaLanding,
    quotaWeb: body.quotaWeb,
  }).catch(() => null);

  if (!result) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memberi langganan." } },
      { status: 502 },
    );
  }
  return NextResponse.json(result, { status: 201 });
}