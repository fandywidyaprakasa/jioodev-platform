import { expect, test } from "@playwright/test";

test("preview token is required and invalid tokens are 404", async ({ request }) => {
  const missing = await request.get("/preview/tidak-valid");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain("Preview tidak ditemukan");
});

test("template preview is noindex and blocks framing", async ({ request }) => {
  const response = await request.get("/template-preview/LAND-LMENU-EDT-003");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
  expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
});

test("template preview rejects unknown and traversal codes", async ({ request }) => {
  const missing = await request.get("/template-preview/TIDAK-ADA");
  expect(missing.status()).toBe(404);

  const traversal = await request.get(
    "/template-preview/%2e%2e%2f%2e%2e%2fpackage.json",
  );
  expect([400, 404]).toContain(traversal.status());
});

test("imported PB template preview works through the app origin", async ({ request }) => {
  const response = await request.get("/template-preview/PB-fnb-l1");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<base href="/template-preview/PB-fnb-l1/">');
  expect(html).not.toContain("know.jioo.site");
});
