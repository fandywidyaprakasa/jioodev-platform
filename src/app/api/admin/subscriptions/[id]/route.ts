import { NextRequest, NextResponse } from "next/server";
import { listRecords, revokeSubscription, updateSubscription } from "@/modules/admin";
import { badRequest, requireUser } from "@/modules/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!id) return badRequest("id wajib diisi.");

  const body = (await request.json().catch(() => null)) as
    | {
        package_id?: string;
        period_end?: string | null;
        quota_landing_total?: number;
        quota_web_total?: number;
        quota_landing_used?: number;
        quota_web_used?: number;
        status?: string;
      }
    | null;

  if (!body) return badRequest("Body wajib diisi.");

  await updateSubscription(id, body).catch(() => null);

  const updated = await listRecords<{ id: string }>("subscriptions", {
    filter: `id='${id}'`,
    perPage: 1,
  }).catch(() => ({ items: [] }));
  const item = updated.items[0];
  return NextResponse.json(item);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!id) return badRequest("id wajib diisi.");

  await revokeSubscription(id).catch(() => undefined);
  return NextResponse.json({ ok: true, id });
}