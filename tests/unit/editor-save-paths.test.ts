import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

vi.mock("@/modules/auth", () => ({
  requireActor: async () => ({
    user: { id: "u1", role: "admin" },
  }),
  notFound: (message = "Data tidak ditemukan.") =>
    new Response(JSON.stringify({ error: { code: "NOT_FOUND", message } }), {
      status: 404,
    }),
  badRequest: (message: string, details?: Record<string, unknown>) =>
    new Response(
      JSON.stringify({ error: { code: "VALIDATION", message, details } }),
      { status: 400 },
    ),
}));

const sectionsRoute = await import("@/app/api/projects/[id]/sections/route");
const { loadProjectSite, renderProjectSite, saveProjectCopy } = await import(
  "@/modules/projects"
);

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
        items.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
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
      id: `${collection}_${++seq}`,
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
  deleteRecord.mockImplementation(async (collection: string, id: string) => {
    delete store[collection]?.[id];
  });
}

function seedProject(id: string, overrides: Rec = {}) {
  store.projects[id] = {
    id,
    user_id: "u1",
    client_label: "Kopi Senja",
    product_type: "LAND",
    template_id: "",
    status: "PICKED",
    active_sections: { copy_migrated: true },
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
    ...overrides,
  };
}

function seedPage(
  id: string,
  projectId: string,
  overrides: Rec = {},
) {
  store.project_pages[id] = {
    id,
    project_id: projectId,
    title: overrides.title ?? "Halaman",
    slug: overrides.slug ?? "",
    is_home: overrides.is_home ?? false,
    order: overrides.order ?? 1,
    seo: {},
    settings: {},
    ...overrides,
  };
}

function seedSection(
  id: string,
  projectId: string,
  pageId: string | undefined,
  code: string,
  content: Rec,
  order = 1,
) {
  store.project_sections[id] = {
    id,
    project_id: projectId,
    ...(pageId ? { page_id: pageId } : {}),
    section_code: code,
    order,
    enabled: true,
    content: { name: code, ...content },
  };
}

function patchRequest(body: unknown, query: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/projects/p1/sections");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return {
    json: async () => body,
    nextUrl: { searchParams: url.searchParams },
  } as unknown as NextRequest;
}

beforeEach(reset);

