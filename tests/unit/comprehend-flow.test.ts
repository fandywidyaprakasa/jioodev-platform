import { beforeEach, describe, expect, it, vi } from "vitest";

const { store } = vi.hoisted(() => {
  const store: Record<string, Record<string, Record<string, unknown>>> = {
    projects: {},
    business_profiles: {},
  };
  return { store };
});

function matches(item: Record<string, unknown>, filter: string) {
  return filter
    .split("&&")
    .map((part) => part.trim())
    .filter(Boolean)
    .every((part) => {
      const match = part.match(/^(\w+)='([^']*)'$/);
      if (!match) return true;
      return String(item[match[1]] ?? "") === match[2];
    });
}

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => {
  let seq = 0;
  return {
    getRecord: vi.fn(async (collection: string, id: string) => {
      const record = store[collection]?.[id];
      if (!record) throw new Error("not found");
      return record;
    }),
    listRecords: vi.fn(
      async (
        collection: string,
        params: { filter?: string; sort?: string; perPage?: number } = {},
      ) => {
        const items = Object.values(store[collection] ?? {}).filter((item) =>
          matches(item, params.filter ?? ""),
        );
        return {
          page: 1,
          perPage: params.perPage ?? 100,
          totalItems: items.length,
          totalPages: 1,
          items,
        };
      },
    ),
    createRecord: vi.fn(
      async (collection: string, body: Record<string, unknown>) => {
        const record = {
          id: `${collection}_${++seq}`,
          created: new Date().toISOString(),
          ...body,
        };
        store[collection] ??= {};
        store[collection][record.id] = record;
        return record;
      },
    ),
    updateRecord: vi.fn(
      async (collection: string, id: string, body: Record<string, unknown>) => {
        const record = store[collection]?.[id];
        if (!record) throw new Error("not found");
        Object.assign(record, body);
        return record;
      },
    ),
    deleteRecord: vi.fn(async () => undefined),
    createRecordWithFile: vi.fn(),
    escapeFilter: (value: string) => value,
  };
});

import {
  comprehendProject,
  confirmProjectComprehension,
  summarizeBusiness,
} from "@/modules/projects";

function reset() {
  for (const collection of Object.keys(store)) store[collection] = {};
}

function seedProject(id: string, status: string) {
  store.projects[id] = {
    id,
    status,
    created: "2026-11-08T00:00:00.000Z",
    updated: "2026-11-08T00:00:00.000Z",
  };
}

function seedProfile(projectId: string) {
  store.business_profiles[`profile_${projectId}`] = {
    id: `profile_${projectId}`,
    project_id: projectId,
    business_name: "Kopi Senja",
    industry: "FNB",
    business_purpose: ["SAL"],
    target_audience: "Pekerja kantor",
    channels: ["WhatsApp"],
    design_pref: "Hangat",
    business_goals: "Menambah pesanan online",
  };
}

beforeEach(reset);

describe("customer-first comprehension flow", () => {
  it("returns no fake business data when the profile is missing", () => {
    const result = summarizeBusiness(null);

    expect(result.summary).not.toContain("Kopi Pagi Hari");
    expect(result.summary.toLowerCase()).toContain("belum diisi");
    expect(result.confidence).toBe(0);
  });

  it("does not leak mock data for a profile without a business name", () => {
    const result = summarizeBusiness({
      id: "profile_empty",
      project_id: "p_empty",
    });

    expect(result.summary).not.toContain("Kopi Pagi Hari");
    expect(result.confidence).toBe(0);
  });

  it("rejects confirmation from protected publish statuses", async () => {
    for (const status of ["PAID", "DEPLOYED", "ACTIVE"] as const) {
      seedProject(`p_${status.toLowerCase()}`, status);
      seedProfile(`p_${status.toLowerCase()}`);

      const result = await confirmProjectComprehension(
        `p_${status.toLowerCase()}`,
        "koreksi",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
      expect(store.projects[`p_${status.toLowerCase()}`].status).toBe(status);
    }
  });

  it("rejects the POST comprehend path from a protected status", async () => {
    seedProject("p_paid", "PAID");
    seedProfile("p_paid");

    const result = await comprehendProject("p_paid");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
    expect(store.projects.p_paid.status).toBe("PAID");
  });

  it("confirms comprehension from DRAFT and INTAKE", async () => {
    for (const status of ["DRAFT", "INTAKE"] as const) {
      const id = `p_${status.toLowerCase()}`;
      seedProject(id, status);
      seedProfile(id);

      const result = await confirmProjectComprehension(id);

      expect(result.ok).toBe(true);
      expect(store.projects[id].status).toBe("COMPREHENDED");
    }
  });

  it("persists corrections and summary in active_sections.comprehended_context", async () => {
    seedProject("p_draft", "DRAFT");
    store.projects.p_draft.active_sections = {
      technology: { framework: "html" },
    };
    seedProfile("p_draft");

    const result = await confirmProjectComprehension(
      "p_draft",
      "Target utama sebenarnya ibu rumah tangga.",
    );

    expect(result.ok).toBe(true);
    const state = store.projects.p_draft.active_sections as Record<
      string,
      unknown
    >;
    expect(state.technology).toEqual({ framework: "html" });

    const comprehension = state.comprehended_context as Record<string, unknown>;
    expect(comprehension.summary).toContain("Kopi Senja");
    expect(comprehension.confidence).toBeGreaterThan(0);
    expect(comprehension.corrections).toBe(
      "Target utama sebenarnya ibu rumah tangga.",
    );
    expect(typeof comprehension.confirmed_at).toBe("string");
    expect(Number.isNaN(Date.parse(String(comprehension.confirmed_at)))).toBe(
      false,
    );
  });

  it("returns NOT_FOUND when the project does not exist", async () => {
    const result = await confirmProjectComprehension("p_missing");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});
