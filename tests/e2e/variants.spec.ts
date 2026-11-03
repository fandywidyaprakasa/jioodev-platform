import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const SECTION_ROOT = path.join(process.cwd(), "..", "library", "sections");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

function pairs() {
  const out: Array<{ slot: string; variant: string }> = [];
  for (const slot of fs.readdirSync(SECTION_ROOT, { withFileTypes: true })) {
    if (!slot.isDirectory() || slot.name.startsWith("_")) continue;
    for (const variant of fs.readdirSync(path.join(SECTION_ROOT, slot.name))) {
      if (variant.startsWith("_")) continue;
      if (fs.existsSync(path.join(SECTION_ROOT, slot.name, variant, "variant.json"))) {
        out.push({ slot: slot.name, variant });
      }
    }
  }
  return out;
}

const LIST = pairs();

test("variant catalog is complete", async () => {
  expect(pairs()).toHaveLength(45);
});

for (const pair of LIST) {
  test(`${pair.slot}/${pair.variant}`, async ({ page }, testInfo) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`/variant-preview/${pair.slot}/${pair.variant}`);
      expect(response?.status()).toBe(200);
      expect(
        await page.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${pair.slot}-${pair.variant}-${viewport.name}.png`),
        fullPage: true,
      });
    }

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
    ).toEqual([]);
  });
}
