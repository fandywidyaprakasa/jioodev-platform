import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/generation", () => ({
  completeJob: vi.fn(),
}));

import { completeJob } from "@/modules/generation";
import { POST } from "@/app/api/internal/hermes/callback/route";

function request(body: unknown, secret?: string) {
  return new NextRequest("http://localhost/api/internal/hermes/callback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-hermes-secret": secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("HERMES_CALLBACK_SECRET", "hermes-secret");
  vi.mocked(completeJob).mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hermes callback", () => {
  it("rejects missing configuration and invalid secrets", async () => {
    vi.stubEnv("HERMES_CALLBACK_SECRET", "");
    const unconfigured = await POST(request({ job_id: "job_1", status: "READY" }));
    expect(unconfigured.status).toBe(503);

    vi.stubEnv("HERMES_CALLBACK_SECRET", "hermes-secret");
    const unauthorized = await POST(request({ job_id: "job_1", status: "READY" }, "wrong"));
    expect(unauthorized.status).toBe(401);
  });

  it("validates payload and job status", async () => {
    const missing = await POST(request({}, "hermes-secret"));
    expect(missing.status).toBe(400);

    const invalid = await POST(
      request({ job_id: "job_1", status: "UNKNOWN" }, "hermes-secret"),
    );
    expect(invalid.status).toBe(400);
  });

  it("completes a valid job callback", async () => {
    vi.mocked(completeJob).mockResolvedValue({
      id: "job_1",
      status: "READY",
      progress: 100,
      variants: [],
    });
    const response = await POST(
      request(
        {
          job_id: "job_1",
          status: "READY",
          html_path: "/tmp/job_1",
          variants: [],
        },
        "hermes-secret",
      ),
    );
    expect(response.status).toBe(200);
    expect(completeJob).toHaveBeenCalledWith({
      jobId: "job_1",
      status: "READY",
      variants: [],
      htmlPath: "/tmp/job_1",
      quality: undefined,
    });
  });
});
