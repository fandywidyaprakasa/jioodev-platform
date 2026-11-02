import fs from "node:fs";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const schema = JSON.parse(fs.readFileSync(path.join(DIR, "collections.json"), "utf8"));
const PB = process.env.POCKETBASE_PLATFORM_URL || process.env.PB_URL;
let token = process.env.PB_TOKEN || "";

if (!PB) {
  console.log("[schema] no POCKETBASE_PLATFORM_URL, skip");
  process.exit(0);
}

async function auth() {
  if (token) return;
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("no PB_ADMIN_EMAIL/PASSWORD");
  const r = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  const d = await r.json();
  token = d.token;
  if (!token) throw new Error("auth failed");
}

async function main() {
  await auth();
  const headers = { Authorization: token, "Content-Type": "application/json" };
  const res = await fetch(`${PB}/api/collections?perPage=500`, { headers });
  const data = await res.json();
  const existing = new Map();
  for (const c of data.items || []) {
    existing.set(c.name, c);
    existing.set(c.id, c);
  }
  let created = 0;
  for (const def of schema.collections) {
    if (existing.has(def.name)) {
      console.log("[schema] skip", def.name);
      continue;
    }
    const fields = (def.fields || []).map((f) => {
      const o = { name: f.name, type: f.type };
      if (f.required) o.required = true;
      if (f.maxSelect != null) o.maxSelect = f.maxSelect;
      if (f.values) o.values = f.values;
      if (f.type === "relation") {
        const t = existing.get(f.collectionName);
        if (!t) throw new Error("relation target missing: " + f.collectionName);
        o.collectionId = t.id;
      }
      return o;
    });
    const r = await fetch(`${PB}/api/collections`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: def.name, type: def.type || "base", fields }),
    });
    if (!r.ok) {
      console.error("[schema] fail", def.name, r.status, (await r.text()).slice(0, 120));
      continue;
    }
    const c = await r.json();
    existing.set(c.name, c);
    existing.set(c.id, c);
    created++;
    console.log("[schema] created", def.name);
  }
  console.log(`[schema] done. created=${created}`);
}

main().catch((e) => {
  console.error("[schema] error:", e.message);
  process.exit(0);
});
