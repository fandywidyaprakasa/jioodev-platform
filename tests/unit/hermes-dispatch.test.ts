import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchHermesJob, hermesConfigured } from "@/shared/lib/jobs-server";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const payload = {
  job_id: "job_1",
  project_id: "proj_1",
  business_context: null,
  template: { asset_code: "LAND-LMENU-EDT-003", path: "/tmp/template" },
  axis: { locked: "style", value: "EDT", count: 3 },
  sections: ["S-HERO"],
  copy_candidates: [{ copy_id: "hero_title", content: "Halo" }],
};

describe("hermes dispatch", () => {
  it("is disabled without a job URL", async () => {
    vi.stubEnv("HERMES_JOB_URL", "");
    vi.stubEnv("HERMES_API_URL", "");
    expect(hermesConfigured()).toBe(false);
    await expect(dispatchHermesJob(payload)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the job contract with auth and secret headers", async () => {
    vi.stubEnv("HERMES_JOB_URL", "https://hermes.test/jobs");
    vi.stubEnv("HERMES_API_TOKEN", "token-1");
    vi.stubEnv("HERMES_CALLBACK_SECRET", "secret-1");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));

    await expect(dispatchHermesJob(payload)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hermes.test/jobs");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer token-1");
    expect(init.headers["x-hermes-secret"]).toBe("secret-1");
    expect(JSON.parse(init.body)).toMatchObject({
      job_id: "job_1",
      project_id: "proj_1",
      template: { asset_code: "LAND-LMENU-EDT-003" },
    });
  });

  it("returns false when the runtime rejects the job", async () => {
    vi.stubEnv("HERMES_JOB_URL", "https://hermes.test/jobs");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(dispatchHermesJob(payload)).resolves.toBe(false);
  });
});
