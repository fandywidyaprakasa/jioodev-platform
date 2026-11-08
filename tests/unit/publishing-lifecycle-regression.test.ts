import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type Rec = Record<string, unknown>;

const state = vi.hoisted(() => ({
  actor: null as
    | { id: string; role: "guest" | "user" | "admin"; guestId?: string }
    | null,
  records: {} as Record<string, Record<string, Rec>>,
}));

const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();
const getRecord = vi.fn();
const deleteRecord = vi.fn();
const findProject = vi.fn();
const patchProject = vi.fn();
const logActivity = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  getRecord: (...args: unknown[]) => getRecord(...args),
  deleteRecord: (...args: unknown[]) => deleteRecord(...args),
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
    if (guestId && project.guest_session_id && project.guest_session_id === guestId) {
      return true;
    }
    return false;
  },
  getBusinessProfile: vi.fn(async () => null),
  getProjectCopy: vi.fn(async () => []),
  getProjectAssetFile: vi.fn(async () => null),
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
  requireUser: async (role?: "user" | "admin") => {
    if (!state.actor || state.actor.role === "guest") {
      return { response: json(401, "UNAUTHENTICATED") };
    }
    if (role === "admin" && state.actor.role !== "admin") {
      return { response: json(403, "FORBIDDEN") };
    }
    return { user: state.actor };
  },
  notFound: () => json(404, "NOT_FOUND"),
}));

