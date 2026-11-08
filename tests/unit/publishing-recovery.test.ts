import { beforeEach, describe, expect, it, vi } from "vitest";

type Rec = Record<string, unknown>;

const records: Record<string, Record<string, Rec>> = {
  projects: {},
  deployments: {},
  published_pages: {},
  production_outputs: {},
};

const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();
const getRecord = vi.fn();
const findProject = vi.fn();
const patchProject = vi.fn();
const logActivity = vi.fn();

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
  canAccess: () => true,
  getBusinessProfile: vi.fn(async () => null),
  getProjectCopy: vi.fn(async () => []),
  listProjectPages: vi.fn(async () => []),
  loadProjectSite: vi.fn(async () => null),
  renderSiteSnapshot: vi.fn(),
  toSiteSnapshot: vi.fn(),
  getProjectAssetFile: vi.fn(async () => null),
}));

vi.mock("@/modules/generation", () => ({
  getLatestJob: vi.fn(async () => null),
  getOutput: vi.fn(async (id: string) => records.production_outputs[id] ?? null),
  isOutputRevoked: vi.fn(() => false),
}));

vi.mock("@/modules/preview", () => ({
  renderTemplateHtml: vi.fn(),
}));

vi.mock("@/modules/activity", () => ({
  logActivity: (...args: unknown[]) => logActivity(...args),
}));

vi.mock("@/modules/auth", () => ({
  requireUser: async () => ({ user: { id: "u1", role: "user" } }),
  notFound: () => new Response(null, { status: 404 }),
}));

function matches(item: Rec, filter?: string) {
  if (!filter) return true;
  return filter.split("&&").every((part) => {
    const match = part.trim().match(/^(\w+)='(.*)'$/);
    if (!match) return true;
    return String(item[match[1]] ?? "") === match[2];
  });
}

beforeEach(() => {
  for (const collection of Object.keys(records)) records[collection] = {};
  vi.clearAllMocks();

  findProject.mockImplementation(async (id: string) => records.projects[id] ?? null);
  patchProject.mockImplementation(async (id: string, patch: Rec) => {
    Object.assign(records.projects[id], patch);
    return records.projects[id];
  });
  listRecords.mockImplementation(async (collection: string, params: { filter?: string; perPage?: number } = {}) => {
    const items = Object.values(records[collection] ?? {}).filter((item) => matches(item, params.filter));
    return {
      page: 1,
      perPage: params.perPage ?? 100,
      totalItems: items.length,
      totalPages: 1,
      items: params.perPage ? items.slice(0, params.perPage) : items,
    };
  });
  updateRecord.mockImplementation(async (collection: string, id: string, body: Rec) => {
    const record = records[collection]?.[id];
    if (!record) throw new Error("not found");
    Object.assign(record, body);
    return record;
  });
  getRecord.mockImplementation(async (collection: string, id: string) => {
    const record = records[collection]?.[id];
    if (!record) throw new Error("not found");
    return record;
  });

  records.projects.p1 = {
    id: "p1",
    user_id: "u1",
    client_label: "Kopi Senja",
    status: "DEPLOYED",
    template_id: "LAND-LSPLIT-EDT-001",
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
  };
});

const { reconcilePublishingProject, listOrphanedPublishOutputs, reconcileDeploymentAudits } = await import(
  "@/modules/publishing"
);
const { renderPublishedPage } = await import("@/modules/publishing");

describe("publishing recovery", () => {
  it("marks orphaned candidate outputs as FAILED and recovers stale DEPLOYED projects", async () => {
    records.production_outputs.out_orphan = {
      id: "out_orphan",
      project_id: "p1",
      version: 1,
      status: "CANDIDATE",
      report: { kind: "publish" },
      created: "2026-11-03T00:00:00.000Z",
    };

    const result = await reconcilePublishingProject("p1");

    expect(result.failedCandidates).toBe(1);
    expect(result.staleDeployedRecovered).toBe(true);
    expect(records.production_outputs.out_orphan.status).toBe("FAILED");
    expect(records.projects.p1.status).toBe("PAID");
    const orphaned = await listOrphanedPublishOutputs("p1");
    expect(orphaned).toHaveLength(1);
  });

  it("attempts audit recovery for provisioning deployments", async () => {
    records.deployments.dep_1 = {
      id: "dep_1",
      project_id: "p1",
      status: "PROVISIONING",
      live_url: "https://pages.test/p/kopi-senja",
      health: "UNKNOWN",
    };

    const recovered = await reconcileDeploymentAudits("p1");

    expect(recovered).toBe(1);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "deploy.publish", entityId: "dep_1" }),
    );
  });

  it("does not serve a published page when project is not ACTIVE", async () => {
    records.published_pages.page_1 = {
      id: "page_1",
      project_id: "p1",
      slug: "kopi-senja",
      status: "PUBLISHED",
      output_id: "out_1",
      version: 1,
      template: "LAND-LSPLIT-EDT-001",
      published_at: "2026-11-03T00:00:00.000Z",
    };
    records.production_outputs.out_1 = {
      id: "out_1",
      project_id: "p1",
      status: "READY",
      report: {
        kind: "publish",
        site: null,
        legacy: {
          template: "LAND-LSPLIT-EDT-001",
          businessName: "Kopi Senja",
          html: "<!doctype html><html><head></head><body>Kopi Senja</body></html>",
        },
      },
    };
    records.projects.p1.status = "PAID";

    const html = await renderPublishedPage("kopi-senja");
    expect(html).toBeNull();
  });
});
