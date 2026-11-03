import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const IDS = ["split-editorial-basic-v1","advisory-basic","bloom-pro","studio-pro","story-pro","boardroom-pro","launch-pro","petal-pro"];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

for (const id of IDS) {
for (const viewport of VIEWPORTS) {
  test(`composition ${id} ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto(`/composition-preview/${id}`);
    expect(response?.status()).toBe(200);
    expect(await page.locator("[data-slot]").count()).toBeGreaterThanOrEqual(5);
    expect(await page.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth)).toBe(true);

    await page.screenshot({
      path: testInfo.outputPath(`${id}-${viewport.name}.png`),
      fullPage: true,
    });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
    ).toEqual([]);
  });
}
}
