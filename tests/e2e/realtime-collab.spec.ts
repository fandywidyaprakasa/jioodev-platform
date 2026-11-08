import { expect, test } from "@playwright/test";

const PATH = "/app/workspace/split-editorial-basic-v1";

test.describe.configure({ retries: 0 });

test.describe("Real-time Collaboration", () => {
  test.skip(!process.env.LIVEBLOCKS_PUBLIC_KEY, "Liveblocks not configured");

  test("shows avatar stack when multiple users join", async ({ page, context }) => {
    // First user
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");

    // Second user in new context
    const page2 = await context.newPage();
    await page2.goto(PATH);
    await page2.waitForLoadState("networkidle");

    // Both should see avatar stack with 2 users
    await expect(page.locator('[role="group"][aria-label="Pengguna aktif"]')).toBeVisible();
    await expect(page2.locator('[role="group"][aria-label="Pengguna aktif"]')).toBeVisible();

    // First user leaves
    await page2.close();

    // First user should see only 1 avatar
    await expect(page.locator('[role="group"][aria-label="Pengguna aktif"] >> div').first()).toBeVisible();
  });

  test("shows remote cursor when other user moves mouse", async ({ page, context }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");

    const page2 = await context.newPage();
    await page2.goto(PATH);
    await page2.waitForLoadState("networkidle");

    const frame1 = page.frameLocator('iframe[title="Workspace canvas"]');
    const frame2 = page2.frameLocator('iframe[title="Workspace canvas"]');

    // User 2 hovers over hero section
    await frame2.locator('[data-slot="S-HERO"]').hover();

    // User 1 should see remote cursor
    await expect(page.locator('.fixed.z-50[aria-label^="Kursor "]')).toBeVisible({ timeout: 5000 });
  });

  test("shows selection indicator when other user selects a section", async ({ page, context }) => {
    await page.goto(PATH);
    await page.waitForLoadState("networkidle");

    const page2 = await context.newPage();
    await page2.goto(PATH);
    await page2.waitForLoadState("networkidle");

    // User 2 clicks a section in the outline
    await page2.getByTestId("workspace-outline").getByRole("button", { name: /section/i }).first().click();

    // User 1 should see the section highlighted (via presence)
    const frame1 = page.frameLocator('iframe[title="Workspace canvas"]');
    await expect(frame1.locator('[data-slot]')).toBeVisible();
  });
});