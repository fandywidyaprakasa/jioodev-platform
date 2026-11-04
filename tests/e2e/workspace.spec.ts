import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PATH = "/app/workspace/split-editorial-basic-v1";

test("workspace renders outline and canvas", async ({ page }) => {
  await page.goto(PATH);
  await expect(page.getByRole("heading", { name: "Workspace" })).toBeVisible();
  await expect(page.getByTestId("workspace-outline").locator("li")).toHaveCount(5);

  const frame = page.frameLocator('iframe[title="Workspace canvas"]');
  await expect(frame.locator("[data-slot]")).toHaveCount(5);
  await expect(frame.locator('[data-slot="S-HERO"]')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    results.violations,
    results.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
  ).toEqual([]);
});

test("workspace swaps variant and undo", async ({ page }) => {
  await page.goto(PATH);
  const frame = page.frameLocator('iframe[title="Workspace canvas"]');
  await expect(frame.locator('[data-variant="hero-split"]')).toBeVisible();

  await page
    .getByTestId("workspace-inspector")
    .getByLabel("Variant")
    .selectOption("hero-centered");
  await expect(frame.locator('[data-variant="hero-centered"]')).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(frame.locator('[data-variant="hero-split"]')).toBeVisible();
});

test("workspace edits content and tier", async ({ page }) => {
  await page.goto(PATH);
  const frame = page.frameLocator('iframe[title="Workspace canvas"]');
  await expect(frame.getByText("Bangun kehadiran digital yang benar-benar bekerja.")).toBeVisible();

  const textarea = page.getByTestId("workspace-inspector-content");
  await textarea.fill(JSON.stringify({ headline: "Judul dari workspace", subheadline: "Subjudul baru." }));
  await page.getByRole("button", { name: "Terapkan Konten" }).click();
  await expect(frame.getByText("Judul dari workspace")).toBeVisible();

  await page.locator("label", { hasText: "Tier" }).locator("select").selectOption("PRO");
  await expect(frame.locator('[data-slot="S-HERO"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText("LAND-LSPLIT-EDT-001");
});

test("workspace switches device and autosaves", async ({ page }) => {
  await page.goto(PATH);
  await page.getByRole("button", { name: "Mobile" }).click();
  const iframe = page.locator('iframe[title="Workspace canvas"]');
  await expect(iframe).toHaveCSS("width", "390px");
  await expect(page.getByText("Tersimpan")).toBeVisible({ timeout: 5_000 });
});
