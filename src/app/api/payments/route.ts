import { NextRequest, NextResponse } from "next/server";
import { mockPayment } from "@/shared/lib/mock-data";
import { badRequest, requireUser } from "@/shared/lib/server-auth";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { project_id?: string; package_id?: string }
    | null;
  if (!body?.project_id) return badRequest("project_id wajib diisi.");

  return NextResponse.json(
    { ...mockPayment, projectId: body.project_id, id: `pay_${Date.now()}` },
    { status: 201 },
  );
}
