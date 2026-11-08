import { beforeEach, describe, expect, it, vi } from "vitest";

type Rec = Record<string, unknown>;

const store: Record<string, Rec> = {};
const listRecords = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  getRecord: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

const { getLatestJob } = await import("@/modules/generation");

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.clearAllMocks();
  listRecords.mockImplementation(
    async (
      _collection: string,
      params: {
        filter?: string;
        sort?: string;
        perPage?: number;
        page?: number;
      } = {},
    ) => {
      let items = Object.values(store);
      if (params.sort === "-created") {
        items.sort((a, b) =>
          String(b.created ?? "").localeCompare(String(a.created ?? "")),
        );
      }
      const perPage = params.perPage ?? 10;
      const page = params.page ?? 1;
      const totalItems = items.length;
      items = items.slice((page - 1) * perPage, page * perPage);
      return {
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
        items,
      };
    },
  );
});

describe("getLatestJob with publish snapshots", () => {
  it("does not let more than ten newer publish snapshots hide the generation job", async () => {
    store.generation = {
      id: "generation",
      project_id: "p1",
      version: 1,
      status: "READY",
      created: "2026-11-01T00:00:00.000Z",
      report: {
        template: "LAND-LSPLIT-EDT-001",
        variants: [{ id: "variant_1", label: "Editorial", previewUrl: "/x" }],
      },
    };
    for (let index = 0; index < 60; index += 1) {
      store[`publish_${index}`] = {
        id: `publish_${index}`,
        project_id: "p1",
        status: "READY",
        created: `2026-11-02T${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00.000Z`,
        report: { kind: "publish", template: "LAND-LSPLIT-EDT-001" },
      };
    }

    const job = await getLatestJob("p1");

    expect(job?.id).toBe("generation");
    expect(listRecords).toHaveBeenCalledWith(
      "production_outputs",
      expect.objectContaining({
        filter: "project_id='p1'",
        perPage: 50,
      }),
    );
    expect(listRecords.mock.calls.length).toBeGreaterThan(1);
  });
});
