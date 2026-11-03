import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const PAGES = [
  "/",
  "/templates",
  "/contact",
  "/app",
  "/app/projects/new",
  "/admin",
  "/admin/payments",
];

for (const width of [360, 768, 1280]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 20_000 });
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${path} overflows at ${width}px (${overflow.scrollWidth} > ${overflow.innerWidth})`,
      ).toBeLessThanOrEqual(overflow.innerWidth + 1);
    }
  });
}
