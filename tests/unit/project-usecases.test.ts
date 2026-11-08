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
  applyProjectUpdate,
  comprehendProject,
  selectProjectVariant,
} from "@/modules/projects";
import { generationReadiness } from "@/modules/generation";

function reset() {
  for (const collection of Object.keys(store)) store[collection] = {};
}

beforeEach(reset);

describe("project use cases", () => {
  it("rejects an invalid status transition", async () => {
    store.projects.p_uc = {
      id: "p_uc",
      status: "PREVIEWS",
      created: "2026-11-03T00:00:00.000Z",
      updated: "2026-11-03T00:00:00.000Z",
    };

    const result = await applyProjectUpdate("p_uc", { status: "PAID" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
  });

  it("maps businessName to client_label and keeps a valid transition", async () => {
    store.projects.p_uc = {
      id: "p_uc",
      status: "PREVIEWS",
      created: "2026-11-03T00:00:00.000Z",
      updated: "2026-11-03T00:00:00.000Z",
    };

    const result = await applyProjectUpdate("p_uc", {
      businessName: "Kopi Senja",
      status: "PICKED",
    });

    expect(result.ok).toBe(true);
    expect(store.projects.p_uc.client_label).toBe("Kopi Senja");
    expect(store.projects.p_uc.status).toBe("PICKED");
  });

  it("rejects self-service transitions into protected publish states", async () => {
    for (const status of ["PAID", "DEPLOYED", "ACTIVE"] as const) {
      store.projects.p_guard = {
        id: "p_guard",
        status: "PICKED",
        created: "2026-11-03T00:00:00.000Z",
        updated: "2026-11-03T00:00:00.000Z",
      };

      const result = await applyProjectUpdate("p_guard", { status });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
      expect(store.projects.p_guard.status).toBe("PICKED");
    }
  });

  it("selects a variant only when the project can move to PICKED", async () => {
    store.projects.p_uc = {
      id: "p_uc",
      status: "PREVIEWS",
      created: "2026-11-03T00:00:00.000Z",
      updated: "2026-11-03T00:00:00.000Z",
    };

    const ok = await selectProjectVariant("p_uc", "style-edt");
    expect(ok.ok).toBe(true);
    expect(store.projects.p_uc.status).toBe("PICKED");
    expect(store.projects.p_uc.chosen_variant).toEqual({ id: "style-edt" });

    store.projects.p_draft = {
      id: "p_draft",
      status: "DRAFT",
      created: "2026-11-03T00:00:00.000Z",
      updated: "2026-11-03T00:00:00.000Z",
    };
    const rejected = await selectProjectVariant("p_draft", "style-edt");
    expect(rejected.ok).toBe(false);
  });

  it("advances a template-first brief straight to TEMPLATE_CHOSEN", async () => {
    store.projects.p_fast = {
      id: "p_fast",
      status: "COMPREHENDED",
      template_id: "LAND-LMENU-EDT-003",
      created: "2026-11-03T00:00:00.000Z",
      updated: "2026-11-03T00:00:00.000Z",
    };

    const result = await applyProjectUpdate("p_fast", {
      status: "TEMPLATE_CHOSEN",
    });

    expect(result.ok).toBe(true);
    expect(store.projects.p_fast.status).toBe("TEMPLATE_CHOSEN");
    expect(store.projects.p_fast.template_id).toBe("LAND-LMENU-EDT-003");
  });

  it("comprehends an INTAKE project and returns a grounded summary", async () => {
    store.projects.p_uc = {
      id: "p_uc",
      status: "INTAKE",
      created: "2026-11-03T00:00:00.000Z",
      updated: "2026-11-03T00:00:00.000Z",
    };
    store.business_profiles.profile_uc = {
      id: "profile_uc",
      project_id: "p_uc",
      business_name: "Kopi Senja",
      industry: "fnb",
      target_audience: "pekerja kantor",
      business_purpose: ["sales"],
      channels: ["instagram"],
      design_pref: "hangat",
      business_goals: "menambah order",
    };

    const result = await comprehendProject("p_uc");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.summary).toContain("Kopi Senja");
    expect(store.projects.p_uc.status).toBe("COMPREHENDED");
  });
});

describe("generation use-case guards", () => {
  it("requires a chosen template before generation", () => {
    const result = generationReadiness({
      status: "TEMPLATE_CHOSEN",
      template_id: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION");
  });

  it("requires a generation-eligible status", () => {
    const result = generationReadiness({
      status: "DRAFT",
      template_id: "LAND-LSPLIT-EDT-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
  });

  it("does not treat comprehension alone as generation-ready", () => {
    const result = generationReadiness({
      status: "COMPREHENDED",
      template_id: "LAND-LSPLIT-EDT-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
  });

  it("accepts a chosen template in a generation-eligible status", () => {
    expect(
      generationReadiness({
        status: "TEMPLATE_CHOSEN",
        template_id: "LAND-LSPLIT-EDT-001",
      }).ok,
    ).toBe(true);
  });
});
