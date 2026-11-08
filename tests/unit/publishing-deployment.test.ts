import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type Rec = Record<string, unknown>;

const records: Record<string, Record<string, Rec>> = {
  projects: {},
  deployments: {},
  published_pages: {},
  production_outputs: {},
  payments: {},
};
let seq = 0;

const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();
const getRecord = vi.fn();
const findProject = vi.fn();
const patchProject = vi.fn();
const logActivity = vi.fn();
const fetchMock = vi.fn();
const requireUser = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  getRecord: (...args: unknown[]) => getRecord(...args),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

vi.mock("@/modules/projects", () => ({
  findProject: (...args: unknown[]) => findProject(...args),
  patchProject: (...args: unknown[]) => patchProject(...args),
  canAccess: (
    project: Rec,
    userId: string | undefined,
    isAdmin: boolean,
    guestId?: string,
  ) => {
    if (isAdmin) return true;
    if (userId && project.user_id && project.user_id === userId) return true;
    if (guestId && project.guest_session_id === guestId) return true;
    return false;
  },
  getBusinessProfile: vi.fn(async () => null),
  getProjectCopy: vi.fn(async () => []),
  listProjectPages: vi.fn(async () => []),
  loadProjectSite: vi.fn(async () => null),
  renderSiteSnapshot: vi.fn(),
  toSiteSnapshot: vi.fn(),
}));

vi.mock("@/modules/generation", () => ({
  getLatestJob: vi.fn(async () => null),
  getOutput: vi.fn(async () => null),
  isOutputRevoked: vi.fn(() => false),
}));

vi.mock("@/modules/preview", () => ({
  renderTemplateHtml: vi.fn(),
}));

vi.mock("@/modules/activity", () => ({
  logActivity: (...args: unknown[]) => logActivity(...args),
}));

vi.mock("@/modules/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
  notFound: () =>
    new Response(JSON.stringify({ error: { code: "NOT_FOUND" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }),
}));

const { checkDeploymentHealth, markPublished, requestDeployment, suspendDeployment } = await import(
  "@/modules/publishing/application/deploy"
);
const deployRoute = await import("@/app/api/projects/[id]/deploy/route");

function authenticatedUser() {
  requireUser.mockResolvedValue({
    user: { id: "u1", role: "user" },
  });
}

function matches(item: Rec, filter?: string) {
  if (!filter) return true;
  return filter.split("&&").every((part) => {
    const match = part.trim().match(/^(\w+)='(.*)'$/);
    if (!match) return true;
    return String(item[match[1]] ?? "") === match[2];
  });
}

function seedDeployment(id: string, status: string) {
  records.deployments[id] = {
    id,
    project_id: "p1",
    target: "container",
    environment: "production",
    status,
    live_url: "https://pages.test/p/kopi-senja",
    health: "UNKNOWN",
  };
}

function seedPage(status: string) {
  records.published_pages.page_1 = {
    id: "page_1",
    project_id: "p1",
    slug: "kopi-senja",
    status,
    output_id: "output_1",
    version: 1,
    template: "LAND-LSPLIT-EDT-001",
    created: "2026-11-03T00:00:00.000Z",
  };
}

