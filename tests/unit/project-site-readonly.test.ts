import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockCopy } from "@/shared/lib/mock-data";

type Rec = Record<string, unknown>;

const { store, listRecords, getRecord, createRecord, updateRecord, deleteRecord } =
  vi.hoisted(() => {
    const store: Record<string, Record<string, Rec>> = {
      projects: {},
      project_pages: {},
      project_sections: {},
      business_profiles: {},
      content_assets: {},
    };
    return {
      store,
      listRecords: vi.fn(),
      getRecord: vi.fn(),
      createRecord: vi.fn(),
      updateRecord: vi.fn(),
      deleteRecord: vi.fn(),
    };
  });

function splitTopLevel(expr: string, op: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let quoted = false;
  for (let index = 0; index < expr.length; index += 1) {
    const char = expr[index];
    if (char === "'") quoted = !quoted;
    else if (!quoted && char === "(") depth += 1;
    else if (!quoted && char === ")") depth -= 1;
    else if (!quoted && depth === 0 && expr.startsWith(op, index)) {
      parts.push(expr.slice(start, index));
      index += op.length - 1;
      start = index + 1;
    }
  }
  if (!parts.length) return [expr];
  parts.push(expr.slice(start));
  return parts;
}

function isWrapped(expr: string) {
  if (!expr.startsWith("(") || !expr.endsWith(")")) return false;
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < expr.length; index += 1) {
    const char = expr[index];
    if (char === "'") quoted = !quoted;
    else if (!quoted && char === "(") depth += 1;
    else if (!quoted && char === ")") {
      depth -= 1;
      if (depth === 0 && index < expr.length - 1) return false;
    }
  }
  return depth === 0;
}

