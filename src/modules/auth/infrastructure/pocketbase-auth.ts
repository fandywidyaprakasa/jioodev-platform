/** Server-only PocketBase helpers for auth. */

import { pbAdminToken } from "@/shared/infrastructure/pocketbase/admin-token";
import { logActivity } from "@/modules/activity";

const PB = process.env.POCKETBASE_PLATFORM_URL ?? "";

export { pbAdminToken };

export async function upsertUser({
  email,
  name,
}: {
  email: string;
  name?: string;
}) {
  const token = await pbAdminToken();
  const safe = email.replace(/'/g, "\\'");
  const filter = encodeURIComponent(`email='${safe}'`);
  const found = await fetch(
    `${PB}/api/collections/users/records?perPage=1&filter=${filter}`,
    { headers: { Authorization: token } }
  );
  const data = await found.json();
  if (Array.isArray(data.items) && data.items.length > 0) return data.items[0];

  const password = `${crypto.randomUUID()}Aa1!`;
  const created = await fetch(`${PB}/api/collections/users/records`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      passwordConfirm: password,
      name: name ?? "",
      verified: true,
    }),
  });
  if (!created.ok) {
    throw new Error(
      `PB create user failed: ${created.status} ${(await created.text()).slice(0, 120)}`
    );
  }
  return created.json();
}

export async function audit({
  action,
  email,
  userId,
  meta,
}: {
  action: string;
  email?: string;
  userId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await logActivity({
      actor: "system",
      action,
      userId,
      entityType: "auth",
      entityId: email ?? "",
      meta: { ...(meta ?? {}), ...(email ? { email } : {}) },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
