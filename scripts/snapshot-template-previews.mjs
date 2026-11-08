#!/usr/bin/env node
/**
 * Generate Web/Tablet/Mobile snapshots for READY templates.
 *
 * Usage:
 *   pnpm dev --port 3100
 *   pnpm snapshot:previews -- --base-url=http://127.0.0.1:3100
 *
 * Flags:
 *   --base-url=...   Preview server origin (default http://127.0.0.1:3000)
 *   --only=CODE      Limit to one asset_code
 *   --force          Regenerate even when snapshot hash matches
 *   --check          Validate snapshots without browser (no server needed)
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const LIBRARY = process.env.JIOODEV_LIBRARY_DIR ?? path.join(ROOT, "..", "library");
const TEMPLATES = path.join(LIBRARY, "templates");
const args = process.argv.slice(2);
const baseUrl = (
  args.find((arg) => arg.startsWith("--base-url="))?.split("=")[1] ??
  "http://127.0.0.1:3000"
).replace(/\/$/, "");
const only = args.find((arg) => arg.startsWith("--only="))?.split("=")[1];
const force = args.includes("--force");
const check = args.includes("--check");
const RENDERER_VERSION = "1";

const VIEWPORTS = {
  web: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

async function listTemplates() {
  const entries = await fs.readdir(TEMPLATES);
  const templates = [];
  for (const dir of entries) {
    if (dir.startsWith("_") || dir.startsWith(".")) continue;
    try {
      const meta = JSON.parse(
        await fs.readFile(path.join(TEMPLATES, dir, "meta.json"), "utf8"),
      );
      if (meta.status !== "READY") continue;
      const code = meta.asset_code ?? dir;
      if (only && code !== only) continue;
      templates.push({ code, dir });
    } catch {
      // Skip incomplete templates.
    }
  }
  return templates.sort((a, b) => a.code.localeCompare(b.code));
}

async function hashTree(dir) {
  const hash = createHash("sha256");
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === "previews") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        hash.update(path.relative(dir, full));
        hash.update(await fs.readFile(full));
      }
    }
  }
  await walk(dir);
  return `sha256:${hash.digest("hex")}`;
}

async function templateHash(dir) {
  const hash = createHash("sha256");
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === "previews") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        hash.update(path.relative(dir, full));
        hash.update(await fs.readFile(full));
      }
    }
  }
  await walk(dir);
  return `sha256:${hash.digest("hex")}`;
}

async function globalRenderHash() {
  const parts = [];
  for (const dir of [
    path.join(LIBRARY, "themes", "split-edt"),
    path.join(LIBRARY, "sections"),
    path.join(LIBRARY, "compositions"),
  ]) {
    try {
      parts.push(await hashTree(dir));
    } catch {
      // Optional render inputs may not exist.
    }
  }
  return createHash("sha256")
    .update(RENDERER_VERSION)
    .update(parts.join("|"))
    .digest("hex");
}

async function renderHash(dir, globalHash) {
  return `sha256:${createHash("sha256")
    .update(await templateHash(dir))
    .update(globalHash)
    .update(RENDERER_VERSION)
    .digest("hex")}`;
}

async function readSnapshot(dir) {
  try {
    return JSON.parse(
      await fs.readFile(path.join(dir, "previews", "snapshot.json"), "utf8"),
    );
  } catch {
    return null;
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeAtomic(file, data) {
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, data);
  await fs.rename(temp, file);
}

async function capture(page, viewport, destination) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}/template-preview/${page.__code}`, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}",
  });
  const png = `${destination}.png`;
  await page.screenshot({ path: png, fullPage: false });
  execFileSync("cwebp", ["-quiet", "-q", "82", png, "-o", destination]);
  await fs.unlink(png);
}

const templates = await listTemplates();
if (!templates.length) {
  console.log("No READY templates found.");
  process.exit(0);
}
if (check) {
  const globalHash = await globalRenderHash();
  const failures = [];
  for (const template of templates) {
    const dir = path.join(TEMPLATES, template.dir);
    const previewDir = path.join(dir, "previews");
    const snapshot = await readSnapshot(dir);
    const expected = await renderHash(dir, globalHash);
    if (!snapshot || snapshot.status !== "READY") {
      failures.push(`${template.code}: snapshot missing/not READY`);
      continue;
    }
    if (snapshot.render_hash !== expected) {
      failures.push(`${template.code}: render_hash mismatch`);
      continue;
    }
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
      const file = path.join(previewDir, `${device}.webp`);
      if (!(await exists(file))) {
        failures.push(`${template.code}: missing ${device}.webp`);
        continue;
      }
      try {
        const meta = await sharp(file).metadata();
        if (meta.width !== viewport.width || meta.height !== viewport.height) {
          failures.push(
            `${template.code}: ${device} is ${meta.width}x${meta.height}, expected ${viewport.width}x${viewport.height}`,
          );
        }
      } catch {
        failures.push(`${template.code}: invalid ${device}.webp`);
      }
    }
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`✓ ${templates.length} templates have valid preview snapshots`);
  process.exit(0);
}

console.log(`Templates: ${templates.length} · base ${baseUrl}`);
const globalHash = await globalRenderHash();

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });
let changed = 0;
let skipped = 0;
let failed = 0;

for (const template of templates) {
  const dir = path.join(TEMPLATES, template.dir);
  const previewDir = path.join(dir, "previews");
  const existing = await readSnapshot(dir);
  const templateDigest = await templateHash(dir);
  const hash = await renderHash(dir, globalHash);
  const complete =
    existing?.render_hash === hash &&
    existing?.status === "READY" &&
    (await exists(path.join(previewDir, "web.webp"))) &&
    (await exists(path.join(previewDir, "tablet.webp"))) &&
    (await exists(path.join(previewDir, "mobile.webp")));
  if (complete && !force) {
    skipped += 1;
    console.log(`↷ ${template.code} unchanged`);
    continue;
  }

  try {
    await fs.mkdir(previewDir, { recursive: true });
    const page = await context.newPage();
    page.__code = template.code;
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
      const destination = path.join(previewDir, `${device}.webp`);
      await capture(page, viewport, destination);
    }
    await page.close();
    const now = new Date().toISOString();
    const snapshot = {
      asset_code: template.code,
      version: (existing?.version ?? 0) + 1,
      status: "READY",
      template_hash: templateDigest,
      render_hash: hash,
      renderer: "template-preview",
      renderer_version: RENDERER_VERSION,
      captured_at: now,
      captured_by: "snapshot-template-previews.mjs",
      viewports: Object.fromEntries(
        Object.entries(VIEWPORTS).map(([device, viewport]) => [
          device,
          { file: `${device}.webp`, width: viewport.width, height: viewport.height },
        ]),
      ),
    };
    await writeAtomic(
      path.join(previewDir, "snapshot.json"),
      `${JSON.stringify(snapshot, null, 2)}\n`,
    );
    changed += 1;
    console.log(`✓ ${template.code} (${hash.slice(0, 19)}…)`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${template.code}: ${error instanceof Error ? error.message : error}`);
    try {
      const current = await readSnapshot(dir);
      await writeAtomic(
        path.join(previewDir, "snapshot.json"),
        `${JSON.stringify(
          {
            ...(current ?? { asset_code: template.code, version: 0 }),
            status: "FAILED",
            error: error instanceof Error ? error.message : String(error),
            captured_at: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      );
    } catch {
      // Best effort.
    }
  }
}

await context.close();
await browser.close();
console.log(JSON.stringify({ total: templates.length, changed, skipped, failed }));
process.exit(failed ? 1 : 0);