function matchesFilter(item: Rec, filter: string): boolean {
  let expr = filter.trim();
  if (!expr) return true;
  while (isWrapped(expr)) expr = expr.slice(1, -1).trim();
  const orParts = splitTopLevel(expr, "||");
  if (orParts.length > 1) return orParts.some((part) => matchesFilter(item, part));
  const andParts = splitTopLevel(expr, "&&");
  if (andParts.length > 1) return andParts.every((part) => matchesFilter(item, part));
  const match = expr.match(/^(\w+)='([^']*)'$/);
  if (!match) return true;
  return String(item[match[1]] ?? "") === match[2];
}

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  getRecord: (...args: unknown[]) => getRecord(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  deleteRecord: (...args: unknown[]) => deleteRecord(...args),
  createRecordWithFile: vi.fn(),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

const {
  backfillProjectSites,
  ensureProjectSite,
  loadProjectSite,
  renderProjectSite,
  saveProjectSite,
} = await import("@/modules/projects");

let seq = 0;

function reset() {
  for (const collection of Object.keys(store)) store[collection] = {};
  seq = 0;
  vi.clearAllMocks();
  listRecords.mockImplementation(
    async (
      collection: string,
      params: { filter?: string; sort?: string; perPage?: number } = {},
    ) => {
      const items = Object.values(store[collection] ?? {}).filter((item) =>
        matchesFilter(item, params.filter ?? ""),
      );
      if (params.sort === "order") {
        items.sort(
          (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
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
  createRecord.mockImplementation(
    async (collection: string, body: Rec) => {
      const record = {
        id: `${collection}_${++seq}`,
        created: new Date().toISOString(),
        ...body,
      };
      store[collection] ??= {};
      store[collection][record.id] = record;
      return record;
    },
  );
  updateRecord.mockImplementation(
    async (collection: string, id: string, body: Rec) => {
      const record = store[collection]?.[id];
      if (!record) throw new Error("not found");
      Object.assign(record, body);
      return record;
    },
  );
  deleteRecord.mockImplementation(async (collection: string, id: string) => {
    delete store[collection]?.[id];
  });
}

function seedProject(id: string, overrides: Rec = {}) {
  store.projects[id] = {
    id,
    client_label: "Kopi Senja",
    template_id: "",
    status: "DRAFT",
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
    ...overrides,
  };
}

function seedHomePage(projectId: string, id = "page_home") {
  store.project_pages[id] = {
    id,
    project_id: projectId,
    title: "Home",
    slug: "",
    is_home: true,
    order: 0,
    seo: {},
    settings: {},
  };
}

function writeCalls() {
  return (
    createRecord.mock.calls.length +
    updateRecord.mock.calls.length +
    deleteRecord.mock.calls.length
  );
}

function failProjectWrites(projectId: string) {
  updateRecord.mockImplementation(
    async (collection: string, id: string, body: Rec) => {
      if (collection === "projects" && id === projectId) {
        throw new Error(`write failed for ${projectId}`);
      }
      const record = store[collection]?.[id];
      if (!record) throw new Error("not found");
      Object.assign(record, body);
      return record;
    },
  );
}

beforeEach(reset);

describe("project site read path is read-only", () => {
  it("does not write while loading and rendering a legacy project with no stored sections", async () => {
    seedProject("p_legacy");
    seedHomePage("p_legacy");
    const before = JSON.stringify(store);

    const first = await loadProjectSite("p_legacy");
    const second = await loadProjectSite("p_legacy");
    const rendered = await renderProjectSite("p_legacy");

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.content["S-HERO"]).toEqual(first?.content["S-HERO"]);
    expect(rendered?.html).toContain('data-slot="S-HERO"');
    expect(writeCalls()).toBe(0);
    expect(JSON.stringify(store)).toBe(before);
  });

  it("renders a project with no pages through an in-memory Home without creating one", async () => {
    seedProject("p_no_pages");
    const before = JSON.stringify(store);

    const site = await loadProjectSite("p_no_pages");
    const rendered = await renderProjectSite("p_no_pages");

    expect(site?.page.is_home).toBe(true);
    expect(site?.pages).toHaveLength(1);
    expect(rendered?.html).toContain('data-slot="S-HERO"');
    expect(writeCalls()).toBe(0);
    expect(JSON.stringify(store)).toBe(before);
  });

  it("applies legacy copy in memory without persisting the migration", async () => {
    seedProject("p_copy", { active_sections: { theme_id: undefined } });
    seedHomePage("p_copy");
    store.project_sections.sec_hero = {
      id: "sec_hero",
      project_id: "p_copy",
      page_id: "page_home",
      section_code: "S-HERO",
      order: 1,
      enabled: true,
      content: { name: "Hero", headline: "Headline lama" },
    };
    const before = JSON.stringify(store);

    const site = await loadProjectSite("p_copy");

    expect(site).not.toBeNull();
    expect((site?.content["S-HERO"] as Rec).headline).toBe(
      mockCopy.find((field) => field.key === "hero_title")?.value,
    );
    expect(writeCalls()).toBe(0);
    expect(JSON.stringify(store)).toBe(before);
  });

  it("reads unassigned legacy sections for the home page without backfilling", async () => {
    seedProject("p_unassigned", { active_sections: { copy_migrated: true } });
    seedHomePage("p_unassigned");
    store.project_sections.sec_legacy = {
      id: "sec_legacy",
      project_id: "p_unassigned",
      section_code: "S-HERO",
      order: 1,
      enabled: true,
      content: { name: "Hero", headline: "Warisan" },
    };
    const before = JSON.stringify(store);

    const site = await loadProjectSite("p_unassigned");

    expect(site?.composition.blocks.some((block) => block.slot === "S-HERO")).toBe(
      true,
    );
    expect((site?.content["S-HERO"] as Rec).headline).toBe("Warisan");
    expect(writeCalls()).toBe(0);
    expect(JSON.stringify(store)).toBe(before);
  });

  it("keeps an explicit bootstrap write path that seeds sections and active_sections", async () => {
    seedProject("p_bootstrap");
    seedHomePage("p_bootstrap");

    const bootstrapped = await ensureProjectSite("p_bootstrap");

    expect(bootstrapped).not.toBeNull();
    expect(createRecord).toHaveBeenCalledWith(
      "project_sections",
      expect.objectContaining({
        project_id: "p_bootstrap",
        section_code: "S-HERO",
      }),
    );
    expect(updateRecord).toHaveBeenCalledWith(
      "projects",
      "p_bootstrap",
      expect.objectContaining({
        active_sections: expect.objectContaining({ copy_migrated: true }),
      }),
    );
    expect(
      Object.values(store.project_sections).some(
        (section) => section.section_code === "S-HERO",
      ),
    ).toBe(true);
    expect(
      (store.projects.p_bootstrap.active_sections as Rec).copy_migrated,
    ).toBe(true);

    const afterBootstrap = JSON.stringify(store);
    vi.clearAllMocks();
    await loadProjectSite("p_bootstrap");
    await renderProjectSite("p_bootstrap");
    expect(writeCalls()).toBe(0);
    expect(JSON.stringify(store)).toBe(afterBootstrap);
  });

  it("keeps an explicit save path that persists edited sections", async () => {
    seedProject("p_save");
    seedHomePage("p_save");

    const saved = await saveProjectSite(
      "p_save",
      [
        {
          code: "S-HERO",
          name: "Hero",
          enabled: true,
          order: 1,
          content: { headline: "Disimpan manual" },
        },
      ],
      { pageId: "page_home" },
    );

    expect(saved).not.toBeNull();
    expect(createRecord).toHaveBeenCalledWith(
      "project_sections",
      expect.objectContaining({
        project_id: "p_save",
        page_id: "page_home",
        section_code: "S-HERO",
      }),
    );
    const stored = Object.values(store.project_sections).find(
      (section) => section.section_code === "S-HERO",
    );
    expect((stored?.content as Rec).headline).toBe("Disimpan manual");
  });
});

describe("project site bootstrap preserves settings and reports failures", () => {
  it("preserves existing site_settings while repairing missing sections", async () => {
    const siteSettings = {
      site_name: "Nama Lama",
      footer_tagline: "Tagline lama",
    };
    seedProject("p_settings", {
      active_sections: {
        theme_id: "editorial",
        site_settings: siteSettings,
      },
    });
    seedHomePage("p_settings");

    const site = await ensureProjectSite("p_settings");

    expect(site).not.toBeNull();
    const state = store.projects.p_settings.active_sections as Rec;
    expect(state.site_settings).toEqual(siteSettings);
    expect(state.theme_id).toBe("editorial");
    expect(state.copy_migrated).toBe(true);
    expect(state.composition_id).toBeTruthy();
  });

  it("keeps site_settings.site_name above legacy profile and client label", async () => {
    seedProject("p_name", {
      client_label: "Label Klien",
      active_sections: { site_settings: { site_name: "Nama Situs" } },
    });
    seedHomePage("p_name");
    store.business_profiles.bp_name = {
      id: "bp_name",
      project_id: "p_name",
      business_name: "Nama Profil",
    };

    const site = await ensureProjectSite("p_name");
    const footer = site?.content["S-FOOT"] as Rec;
    expect(footer.business_name).toBe("Nama Situs");

    const storedFooter = Object.values(store.project_sections).find(
      (section) => section.section_code === "S-FOOT",
    );
    expect((storedFooter?.content as Rec).business_name).toBe("Nama Situs");
  });

  it("falls back deterministically to profile then client label", async () => {
    seedProject("p_profile", { client_label: "Label Klien" });
    seedHomePage("p_profile");
    store.business_profiles.bp_profile = {
      id: "bp_profile",
      project_id: "p_profile",
      business_name: "Nama Profil",
    };
    seedProject("p_label", { client_label: "Label Klien" });
    seedHomePage("p_label", "page_label");

    const withProfile = await loadProjectSite("p_profile");
    const withLabel = await loadProjectSite("p_label");

    expect((withProfile?.content["S-FOOT"] as Rec).business_name).toBe(
      "Nama Profil",
    );
    expect((withLabel?.content["S-FOOT"] as Rec).business_name).toBe(
      "Label Klien",
    );
  });

  it("reports truthful and idempotent backfill counts", async () => {
    seedProject("p_new");
    seedHomePage("p_new");
    seedProject("p_ready", { active_sections: { copy_migrated: true } });
    seedHomePage("p_ready", "page_ready");
    store.project_sections.sec_ready = {
      id: "sec_ready",
      project_id: "p_ready",
      page_id: "page_ready",
      section_code: "S-HERO",
      order: 1,
      enabled: true,
      content: { name: "Hero", headline: "Sudah siap" },
    };

    const first = await backfillProjectSites();

    expect(first.total).toBe(2);
    expect(first.backfilled).toBe(1);
    expect(first.skipped).toBe(1);
    expect(first.failed).toEqual([]);

    const second = await backfillProjectSites();

    expect(second.total).toBe(2);
    expect(second.backfilled).toBe(0);
    expect(second.skipped).toBe(2);
    expect(second.failed).toEqual([]);
  });

  it("surfaces write failures instead of reporting success", async () => {
    seedProject("p_fail");
    seedHomePage("p_fail");
    failProjectWrites("p_fail");

    await expect(ensureProjectSite("p_fail")).rejects.toThrow(
      "write failed for p_fail",
    );

    const result = await backfillProjectSites();

    expect(result.total).toBe(1);
    expect(result.backfilled).toBe(0);
    expect(result.failed).toEqual(["p_fail"]);
  });
});
