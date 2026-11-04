import { expect, test } from "@playwright/test";

test("marketing home renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "JiooDev" }).first()).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
});

test("template catalog renders", async ({ page }) => {
  await page.goto("/templates");
  await expect(
    page.getByRole("heading", { name: /Pilih theme/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Cari theme")).toBeVisible();
  await expect(page.getByRole("link", { name: /Editorial Warm/ })).toBeVisible();
});

test("guest can open the new project form", async ({ page }) => {
  await page.goto("/app/projects/new");
  await expect(page.getByRole("heading", { name: "Buat Project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Buat Project" })).toBeVisible();
});

test("contact page renders a working form", async ({ page }) => {
  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { name: /Ceritakan kebutuhan bisnis/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirim pesan" })).toBeVisible();
});

test("login page exposes Google sign-in", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: /Lanjutkan dengan Google/ }),
  ).toBeVisible();
});

test("workspace dashboard renders in mock mode", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("admin login redirects to the public login page", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
});
