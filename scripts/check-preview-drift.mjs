#!/usr/bin/env node
/**
 * Compare live template previews with committed WebP snapshots.
 *
 * Usage:
 *   pnpm dev --port 3100
 *   pnpm test:previews -- --base-url=http://127.0.0.1:3100
 *
 * Flags:
 *   --base-url=...   Preview server origin (default http://127.0.0.1:3000)
 *   --only=CODE      Limit to one asset_code
 *   --max-diff=...   Max pixel ratio (default 0.005)
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
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
const maxDiff = Number(
  args.find((arg) => arg.startsWith("--max-diff="))?.split("=")[1] ?? "0.005",
);
const DIFF_DIR = path.join(os.tmpdir(), "jioodev-preview-diffs");

const VIEWPORTS = {
  web: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

async function listTemplates() {
  const templates = [];
  for (const dir of await fs.readdir(TEMPLATES)) {
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

async function raw(file) {
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

const templates = await listTemplates();
if (!templates.length) {
  console.log("No READY templates found.");
  process.exit(0);
}
console.log(
  `Preview drift: ${templates.length} templates · base ${baseUrl} · max ${maxDiff}`,
);

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });
const failures = [];
let checked = 0;

for (const template of templates) {
  const page = await context.newPage();
  try {
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
      const baselineFile = path.join(
        TEMPLATES,
        template.dir,
        "previews",
        `${device}.webp`,
      );
      try {
        await fs.access(baselineFile);
      } catch {
        failures.push(`${template.code}/${device}: missing baseline`);
        continue;
      }
      await page.setViewportSize(viewport);
      await page.goto(`${baseUrl}/template-preview/${template.code}`, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}",
      });
      const currentPng = await page.screenshot({ fullPage: false });
      const current = await sharp(currentPng)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const baseline = await raw(baselineFile);
      if (
        current.info.width !== baseline.info.width ||
        current.info.height !== baseline.info.height
      ) {
        failures.push(
          `${template.code}/${device}: size ${current.info.width}x${current.info.height} != ${baseline.info.width}x${baseline.info.height}`,
        );
        continue;
      }
      const diff = Buffer.alloc(current.info.width * current.info.height * 4);
      const changed = pixelmatch(
        baseline.data,
        current.data,
        diff,
        current.info.width,
        current.info.height,
        { threshold: 0.1 },
      );
      const ratio = changed / (current.info.width * current.info.height);
      checked += 1;
      if (ratio > maxDiff) {
        await fs.mkdir(DIFF_DIR, { recursive: true });
        await sharp(diff, {
          raw: {
            width: current.info.width,
            height: current.info.height,
            channels: 4,
          },
        })
          .png()
          .toFile(path.join(DIFF_DIR, `${template.code}-${device}.png`));
        failures.push(
          `${template.code}/${device}: ${(ratio * 100).toFixed(3)}% pixels differ`,
        );
      } else {
        console.log(`✓ ${template.code}/${device}`);
      }
    }
  } catch (error) {
    failures.push(
      `${template.code}: ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    await page.close();
  }
}

await context.close();
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} preview failure(s):`);
  console.error(failures.join("\n"));
  console.error(`\nDiff artifacts: ${DIFF_DIR}`);
  process.exit(1);
}
console.log(`\n✓ ${checked} preview snapshots match committed baselines`);
