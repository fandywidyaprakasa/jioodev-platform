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
