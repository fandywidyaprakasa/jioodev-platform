/** Server-only PocketBase helpers for auth. */

const PB = process.env.POCKETBASE_PLATFORM_URL ?? "";
let cache: { token: string; exp: number } | null = null;

export async function pbAdminToken(): Promise<string> {
  if (cache && Date.now() < cache.exp) return cache.token;
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;
  if (!PB || !email || !password) throw new Error("PocketBase env missing");
  const r = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!r.ok) throw new Error(`PB auth failed: ${r.status}`);
  const d = await r.json();
  cache = { token: d.token, exp: Date.now() + 50 * 60 * 1000 };
  return d.token;
}

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
    const token = await pbAdminToken();
    await fetch(`${PB}/api/collections/activity_log/records`, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({
        actor: "system",
        action,
        entity_type: "auth",
        entity_id: email ?? "",
        meta: meta ?? {},
        ...(userId ? { user_id: userId } : {}),
      }),
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
