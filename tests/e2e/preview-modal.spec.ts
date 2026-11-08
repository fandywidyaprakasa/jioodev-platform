import { expect, test } from "@playwright/test";

test("catalog card opens one live preview modal", async ({ page }) => {
  await page.goto("/templates");

  const card = page.locator('[data-device] > button').first();
  const imageSrc = decodeURIComponent(
    (await card.locator("img").first().getAttribute("src")) ?? "",
  );
  expect(imageSrc).toMatch(/template-previews\/.+\/(web|tablet|mobile)\.webp/);

  await card.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveCount(1);

  const firstSrc = await dialog.locator("iframe").getAttribute("src");
  await dialog.getByRole("button", { name: "Varian berikutnya" }).click();
  await expect(dialog.locator("iframe")).not.toHaveAttribute("src", firstSrc ?? "");

  await dialog.getByRole("button", { name: /Tampilan Web/ }).click();
  await expect(
    dialog.getByRole("button", { name: /Tampilan Tablet/ }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("catalog grid is 3 columns on desktop and 1 on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/templates");
  const grid = page.locator("[data-device]").first();
  const count = () =>
    grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
  await expect.poll(count).toBe(3);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(count).toBe(1);
});
