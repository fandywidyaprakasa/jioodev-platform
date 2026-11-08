import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PATH = "/app/workspace/split-editorial-basic-v1";

test("clicking a section shows the floating toolbar", async ({ page }) => {
  await page.goto(PATH);
  const frame = page.frameLocator('iframe[title="Workspace canvas"]');
  await frame.locator('[data-slot="S-HERO"]').click();
  await expect(page.getByTestId("workspace-section-toolbar")).toBeVisible();
});

test("escape clears selection", async ({ page }) => {
  await page.goto(PATH);
  const frame = page.frameLocator('iframe[title="Workspace canvas"]');
  await frame.locator('[data-slot="S-HERO"]').click();
  await expect(page.getByTestId("workspace-section-toolbar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("workspace-section-toolbar")).toHaveCount(0);
  await expect(page.getByTestId("workspace-inspector")).toContainText("Pilih section");
});

test("toolbar exposes accessible actions", async ({ page }) => {
  await page.goto(PATH);
  const frame = page.frameLocator('iframe[title="Workspace canvas"]');
  await frame.locator('[data-slot="S-BEN"]').click();
  const toolbar = page.getByTestId("workspace-section-toolbar");
  await expect(toolbar.getByRole("button", { name: "Naikkan" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Turunkan" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Sembunyikan" })).toBeVisible();
});

test("no axe violations", async ({ page }) => {
  await page.goto(PATH);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    results.violations,
    results.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
  ).toEqual([]);
});