import { beforeEach, describe, expect, it, vi } from "vitest";

type Rec = Record<string, unknown>;

const { store, listRecords, createRecord, updateRecord, getRecord } = vi.hoisted(
  () => {
    const store: Record<string, Record<string, Rec>> = {
      projects: {},
      project_pages: {},
      project_sections: {},
      payments: {},
      published_pages: {},
      production_outputs: {},
      deployments: {},
    };
    return {
      store,
      listRecords: vi.fn(),
      createRecord: vi.fn(),
      updateRecord: vi.fn(),
      getRecord: vi.fn(),
    };
  },
);

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  getRecord: (...args: unknown[]) => getRecord(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  deleteRecord: vi.fn(),
  createRecordWithFile: vi.fn(),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

const getLatestJob = vi.fn();
const getOutput = vi.fn();
const isOutputRevoked = vi.fn();

vi.mock("@/modules/generation", () => ({
  getLatestJob: (...args: unknown[]) => getLatestJob(...args),
  getOutput: (...args: unknown[]) => getOutput(...args),
  isOutputRevoked: (...args: unknown[]) => isOutputRevoked(...args),
}));

const renderTemplateHtml = vi.fn();

vi.mock("@/modules/preview", () => ({
  renderTemplateHtml: (...args: unknown[]) => renderTemplateHtml(...args),
}));

const logActivity = vi.fn();

vi.mock("@/modules/activity", () => ({
  logActivity: (...args: unknown[]) => logActivity(...args),
}));

const { getProjectSections, loadProjectSite } = await import("@/modules/projects");
const { publishProject } = await import("@/modules/publishing");

function matchesFilter(item: Rec, filter?: string) {
  if (!filter) return true;
  return filter.split("&&").every((part) => {
    const negated = part.trim().match(/^(\w+)\s*!=\s*'(.*)'$/);
    if (negated) {
      return String(item[negated[1]] ?? "") !== negated[2];
    }
    const match = part.trim().match(/^(\w+)='(.*)'$/);
    if (!match) return true;
    return String(item[match[1]] ?? "") === match[2];
  });
}

function publishSnapshots() {
  return Object.values(store.production_outputs).filter(
    (output) => (output.report as Rec | undefined)?.kind === "publish",
  );
}

function failProjectSectionsRead() {
  const original = listRecords.getMockImplementation();
  listRecords.mockImplementation(
    async (collection: string, params?: { filter?: string; sort?: string }) => {
      if (collection === "project_sections") {
        throw new Error("project_sections read failed");
      }
      return original?.(collection, params ?? {});
    },
  );
}

function readCollections() {
  return listRecords.mock.calls.map((call) => call[0] as string);
}

beforeEach(() => {
  for (const collection of Object.keys(store)) store[collection] = {};
  vi.clearAllMocks();

  listRecords.mockImplementation(
    async (
      collection: string,
      params: { filter?: string; sort?: string; perPage?: number } = {},
    ) => {
      const items = Object.values(store[collection] ?? {}).filter((item) =>
        matchesFilter(item, params.filter),
      );
      if (params.sort === "order") {
        items.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
      }
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
        items,
      };
    },
  );
  getRecord.mockImplementation(async (collection: string, id: string) => {
    const record = store[collection]?.[id];
    if (!record) throw new Error("not found");
    return record;
  });
  createRecord.mockImplementation(async (collection: string, body: Rec) => {
    const record = {
      id: `${collection}_${Object.keys(store[collection] ?? {}).length + 1}`,
      created: new Date().toISOString(),
      ...body,
    };
    store[collection] ??= {};
    store[collection][record.id] = record;
    return record;
  });
  updateRecord.mockImplementation(
    async (collection: string, id: string, body: Rec) => {
      const record = store[collection]?.[id];
      if (!record) throw new Error("not found");
      Object.assign(record, body);
      return record;
    },
  );

  store.projects.p1 = {
    id: "p1",
    client_label: "Kopi Senja",
    template_id: "",
    status: "PAID",
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
  };
  store.project_pages.page_home = {
    id: "page_home",
    project_id: "p1",
    title: "Home",
    slug: "",
    is_home: true,
    order: 0,
    seo: {},
    settings: {},
  };

  getLatestJob.mockResolvedValue({
    id: "job_1",
    status: "READY",
    progress: 100,
    variants: [
      { id: "variant_1", label: "Editorial", previewUrl: "/preview/x" },
    ],
  });
  getOutput.mockResolvedValue({
    id: "job_1",
    status: "READY",
    created: "2026-11-03T00:00:00.000Z",
    report: {
      template: "LAND-LSPLIT-EDT-001",
      variants: [
        { id: "variant_1", label: "Editorial", previewUrl: "/preview/x" },
      ],
    },
  });
  isOutputRevoked.mockReturnValue(false);
  renderTemplateHtml.mockResolvedValue(
    "<!doctype html><html><head><title>Kopi Senja</title></head><body><h1>Kopi Senja</h1></body></html>",
  );
  logActivity.mockResolvedValue(undefined);
});

describe("project_sections read failure", () => {
  it("publishes normally when every read succeeds", async () => {
    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    expect(publishSnapshots()).toHaveLength(1);
    expect(Object.keys(store.published_pages)).toHaveLength(1);
    expect(store.projects.p1.status).toBe("ACTIVE");
    expect(readCollections()).toContain("project_sections");
  });

  it("propagates the section read failure out of getProjectSections and loadProjectSite", async () => {
    failProjectSectionsRead();

    await expect(getProjectSections("p1", [])).rejects.toThrow(
      "project_sections read failed",
    );
    await expect(loadProjectSite("p1", "page_home")).rejects.toThrow(
      "project_sections read failed",
    );
  });

  it("rejects publish readiness without creating a candidate/output or activating", async () => {
    failProjectSectionsRead();

    await expect(publishProject("p1")).rejects.toThrow(
      "project_sections read failed",
    );

    const collections = readCollections();
    expect(collections).toContain("project_pages");
    expect(collections).toContain("payments");
    expect(collections).toContain("project_sections");
    expect(getRecord).toHaveBeenCalledWith("projects", "p1");

    expect(publishSnapshots()).toHaveLength(0);
    expect(Object.keys(store.production_outputs)).toHaveLength(0);
    expect(Object.keys(store.published_pages)).toHaveLength(0);
    expect(createRecord).not.toHaveBeenCalled();
    expect(updateRecord).not.toHaveBeenCalled();
    expect(store.projects.p1.status).toBe("PAID");
  });
});
