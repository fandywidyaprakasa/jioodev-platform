import { describe, expect, it } from "vitest";
import { mapLegacyProjectToCmsSite, mapLegacyPageToCmsPage, mapLegacySectionToCmsSection, mapCmsSectionToLegacy } from "@/modules/projects";
import type { Section } from "@/shared/types";

describe("CMS core legacy mapping", () => {
  it("maps legacy project state to canonical site", () => {
    const site = mapLegacyProjectToCmsSite(
      { id: "proj-1", active_sections: { theme_id: "t1", tier: "BASIC", site_settings: { site_name: "Nama", footer_tagline: "Tag" } } },
      undefined,
    );
    expect(site.id).toBe("proj-1");
    expect(site.project_ref).toBe("proj-1");
    expect(site.site_settings.site_name).toBe("Nama");
    expect(site.theme_tier_ref?.theme_id).toBe("t1");
  });

  it("maps legacy page to canonical page", () => {
    const page = mapLegacyPageToCmsPage(
      { id: "p1", project_id: "proj-1", title: "Home", slug: "", is_home: true, order: 0, seo: { title: "T" }, settings: { hidden: false } },
      "proj-1",
    );
    expect(page.id).toBe("p1");
    expect(page.site_id).toBe("proj-1");
    expect(page.is_home).toBe(true);
    expect(page.seo.title).toBe("T");
  });

  it("maps section round-trip without data loss", () => {
    const section: Section = { code: "S-HERO", name: "Hero", enabled: true, order: 1, variantId: "hero-split", content: { headline: "Halo" } };
    const cms = mapLegacySectionToCmsSection(section, "page-1");
    expect(cms.section_code).toBe("S-HERO");
    expect(cms.variant_id).toBe("hero-split");
    expect(cms.content?.headline).toBe("Halo");
    const legacy = mapCmsSectionToLegacy(cms);
    expect(legacy).toMatchObject({ code: "S-HERO", enabled: true, order: 1, variantId: "hero-split", content: { headline: "Halo" } });
  });
});

describe("CMS core validation", () => {
  it("rejects malformed section payloads visibly", async () => {
    const { parseSections } = await import("@/modules/sections");
    expect(parseSections(null).error).toBeTruthy();
    expect(parseSections({}).error).toBeTruthy();
  });

  it("validates unknown slots", async () => {
    const { validateSections } = await import("@/modules/sections");
    const errors = await validateSections([{ code: "S-UNKNOWN", name: "X", enabled: true, order: 1, variantId: "v1" }]);
    expect(errors.length).toBeGreaterThan(0);
  });
});

import { beforeEach, vi } from "vitest";

const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();
const deleteRecord = vi.fn();
const getRecord = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  deleteRecord: (...args: unknown[]) => deleteRecord(...args),
  getRecord: (...args: unknown[]) => getRecord(...args),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

function page(items: unknown[]) {
  return { page: 1, perPage: 200, totalItems: items.length, totalPages: 1, items };
}

describe("CMS core cross-project isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecords.mockImplementation(async (collection: string, params?: { filter?: string }) => {
      if (collection === "project_pages") {
        const filter = params?.filter ?? "";
        if (filter.includes("proj-1")) return page([{ id: "page-1", project_id: "proj-1", title: "Home", slug: "", is_home: true, order: 0, seo: {}, settings: {} }]);
        if (filter.includes("proj-2")) return page([{ id: "page-2", project_id: "proj-2", title: "Home", slug: "", is_home: true, order: 0, seo: {}, settings: {} }]);
      }
      return page([]);
    });
  });

  it("lists pages only for the requested project", async () => {
    const { listCmsPages } = await import("@/modules/projects");
    const pages1 = await listCmsPages("proj-1");
    const pages2 = await listCmsPages("proj-2");
    expect(pages1.map((p) => p.id)).toEqual(["page-1"]);
    expect(pages2.map((p) => p.id)).toEqual(["page-2"]);
  });
});
