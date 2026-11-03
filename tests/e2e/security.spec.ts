import { expect, test } from "@playwright/test";

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

test("pages send baseline security headers", async ({ request, baseURL }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    expect(response.headers()[header], header).toBe(value);
  }
  expect(response.headers()["x-powered-by"]).toBeUndefined();
  expect(baseURL).toBeTruthy();
});

test("same-origin preflight is allowed", async ({ request, baseURL }) => {
  const response = await request.fetch("/api/health", {
    method: "OPTIONS",
    headers: { Origin: baseURL! },
  });
  expect(response.status()).toBe(204);
  expect(response.headers()["access-control-allow-origin"]).toBe(baseURL);
});

test("cross-origin mutation is rejected", async ({ request }) => {
  const response = await request.fetch("/api/contact", {
    method: "POST",
    headers: {
      Origin: "https://evil.example",
      "Content-Type": "application/json",
    },
    data: { name: "Test", email: "test@example.com", message: "Hello there" },
  });
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error.code).toBe("FORBIDDEN");
});
