#!/usr/bin/env node
/**
 * Apply Platform PocketBase schema from pocketbase/collections.json.
 * Usage:
 *   PB_URL=... PB_TOKEN=... node deploy/apply-schema.mjs [--dry-run]
 *   PB_URL=... PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node deploy/apply-schema.mjs
 * Read-only with --dry-run (no writes).
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const schemaPath = [
  path.join(DIR, "collections.json"),
  path.join(DIR, "..", "pocketbase", "collections.json"),
  path.join(DIR, "..", "..", "pocketbase", "collections.json"),
].find((candidate) => fs.existsSync(candidate));
if (!schemaPath) {
  console.error("collections.json tidak ditemukan");
  process.exit(1);
}
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const PB = process.env.PB_URL ?? process.env.POCKETBASE_PLATFORM_URL;
const TOKEN = process.env.PB_TOKEN;
const EMAIL = process.env.PB_ADMIN_EMAIL;
const PASSWORD = process.env.PB_ADMIN_PASSWORD;
const DRY = process.argv.includes("--dry-run");

if (!PB) {
  console.error("PB_URL wajib di-set");
  process.exit(1);
}

const headers = { "Content-Type": "application/json" };

// PocketBase tidak menambahkan autodate saat koleksi dibuat via API fields[].
const SYSTEM_FIELDS = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

// Platform hanya diakses lewat API server (admin token). Kunci akses langsung.
const LOCKED_RULES = {
  listRule: null,
  viewRule: null,
  createRule: null,
  updateRule: null,
  deleteRule: null,
};

function rulesFor(def) {
  return { ...LOCKED_RULES, ...(def.rules || {}) };
}

if (TOKEN) headers.Authorization = TOKEN;

async function auth() {
  if (TOKEN) return TOKEN;
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "PB_TOKEN atau PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD wajib di-set",
    );
  }
  const response = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  });
  if (!response.ok) throw new Error(`Auth admin gagal: ${response.status}`);
  const body = await response.json();
  return body.token;
}

async function main() {
  headers.Authorization = await auth();
  const res = await fetch(`${PB}/api/collections?perPage=500`, { headers });
  if (!res.ok) throw new Error(`GET collections: ${res.status}`);
  const data = await res.json();
  const existing = new Map();
  for (const c of data.items || []) {
    existing.set(c.name, c);
    existing.set(c.id, c);
  }

  const planned = schema.collections.filter((d) => !existing.has(d.name));

  if (DRY) {
    for (const def of schema.collections) {
      const action = existing.has(def.name) ? "skip (exists)" : "create (dry)";
      console.log(`${action.padEnd(14)} ${def.name}`);
    }
    console.log(`\nDRY RUN — ${planned.length} akan dibuat, ${schema.collections.length - planned.length} sudah ada.`);
    return;
  }

  for (const def of schema.collections) {
    if (existing.has(def.name)) continue;
    const fields = [...SYSTEM_FIELDS, ...(def.fields || [])].map((f) => {
      const out = { name: f.name, type: f.type };
      if (f.required) out.required = true;
      if (f.maxSelect != null) out.maxSelect = f.maxSelect;
      if (f.values) out.values = f.values;
      if (f.type === "relation") {
        const target = existing.get(f.collectionName);
        if (!target) throw new Error(`Relation target tidak ada: ${f.collectionName}`);
        out.collectionId = target.id;
      }
      return out;
    });
    const body = {
      name: def.name,
      type: def.type || "base",
      fields,
      ...rulesFor(def),
    };
    const r = await fetch(`${PB}/api/collections`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error(`❌ ${def.name}: ${r.status} ${t.slice(0, 200)}`);
      continue;
    }
    const created = await r.json();
    existing.set(created.name, created);
    console.log(`✅ created ${def.name}`);
  }

  // Pastikan koleksi lama punya system fields created/updated + rules terkunci.
  for (const def of schema.collections) {
    const col = existing.get(def.name);
    if (!col) continue;
    const names = new Set((col.fields || []).map((f) => f.name));
    const missing = SYSTEM_FIELDS.filter((f) => !names.has(f.name));
    const desired = rulesFor(def);
    const rulesApplied = Object.entries(desired).every(
      ([key, value]) => col[key] === value,
    );
    if (!missing.length && rulesApplied) continue;

    const body = { ...desired };
    if (missing.length) body.fields = [...(col.fields || []), ...missing];

    const r = await fetch(`${PB}/api/collections/${col.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      console.error(`❌ patch ${def.name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      continue;
    }
    const notes = [];
    if (missing.length) notes.push(`+${missing.map((f) => f.name).join(",")}`);
    if (!rulesApplied) notes.push("rules locked");
    console.log(`🩹 patched ${def.name} (${notes.join("; ")})`);
  }
}

function DI(dry) {
  return dry ? "create (dry)" : "create";
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