describe("page-aware section save paths", () => {
  it("saving one page does not modify another page's rows", async () => {
    seedProject("p1");
    seedPage("page_home", "p1", { is_home: true, title: "Home", order: 0 });
    seedPage("page_about", "p1", { slug: "about", title: "About", order: 1 });
    seedSection("row_home", "p1", "page_home", "S-HERO", {
      headline: "Headline Home",
    });
    seedSection("row_about", "p1", "page_about", "S-HERO", {
      headline: "Headline About",
    });

    const aboutBefore = JSON.stringify(store.project_sections.row_about);
    const response = await sectionsRoute.PATCH(
      patchRequest(
        [
          {
            code: "S-HERO",
            name: "Hero",
            enabled: true,
            order: 1,
            content: { headline: "Headline Home Baru" },
          },
        ],
        { pageId: "page_home" },
      ),
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(200);
    expect(JSON.stringify(store.project_sections.row_about)).toBe(aboutBefore);
    expect(
      (store.project_sections.row_about.content as Rec).headline,
    ).toBe("Headline About");
    expect(
      (store.project_sections.row_home.content as Rec).headline,
    ).toBe("Headline Home Baru");
  });

  it("returns an error status when sections fail validation", async () => {
    seedProject("p1");
    seedPage("page_home", "p1", { is_home: true, title: "Home", order: 0 });
    seedSection("row_home", "p1", "page_home", "S-HERO", {
      headline: "Headline Home",
    });

    const invalid = await sectionsRoute.PATCH(
      patchRequest([
        {
          code: "S-HERO",
          name: "Hero",
          enabled: true,
          order: 1,
          content: {},
        },
      ]),
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(invalid.status).toBe(400);
    const body = (await invalid.json()) as {
      error?: { code?: string; details?: { errors?: string[] } };
    };
    expect(body.error?.code).toBe("VALIDATION");
    expect(body.error?.details?.errors?.length).toBeGreaterThan(0);
  });

  it("maps a saveProjectSections ok:false result to a 400", async () => {
    seedProject("p1");
    seedPage("page_home", "p1", { is_home: true, title: "Home", order: 0 });
    seedSection("row_home", "p1", "page_home", "S-HERO", {
      headline: "Headline Home",
    });
    getRecord
      .mockResolvedValueOnce(store.projects.p1)
      .mockRejectedValueOnce(new Error("project hilang"));

    const response = await sectionsRoute.PATCH(
      patchRequest(
        [
          {
            code: "S-HERO",
            name: "Hero",
            enabled: true,
            order: 1,
            content: { headline: "Headline valid" },
          },
        ],
        { pageId: "page_home" },
      ),
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error?: { code?: string; details?: { errors?: string[] } };
    };
    expect(body.error?.code).toBe("VALIDATION");
    expect(body.error?.details?.errors).toContain("project not found");
  });

  it("reuses unassigned legacy rows for Home instead of duplicating them", async () => {
    seedProject("p1");
    seedPage("page_home", "p1", { is_home: true, title: "Home", order: 0 });
    seedSection("row_legacy", "p1", undefined, "S-HERO", {
      headline: "Headline Warisan",
    });

    const response = await sectionsRoute.PATCH(
      patchRequest(
        [
          {
            code: "S-HERO",
            name: "Hero",
            enabled: true,
            order: 1,
            content: { headline: "Headline Home" },
          },
        ],
        { pageId: "page_home" },
      ),
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(response.status).toBe(200);
    const heroRows = Object.values(store.project_sections).filter(
      (row) => row.section_code === "S-HERO",
    );
    expect(heroRows).toHaveLength(1);
    expect(heroRows[0].id).toBe("row_legacy");
    expect(heroRows[0].page_id).toBe("page_home");
    expect((heroRows[0].content as Rec).headline).toBe("Headline Home");
  });
});

describe("copy single source after copy_migrated", () => {
  it("writes saved copy into the site document used by load and render", async () => {
    seedProject("p1", {
      active_sections: {
        copy_migrated: true,
        site_settings: {
          site_name: "Kopi Senja",
          footer_tagline: "Tagline dari pengaturan situs",
        },
      },
    });
    seedPage("page_home", "p1", { is_home: true, title: "Home", order: 0 });
    seedSection("row_hero", "p1", "page_home", "S-HERO", {
      headline: "Headline Lama",
      eyebrow: "Eyebrow Lama",
    });
    seedSection(
      "row_foot",
      "p1",
      "page_home",
      "S-FOOT",
      { business_name: "Nama Lama", tagline: "Tagline Lama" },
      2,
    );

    await saveProjectCopy("p1", [
      { key: "hero_eyebrow", label: "Hero eyebrow", value: "Eyebrow Baru" },
      { key: "hero_title", label: "Hero title", value: "Judul Baru" },
      {
        key: "hero_subtitle",
        label: "Hero subtitle",
        value: "Subjudul Baru",
      },
      { key: "cta_button", label: "CTA button", value: "CTA Baru" },
    ]);

    const site = await loadProjectSite("p1");
    const hero = site?.content["S-HERO"] as Rec;
    const footer = site?.content["S-FOOT"] as Rec;

    expect(hero.eyebrow).toBe("Eyebrow Baru");
    expect(hero.headline).toBe("Judul Baru");
    expect(hero.subheadline).toBe("Subjudul Baru");
    expect((hero.primary_cta as Rec).label).toBe("CTA Baru");
    expect(footer.business_name).toBe("Kopi Senja");
    expect(footer.tagline).toBe("Tagline dari pengaturan situs");

    const rendered = await renderProjectSite("p1");
    expect(rendered?.html).toContain("Judul Baru");

    expect(Object.values(store.content_assets)).toHaveLength(1);
    expect(store.projects.p1.active_sections).toEqual({
      copy_migrated: true,
      site_settings: {
        site_name: "Kopi Senja",
        footer_tagline: "Tagline dari pengaturan situs",
      },
    });
  });
});
