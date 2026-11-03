#!/usr/bin/env node
/**
 * Apply Platform PocketBase schema from pocketbase/collections.json.
 * Usage:
 *   PB_URL=... PB_TOKEN=... node scripts/apply-pb-schema.mjs [--dry-run]
 * Read-only with --dry-run (no writes).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const schema = JSON.parse(
  fs.readFileSync(path.join(ROOT, "pocketbase", "collections.json"), "utf8")
);
const PB = process.env.PB_URL;
const TOKEN = process.env.PB_TOKEN;
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
if (TOKEN) headers.Authorization = TOKEN;

async function main() {
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
    const body = { name: def.name, type: def.type || "base", fields };
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

  // Pastikan koleksi lama punya system fields created/updated.
  for (const def of schema.collections) {
    const col = existing.get(def.name);
    if (!col) continue;
    const names = new Set((col.fields || []).map((f) => f.name));
    const missing = SYSTEM_FIELDS.filter((f) => !names.has(f.name));
    if (!missing.length) continue;
    const r = await fetch(`${PB}/api/collections/${col.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields: [...(col.fields || []), ...missing] }),
    });
    if (!r.ok) {
      console.error(`❌ patch ${def.name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      continue;
    }
    console.log(`🩹 patched ${def.name} (+${missing.map((f) => f.name).join(",")})`);
  }
}

function DI(dry) {
  return dry ? "create (dry)" : "create";
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
