import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";

function req(path: string, init?: { method?: string; headers?: Record<string, string> }) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers),
  });
}

beforeEach(() => {
  vi.stubEnv("JIOODEV_AUTH_MODE", "real");
  vi.stubEnv("JIOODEV_ALLOW_INSECURE_MOCK", "0");
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
  vi.stubEnv("ADMIN_IP_ALLOWLIST", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware guards", () => {
  it("redirects unauthenticated app routes to login", async () => {
    const response = await middleware(req("/app/projects/p1/payment"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=");
  });

  it("redirects unauthenticated admin routes to admin login", async () => {
    const response = await middleware(req("/admin/payments"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/admin/login");
  });

  it("allows guest project entry points", async () => {
    const response = await middleware(req("/app/projects/new"));
    expect(response.status).toBe(200);
    expect(response.cookies.get("jioodev_guest")?.value).toBeTruthy();
  });

  it("bypasses auth only in explicit mock mode", async () => {
    vi.stubEnv("JIOODEV_AUTH_MODE", "mock");
    const response = await middleware(req("/app"));
    expect(response.status).toBe(200);
  });
});

describe("middleware security", () => {
  it("allows same-origin preflight and sets CORS headers", async () => {
    const response = await middleware(
      req("/api/health", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000", Host: "localhost:3000" },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects cross-origin mutations", async () => {
    const response = await middleware(
      req("/api/contact", {
        method: "POST",
        headers: { Origin: "https://evil.example" },
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("rate limits API requests per forwarded IP", async () => {
    const headers = { "x-forwarded-for": "203.0.113.99" };
    let response;
    for (let i = 0; i < 121; i += 1) {
      response = await middleware(req("/api/templates", { headers }));
    }
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBeTruthy();
  });
});
