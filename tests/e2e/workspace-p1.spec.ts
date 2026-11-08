import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PATH = "/app/workspace/split-editorial-basic-v1";

test("section list shows human names", async ({ page }) => {
  await page.goto(PATH);
  await expect(page.getByTestId("workspace-outline")).toContainText("Hero");
  await expect(page.getByTestId("workspace-outline")).toContainText("Footer");
});

test("canvas is square", async ({ page }) => {
  await page.goto(PATH);
  await expect(page.locator('iframe[title="Workspace canvas"]')).toHaveCSS("border-radius", "0px");
});

test("overlay is present", async ({ page }) => {
  await page.goto(PATH);
  const frame = page.frameLocator('iframe[title="Workspace canvas"]');
  await frame.locator("[data-slot]").first().waitFor({ state: "attached" });
  const overlays = page.getByTestId("workspace-section-overlay");
  const count = await overlays.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

test("no axe violations on workspace", async ({ page }) => {
  await page.goto(PATH);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    results.violations,
    results.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
  ).toEqual([]);
});