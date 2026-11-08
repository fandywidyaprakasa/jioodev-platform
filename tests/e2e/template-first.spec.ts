import { expect, test } from "@playwright/test";

test("logo points to the home of its current context", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "JiooDev" }).first(),
  ).toHaveAttribute("href", "/");

  await page.goto("/app");
  await expect(
    page.getByRole("link", { name: "JiooDev" }).first(),
  ).toHaveAttribute("href", "/app");
});

test("dashboard exposes the template library", async ({ page }) => {
  await page.goto("/app");

  const menu = page.getByRole("button", { name: "Buka navigasi" });
  if (await menu.isVisible()) {
    await menu.click();
  }

  const navLink = page
    .getByRole("link", { name: "Template Library" })
    .first();
  await expect(navLink).toBeVisible();
  await expect(navLink).toHaveAttribute("href", "/app/templates");

  await navLink.click();
  await expect(page).toHaveURL(/\/app\/templates$/);
  await expect(
    page.getByRole("heading", { name: "Template Library" }),
  ).toBeVisible();
});

test("app template library links variants to template-first creation", async ({
  page,
}) => {
  await page.goto("/app/templates");

  const useLinks = page.getByRole("link", { name: "Gunakan template" });
  await expect(useLinks.first()).toBeVisible();
  await expect(useLinks.first()).toHaveAttribute(
    "href",
    /\/app\/projects\/new\?template=/,
  );
});

test("template detail starts a project with the template preselected", async ({
  page,
}) => {
  await page.goto("/templates/LAND-LMENU-EDT-003");

  const use = page.getByRole("link", { name: "Gunakan template" });
  await expect(use).toHaveAttribute(
    "href",
    /\/app\/projects\/new\?template=LAND-LMENU-EDT-003/,
  );
  await use.click();

  await expect(page).toHaveURL(
    /\/app\/projects\/new\?template=LAND-LMENU-EDT-003/,
  );
  await expect(page.getByText("Template terpilih")).toBeVisible();
  await expect(page.getByText("LAND-LMENU-EDT-003")).toBeVisible();
});
