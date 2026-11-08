import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type Rec = Record<string, unknown>;

const records: Record<string, Record<string, Rec>> = {
  projects: {},
  deployments: {},
  published_pages: {},
  production_outputs: {},
  payments: {},
  subscriptions: {},
  packages: {},
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
const getLatestJob = vi.fn();
const getOutput = vi.fn();
const isOutputRevoked = vi.fn();
const renderTemplateHtml = vi.fn();

const { publishProjectMock } = vi.hoisted(() => ({
  publishProjectMock: vi.fn(),
}));

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
  getProjectAssetFile: vi.fn(async () => null),
}));

vi.mock("@/modules/generation", () => ({
  getLatestJob: (...args: unknown[]) => getLatestJob(...args),
  getOutput: (...args: unknown[]) => getOutput(...args),
  isOutputRevoked: (...args: unknown[]) => isOutputRevoked(...args),
}));

vi.mock("@/modules/preview", () => ({
  renderTemplateHtml: (...args: unknown[]) => renderTemplateHtml(...args),
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

vi.mock("@/modules/payments", () => ({
  activateProjectViaEntitlement: vi.fn(async () => null),
}));

vi.mock(
  "@/modules/publishing/application/published",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/modules/publishing/application/published")
      >();
    publishProjectMock.mockImplementation((...args: unknown[]) =>
      (
        actual.publishProject as (
          ...inner: unknown[]
        ) => Promise<unknown>
      )(...args),
    );
    return { ...actual, publishProject: publishProjectMock };
  },
);

const { checkDeploymentHealth, requestDeployment } = await import(
  "@/modules/publishing/application/deploy"
);
const deployRoute = await import("@/app/api/projects/[id]/deploy/route");
const healthRoute = await import(
  "@/app/api/projects/[id]/deploy/health/route"
);

function authenticatedUser() {
  requireUser.mockResolvedValue({
    user: { id: "u1", role: "user" },
  });
}

function matches(item: Rec, filter?: string) {
  if (!filter) return true;
  return filter.split("&&").every((part) => {
    const negated = part.trim().match(/^(\w+)\s*!=\s*'(.*)'$/);
    if (negated) return String(item[negated[1]] ?? "") !== negated[2];
    const match = part.trim().match(/^(\w+)='(.*)'$/);
    if (!match) return true;
    return String(item[match[1]] ?? "") === match[2];
  });
}

function seedProject(status = "ACTIVE") {
  records.projects.p1 = {
    id: "p1",
    user_id: "u1",
    client_label: "Kopi Senja",
    status,
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
  };
}

function seedDeployment(status: string, liveUrl = "https://pages.test/p/kopi-senja") {
  records.deployments.dep_1 = {
    id: "dep_1",
    project_id: "p1",
    target: "container",
    environment: "production",
    status,
    live_url: liveUrl,
    health: "UNKNOWN",
  };
}

function seedPage(status = "PUBLISHED") {
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
  authenticate();
  vi.stubGlobal("fetch", fetchMock);
  delete process.env.PUBLIC_PAGE_BASE_URL;
  delete process.env.NEXTAUTH_URL;
  delete process.env.DEPLOY_HEALTH_TIMEOUT_MS;

  seedProject();

  findProject.mockImplementation(
    async (id: string) => records.projects[id] ?? null,
  );
  patchProject.mockImplementation(async (id: string, patch: Rec) => {
    Object.assign(records.projects[id], patch);
    return records.projects[id];
  });
  listRecords.mockImplementation(
    async (
      collection: string,
      params: { filter?: string; sort?: string; perPage?: number } = {},
    ) => {
      const items = Object.values(records[collection] ?? {}).filter((item) =>
        matches(item, params.filter),
      );
      if (params.sort === "-version") {
        items.sort((a, b) => Number(b.version ?? 0) - Number(a.version ?? 0));
      }
      if (params.sort === "-created") {
        items.sort((a, b) =>
          String(b.created ?? "").localeCompare(String(a.created ?? "")),
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

  getLatestJob.mockResolvedValue({
    id: "job_1",
    project_id: "p1",
    status: "READY",
    variants: [{ id: "v1" }],
  });
  getOutput.mockResolvedValue({
    id: "job_1",
    project_id: "p1",
    status: "READY",
    report: { template: "LAND-LSPLIT-EDT-001" },
  });
  isOutputRevoked.mockReturnValue(false);
  renderTemplateHtml.mockResolvedValue(
    "<!doctype html><html><head><title>Kopi Senja</title></head><body>Kopi Senja</body></html>",
  );
});

function authenticate() {
  authenticatedUser();
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PUBLIC_PAGE_BASE_URL;
  delete process.env.NEXTAUTH_URL;
  delete process.env.DEPLOY_HEALTH_TIMEOUT_MS;
});

describe("Go Live republish truth", () => {
  it("calls publishProject on republish instead of returning an existing LIVE deployment", async () => {
    seedDeployment("LIVE");
    seedPage("PUBLISHED");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    publishProjectMock.mockResolvedValueOnce({
      ok: true,
      page: {
        slug: "kopi-senja",
        url: "https://pages.test/p/kopi-senja",
        status: "PUBLISHED",
        version: 2,
        title: "Kopi Senja",
        noindex: false,
      },
    });

    const deployment = await requestDeployment("p1");

    expect(publishProjectMock).toHaveBeenCalledWith("p1");
    expect(deployment?.status).toBe("LIVE");
    expect(deployment?.health).toBe("OK");
  });

  it("keeps an unchanged content revision idempotent (one snapshot, no version bump)", async () => {
    seedDeployment("LIVE");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await requestDeployment("p1");
    await requestDeployment("p1");

    expect(Object.keys(records.production_outputs)).toHaveLength(1);
    expect(publishProjectMock).toHaveBeenCalledTimes(2);
    const pages = Object.values(records.published_pages);
    expect(pages).toHaveLength(1);
    expect(Number(pages[0]?.version)).toBe(1);
  });
});

describe("deployment health truth", () => {
  it("keeps status non-LIVE and surfaces a reason when the public route fails", async () => {
    seedDeployment("PROVISIONING");
    seedPage("PUBLISHED");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));

    const deployment = await checkDeploymentHealth("p1");

    expect(deployment?.status).toBe("DEGRADED");
    expect(deployment?.health).toBe("FAIL");
    expect(deployment?.healthReason).toContain("503");
  });

  it("keeps status non-LIVE when a referenced asset fails", async () => {
    seedDeployment("PROVISIONING");
    seedPage("PUBLISHED");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          '<html><body><img src="/p/kopi-senja/media/asset_1"></body></html>',
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("", { status: 404 }));

    const deployment = await checkDeploymentHealth("p1");

    expect(deployment?.status).toBe("DEGRADED");
    expect(deployment?.health).toBe("FAIL");
    expect(deployment?.healthReason).toContain("media/asset_1");
  });

  it("promotes to LIVE only after route and asset respond OK", async () => {
    seedDeployment("PROVISIONING");
    seedPage("PUBLISHED");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const deployment = await checkDeploymentHealth("p1");

    expect(deployment?.status).toBe("LIVE");
    expect(deployment?.health).toBe("OK");
    expect(deployment?.healthReason).toBeUndefined();
  });

  it("triggers real verification through the user-owned health route", async () => {
    seedDeployment("PROVISIONING");
    seedPage("PUBLISHED");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const response = await healthRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Rec;
    expect(body.status).toBe("LIVE");
    expect(body.health).toBe("OK");
  });
});

describe("deploy route failure clarity", () => {
  it.each([
    ["PAYMENT_REQUIRED", 402],
    ["NO_OUTPUT", 409],
    ["HEALTH_FAILED", 409],
    ["NOT_FOUND", 404],
  ] as const)("maps %s to %i with a structured error body", async (code, status) => {
    publishProjectMock.mockResolvedValueOnce({
      ok: false,
      code,
      message: `failure: ${code}`,
    });

    const response = await deployRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(status);
    const body = (await response.json()) as Rec;
    expect(body.error).toEqual({ code, message: `failure: ${code}` });
  });

  it("returns DEGRADED instead of a false LIVE success when the post-deploy probe fails", async () => {
    seedDeployment("LIVE");
    seedPage("PUBLISHED");
    process.env.PUBLIC_PAGE_BASE_URL = "https://pages.test";
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));
    publishProjectMock.mockResolvedValueOnce({
      ok: true,
      page: {
        slug: "kopi-senja",
        url: "https://pages.test/p/kopi-senja",
        status: "PUBLISHED",
        version: 2,
        title: "Kopi Senja",
        noindex: false,
      },
    });

    const response = await deployRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(202);
    const body = (await response.json()) as Rec;
    expect(body.status).toBe("DEGRADED");
    expect(body.health).toBe("FAIL");
    expect(String(body.healthReason)).toContain("500");
  });
});