beforeEach(() => {
  for (const collection of Object.keys(records)) records[collection] = {};
  seq = 0;
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  delete process.env.PUBLIC_PAGE_BASE_URL;
  delete process.env.NEXTAUTH_URL;
  authenticatedUser();

  records.projects.p1 = {
    id: "p1",
    user_id: "u1",
    client_label: "Kopi Senja",
    status: "PAID",
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
  };
  findProject.mockImplementation(
    async (id: string) => records.projects[id] ?? null,
  );
  patchProject.mockImplementation(
    async (id: string, patch: Rec) => {
      Object.assign(records.projects[id], patch);
      return records.projects[id];
    },
  );
  listRecords.mockImplementation(
    async (
      collection: string,
      params: { filter?: string; sort?: string; perPage?: number } = {},
    ) => {
      const items = Object.values(records[collection] ?? {}).filter((item) =>
        matches(item, params.filter),
      );
      if (params.sort === "-version") {
        items.sort(
          (a, b) => Number(b.version ?? 0) - Number(a.version ?? 0),
        );
      }
      return {
        page: 1,
        perPage: params.perPage ?? 100,
        totalItems: items.length,
        totalPages: 1,
        items: params.perPage ? items.slice(0, params.perPage) : items,
      };
    },
  );
  createRecord.mockImplementation(async (collection: string, body: Rec) => {
    const record = { id: `${collection}_${++seq}`, ...body };
    records[collection] ??= {};
    records[collection][record.id] = record;
    return record;
  });
  updateRecord.mockImplementation(
    async (collection: string, id: string, body: Rec) => {
      const record = records[collection]?.[id];
      if (!record) throw new Error("not found");
      Object.assign(record, body);
      return record;
    },
  );
  getRecord.mockImplementation(async (collection: string, id: string) => {
    const record = records[collection]?.[id];
    if (!record) throw new Error("not found");
    return record;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PUBLIC_PAGE_BASE_URL;
  delete process.env.NEXTAUTH_URL;
});

describe("publishing deployment truthfulness", () => {
  it("creates a provisioning deployment instead of claiming LIVE", async () => {
    const deployment = await markPublished(
      "p1",
      "https://pages.test/p/kopi-senja",
      "kopi-senja",
    );

    expect(deployment?.status).toBe("PROVISIONING");
    expect(deployment?.health).toBe("UNKNOWN");
    expect(records.projects.p1.status).toBe("PAID");
    expect(patchProject).toHaveBeenCalledWith(
      "p1",
      expect.not.objectContaining({ status: "ACTIVE" }),
    );
  });

  it("does not return a stale LIVE deployment when no published page exists", async () => {
    seedDeployment("dep_1", "LIVE");

    const deployment = await requestDeployment("p1");

    expect(deployment).toBeNull();
    expect(records.deployments.dep_1.status).toBe("LIVE");
  });

  it("marks health DEGRADED on probe failure without changing project status", async () => {
    seedDeployment("dep_1", "PROVISIONING");
    seedPage("PUBLISHED");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock.mockRejectedValue(new Error("network down"));

    const deployment = await checkDeploymentHealth("p1");

    expect(deployment?.status).toBe("DEGRADED");
    expect(deployment?.health).toBe("FAIL");
    expect(records.projects.p1.status).toBe("PAID");
    expect(patchProject).not.toHaveBeenCalled();
  });

  it("marks health LIVE only when the public route responds ok", async () => {
    seedDeployment("dep_1", "PROVISIONING");
    seedPage("PUBLISHED");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const deployment = await checkDeploymentHealth("p1");

    expect(deployment?.status).toBe("LIVE");
    expect(deployment?.health).toBe("OK");
    expect(records.projects.p1.status).toBe("PAID");
  });

  it("does not promote to LIVE when no public base URL is configured", async () => {
    seedDeployment("dep_1", "PROVISIONING");
    seedPage("PUBLISHED");

    const deployment = await checkDeploymentHealth("p1");

    expect(deployment?.status).toBe("PROVISIONING");
    expect(deployment?.health).toBe("UNKNOWN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not keep reporting an unverified LIVE deployment without a probe", async () => {
    seedDeployment("dep_1", "LIVE");
    seedPage("PUBLISHED");

    const deployment = await checkDeploymentHealth("p1");

    expect(deployment?.status).toBe("DEGRADED");
    expect(deployment?.health).toBe("UNKNOWN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("degrades health when the published page is missing", async () => {
    seedDeployment("dep_1", "LIVE");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";

    const deployment = await checkDeploymentHealth("p1");

    expect(deployment?.status).toBe("DEGRADED");
    expect(deployment?.health).toBe("FAIL");
  });
});

describe("project deploy route error handling", () => {
  it("returns the deployment and project status on GET success", async () => {
    seedDeployment("dep_1", "LIVE");

    const response = await deployRoute.GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Rec;
    expect((body.deployment as Rec).status).toBe("LIVE");
    expect(body.projectStatus).toBe("PAID");
  });

  it("keeps a true GET not-found as a null deployment with 200", async () => {
    const response = await deployRoute.GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Rec;
    expect(body.deployment).toBeNull();
    expect(body.projectStatus).toBe("PAID");
  });

  it("maps a GET deployment read failure to 502 BACKEND_ERROR", async () => {
    listRecords.mockRejectedValueOnce(new Error("deployment read failed"));

    const response = await deployRoute.GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as Rec;
    expect((body.error as Rec).code).toBe("BACKEND_ERROR");
  });

  it("preserves GET authorization and project not-found behavior", async () => {
    requireUser.mockResolvedValueOnce({
      response: new Response(null, { status: 401 }),
    });
    const unauthenticated = await deployRoute.GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(unauthenticated.status).toBe(401);

    delete records.projects.p1;
    const missing = await deployRoute.GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(missing.status).toBe(404);
  });

  it("returns 202 on POST success", async () => {
    seedDeployment("dep_1", "LIVE");
    seedPage("PUBLISHED");

    const response = await deployRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(202);
    const body = (await response.json()) as Rec;
    expect(body.status).toBe("LIVE");
  });

  it("keeps a legitimate invalid transition at 409", async () => {
    records.projects.p1.status = "PICKED";

    const response = await deployRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as Rec;
    expect((body.error as Rec).code).toBe("INVALID_TRANSITION");
  });

  it("maps a POST requestDeployment infrastructure failure to 502 BACKEND_ERROR", async () => {
    listRecords.mockRejectedValueOnce(new Error("deployment read failed"));

    const response = await deployRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as Rec;
    expect((body.error as Rec).code).toBe("BACKEND_ERROR");
  });

  it("preserves POST authorization and project not-found behavior", async () => {
    requireUser.mockResolvedValueOnce({
      response: new Response(null, { status: 401 }),
    });
    const unauthenticated = await deployRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(unauthenticated.status).toBe(401);
    expect(listRecords).not.toHaveBeenCalled();

    delete records.projects.p1;
    const missing = await deployRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(missing.status).toBe(404);
  });
});

describe("markPublished retry safety", () => {
  it("does not repeat deployment writes or audit on retry", async () => {
    const first = await markPublished(
      "p1",
      "https://pages.test/p/kopi-senja",
      "kopi-senja",
    );
    expect(first?.status).toBe("PROVISIONING");

    const createCalls = createRecord.mock.calls.length;
    const updateCalls = updateRecord.mock.calls.length;
    const auditCalls = logActivity.mock.calls.length;

    const second = await markPublished(
      "p1",
      "https://pages.test/p/kopi-senja",
      "kopi-senja",
    );
    expect(second?.status).toBe("PROVISIONING");
    expect(createRecord.mock.calls.length).toBe(createCalls);
    expect(updateRecord.mock.calls.length).toBe(updateCalls);
    expect(logActivity.mock.calls.length).toBe(auditCalls);
  });

  it("reconciles a project-write failure on retry without duplicate audit", async () => {
    patchProject.mockRejectedValueOnce(new Error("project write failed"));

    await expect(
      markPublished("p1", "https://pages.test/p/kopi-senja", "kopi-senja"),
    ).rejects.toThrow("project write failed");
    expect(records.projects.p1.deployment_id).toBeUndefined();
    expect(logActivity).not.toHaveBeenCalled();

    const retry = await markPublished(
      "p1",
      "https://pages.test/p/kopi-senja",
      "kopi-senja",
    );
    expect(retry?.status).toBe("PROVISIONING");
    expect(records.projects.p1.deployment_id).toBeTruthy();
    expect(logActivity).toHaveBeenCalledTimes(1);
  });
});

describe("suspendDeployment retry safety", () => {
  it("returns the existing record without writes when already suspended", async () => {
    seedDeployment("dep_1", "SUSPENDED");
    records.deployments.dep_1.health = "UNKNOWN";
    records.projects.p1.status = "PAID";

    const updateCalls = updateRecord.mock.calls.length;
    const result = await suspendDeployment("p1");

    expect(result?.status).toBe("SUSPENDED");
    expect(updateRecord.mock.calls.length).toBe(updateCalls);
  });

  it("reconciles a project-write failure on retry", async () => {
    seedDeployment("dep_1", "LIVE");
    patchProject.mockRejectedValueOnce(new Error("project write failed"));

    await expect(suspendDeployment("p1")).rejects.toThrow("project write failed");
    expect(records.deployments.dep_1.status).toBe("SUSPENDED");

    const retry = await suspendDeployment("p1");
    expect(retry?.status).toBe("SUSPENDED");
    expect(records.projects.p1.status).toBe("PAID");
  });
});