function json(status: number, code: string) {
  return new Response(JSON.stringify({ error: { code, message: code } }), {
    status,
    headers: { "Content-Type": "application/json" },
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

function seedProject(status = "ACTIVE") {
  state.records.projects ??= {};
  state.records.projects.p1 = {
    id: "p1",
    user_id: "u1",
    client_label: "Kopi Senja",
    status,
    preview_url: "/p/kopi-senja",
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
  };
}

function seedLifecycle() {
  state.records.published_pages = {
    page_1: {
      id: "page_1",
      project_id: "p1",
      user_id: "u1",
      slug: "kopi-senja",
      status: "PUBLISHED",
      output_id: "out_1",
      version: 1,
      template: "LAND-LSPLIT-EDT-001",
      published_at: "2026-11-03T00:00:00.000Z",
      unpublished_at: "",
    },
  };
  state.records.deployments = {
    dep_1: {
      id: "dep_1",
      project_id: "p1",
      target: "container",
      environment: "production",
      status: "LIVE",
      live_url: "https://pages.test/p/kopi-senja",
      health: "OK",
    },
  };
  state.records.production_outputs = {
    out_1: {
      id: "out_1",
      project_id: "p1",
      version: 1,
      status: "READY",
      report: { kind: "publish", pages: [{ html: "<html></html>" }] },
    },
  };
  state.records.project_pages = {
    draft_page: {
      id: "draft_page",
      project_id: "p1",
      title: "Draft",
      slug: "draft",
    },
  };
  state.records.project_sections = {
    section_1: {
      id: "section_1",
      project_id: "p1",
      page_id: "draft_page",
      slot: "S-HERO",
    },
  };
  state.records.payments = {
    pay_1: {
      id: "pay_1",
      project_id: "p1",
      status: "CONFIRMED",
      created: "2026-11-04T00:00:00.000Z",
    },
  };
}

const deploy = await import("@/modules/publishing/application/deploy");
const publishRoute = await import("@/app/api/projects/[id]/publish/route");
const rollbackRoute = await import(
  "@/app/api/admin/deploy/[projectId]/rollback/route"
);

beforeEach(() => {
  state.actor = null;
  state.records = {};
  vi.resetAllMocks();

  seedProject();
  seedLifecycle();

  findProject.mockImplementation(
    async (id: string) => state.records.projects[id] ?? null,
  );
  patchProject.mockImplementation(async (id: string, patch: Rec) => {
    Object.assign(state.records.projects[id], patch);
    return state.records.projects[id];
  });
  listRecords.mockImplementation(
    async (
      collection: string,
      params: { filter?: string; sort?: string; perPage?: number } = {},
    ) => {
      const items = Object.values(state.records[collection] ?? {}).filter(
        (item) => matches(item, params.filter),
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
    const record = { id: `${collection}_new`, ...body };
    state.records[collection] ??= {};
    state.records[collection][record.id] = record;
    return record;
  });
  updateRecord.mockImplementation(
    async (collection: string, id: string, body: Rec) => {
      const record = state.records[collection]?.[id];
      if (!record) throw new Error("not found");
      Object.assign(record, body);
      return record;
    },
  );
  getRecord.mockImplementation(async (collection: string, id: string) => {
    const record = state.records[collection]?.[id];
    if (!record) throw new Error("not found");
    return record;
  });
});

describe("unpublish lifecycle regression", () => {
  it("unpublishes the active pointer, suspends deployment, and preserves draft/snapshot/payment", async () => {
    const result = await deploy.unpublishAndSuspend("p1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.page.status).toBe("UNPUBLISHED");
    expect(result.page.unpublishedAt).toBeTruthy();

    expect(state.records.published_pages.page_1.status).toBe("UNPUBLISHED");
    expect(state.records.projects.p1.status).toBe("PAID");
    expect(state.records.projects.p1.preview_url).toBe("");
    expect(state.records.deployments.dep_1.status).toBe("SUSPENDED");
    expect(state.records.deployments.dep_1.health).toBe("UNKNOWN");

    expect(state.records.production_outputs.out_1.status).toBe("READY");
    expect(state.records.project_pages.draft_page).toBeTruthy();
    expect(state.records.project_sections.section_1).toBeTruthy();
    expect(state.records.payments.pay_1.status).toBe("CONFIRMED");
    expect(Object.keys(state.records.payments)).toHaveLength(1);
  });

  it("unpublishes through the DELETE route while preserving the snapshot", async () => {
    state.actor = { id: "u1", role: "user" };

    const response = await publishRoute.DELETE(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Rec;
    expect((body.page as Rec).status).toBe("UNPUBLISHED");
    expect(state.records.projects.p1.status).toBe("PAID");
    expect(state.records.deployments.dep_1.status).toBe("SUSPENDED");
    expect(state.records.production_outputs.out_1).toBeTruthy();
    expect(state.records.payments.pay_1.status).toBe("CONFIRMED");
  });
});

describe("admin rollback regression", () => {
  it("returns the project to PAID, suspends deployment, and preserves payment", async () => {
    const result = await deploy.rollbackDeployment("p1");

    expect(result?.status).toBe("SUSPENDED");
    expect(result?.health).toBe("UNKNOWN");
    expect(state.records.projects.p1.status).toBe("PAID");
    expect(state.records.deployments.dep_1.status).toBe("SUSPENDED");
    expect(state.records.deployments.dep_1.health).toBe("UNKNOWN");
    expect(state.records.payments.pay_1.status).toBe("CONFIRMED");
    expect(Object.keys(state.records.payments)).toHaveLength(1);
    expect(state.records.production_outputs.out_1).toBeTruthy();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "deploy.rollback", actor: "admin" }),
    );
  });

  it("returns 200 through the admin route and applies the rollback", async () => {
    state.actor = { id: "admin_1", role: "admin" };

    const response = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );

    expect(response.status).toBe(200);
    expect(state.records.projects.p1.status).toBe("PAID");
    expect(state.records.deployments.dep_1.status).toBe("SUSPENDED");
    expect(state.records.payments.pay_1.status).toBe("CONFIRMED");
  });

  it("rejects unauthenticated and non-admin callers without touching lifecycle data", async () => {
    const unauthenticated = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );
    expect(unauthenticated.status).toBe(401);

    state.actor = { id: "u1", role: "user" };
    const forbidden = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );
    expect(forbidden.status).toBe(403);

    expect(listRecords).not.toHaveBeenCalled();
    expect(updateRecord).not.toHaveBeenCalled();
    expect(state.records.projects.p1.status).toBe("ACTIVE");
    expect(state.records.deployments.dep_1.status).toBe("LIVE");
  });

  it("returns 404 when the deployment does not exist", async () => {
    state.actor = { id: "admin_1", role: "admin" };
    state.records.deployments = {};

    const response = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );

    expect(response.status).toBe(404);
    expect(state.records.projects.p1.status).toBe("ACTIVE");
  });

  it("maps a deployment read error to 502 instead of not-found", async () => {
    state.actor = { id: "admin_1", role: "admin" };
    listRecords.mockRejectedValueOnce(new Error("deployment read failed"));

    const response = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as Rec;
    expect((body.error as Rec).code).toBe("BACKEND_ERROR");
    expect(state.records.projects.p1.status).toBe("ACTIVE");
    expect(state.records.deployments.dep_1.status).toBe("LIVE");
  });

  it("propagates use-case write failures and maps them to 502 at the route", async () => {
    state.actor = { id: "admin_1", role: "admin" };
    updateRecord.mockRejectedValueOnce(new Error("deployment write failed"));

    await expect(deploy.rollbackDeployment("p1")).rejects.toThrow(
      "deployment write failed",
    );
    expect(state.records.projects.p1.status).toBe("ACTIVE");
    expect(state.records.deployments.dep_1.status).toBe("LIVE");

    updateRecord.mockRejectedValueOnce(new Error("deployment write failed"));
    const response = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as Rec;
    expect((body.error as Rec).code).toBe("BACKEND_ERROR");
    expect(state.records.projects.p1.status).toBe("ACTIVE");
    expect(state.records.deployments.dep_1.status).toBe("LIVE");
  });

  it("does not report success when the project write fails after the deployment update", async () => {
    state.actor = { id: "admin_1", role: "admin" };
    patchProject.mockRejectedValueOnce(new Error("project write failed"));

    const response = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as Rec;
    expect((body.error as Rec).code).toBe("BACKEND_ERROR");
    expect(state.records.projects.p1.status).toBe("ACTIVE");
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("deployment read failure propagation", () => {
  it("propagates read failures from getDeployment instead of treating them as not-found", async () => {
    listRecords.mockRejectedValueOnce(new Error("deployment read failed"));

    await expect(deploy.getDeployment("p1")).rejects.toThrow(
      "deployment read failed",
    );
  });

  it("propagates read failures through requestDeployment", async () => {
    listRecords.mockRejectedValueOnce(new Error("deployment read failed"));

    await expect(deploy.requestDeployment("p1")).rejects.toThrow(
      "deployment read failed",
    );
  });

  it("propagates read failures through suspendDeployment", async () => {
    listRecords.mockRejectedValueOnce(new Error("deployment read failed"));

    await expect(deploy.suspendDeployment("p1")).rejects.toThrow(
      "deployment read failed",
    );
    expect(state.records.projects.p1.status).toBe("ACTIVE");
  });
});

describe("S6-C retry safety", () => {
  it("rollback retry after full success does not duplicate deployment writes or audit", async () => {
    state.actor = { id: "admin_1", role: "admin" };

    const first = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );
    expect(first.status).toBe(200);

    const updateCalls = updateRecord.mock.calls.length;
    const auditCalls = logActivity.mock.calls.length;

    const second = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );
    expect(second.status).toBe(200);
    expect(updateRecord.mock.calls.length).toBe(updateCalls);
    expect(logActivity.mock.calls.length).toBe(auditCalls);
    expect(state.records.projects.p1.status).toBe("PAID");
    expect(state.records.deployments.dep_1.status).toBe("SUSPENDED");
  });

  it("rollback retries through a project-write failure and then succeeds without duplicate audit", async () => {
    state.actor = { id: "admin_1", role: "admin" };
    patchProject.mockRejectedValueOnce(new Error("project write failed"));

    const failed = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );
    expect(failed.status).toBe(502);
    expect(state.records.projects.p1.status).toBe("ACTIVE");
    expect(logActivity).not.toHaveBeenCalled();

    const retry = await rollbackRoute.POST(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ projectId: "p1" }) },
    );
    expect(retry.status).toBe(200);
    expect(state.records.projects.p1.status).toBe("PAID");
    expect(state.records.deployments.dep_1.status).toBe("SUSPENDED");
    expect(logActivity).toHaveBeenCalledTimes(1);
  });

  it("unpublish retry reconciles a suspended-deployment failure without republishing", async () => {
    state.actor = { id: "u1", role: "user" };

    const originalUpdate = updateRecord.getMockImplementation();
    updateRecord.mockImplementation(async (collection: string, id: string, body: Record<string, unknown>) => {
      if (collection === "deployments") throw new Error("deployment write failed");
      return (originalUpdate as (c: string, i: string, b: Record<string, unknown>) => unknown)(collection, id, body);
    });

    const failed = await publishRoute.DELETE(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(failed.status).toBe(502);
    expect(state.records.published_pages.page_1.status).toBe("UNPUBLISHED");
    expect(state.records.projects.p1.status).toBe("PAID");
    expect(state.records.deployments.dep_1.status).toBe("LIVE");

    updateRecord.mockImplementation(originalUpdate as (c: string, i: string, b: Record<string, unknown>) => unknown);

    const retry = await publishRoute.DELETE(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(retry.status).toBe(200);
    expect(state.records.deployments.dep_1.status).toBe("SUSPENDED");
    expect(state.records.production_outputs.out_1).toBeTruthy();
    expect(state.records.payments.pay_1.status).toBe("CONFIRMED");
  });
});
