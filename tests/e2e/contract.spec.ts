import { expect, test } from "@playwright/test";

test("health endpoint returns the expected contract", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({
    ok: expect.any(Boolean),
    service: "jioodev-platform",
    checks: {
      pocketbase: expect.any(String),
      masterHub: expect.any(String),
      qris: expect.any(String),
      hermes: expect.any(String),
      email: expect.any(String),
    },
  });
});

test("templates endpoint returns a template array", async ({ request }) => {
  const response = await request.get("/api/templates");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
  expect(body[0]).toMatchObject({
    code: expect.any(String),
    name: expect.any(String),
    productType: expect.stringMatching(/^(LAND|WEB|COMM)$/),
  });
});

test("API validation errors use the shared error format", async ({ request }) => {
  const response = await request.get("/api/payments");
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body).toMatchObject({
    error: {
      code: "VALIDATION",
      message: expect.any(String),
    },
  });
});

test("template detail returns 200 or the shared 404 format", async ({ request }) => {
  const found = await request.get("/api/templates/LAND-LMENU-EDT-003");
  expect(found.status()).toBe(200);
  const template = await found.json();
  expect(template).toMatchObject({
    code: "LAND-LMENU-EDT-003",
    productType: "LAND",
    name: expect.any(String),
  });

  const missing = await request.get("/api/templates/TIDAK-ADA");
  expect(missing.status()).toBe(404);
  const body = await missing.json();
  expect(body).toMatchObject({
    error: { code: "NOT_FOUND", message: expect.any(String) },
  });
});

test("contact endpoint validates required fields", async ({ request }) => {
  const invalid = await request.post("/api/contact", {
    data: { name: "", email: "", message: "" },
  });
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toMatchObject({
    error: { code: "VALIDATION" },
  });

  const valid = await request.post("/api/contact", {
    data: {
      name: "Test",
      email: "test@example.com",
      message: "Saya ingin bertanya tentang paket.",
    },
  });
  expect(valid.status()).toBe(200);
  expect(await valid.json()).toMatchObject({ ok: true });
});
