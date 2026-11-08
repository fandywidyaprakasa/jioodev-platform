import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("CMS Slice 3A variant constraints", () => {
  it("rejects an incompatible theme", async () => {
    const { validateSections } = await import("@/modules/sections");
    const errors = await validateSections(
      [{ code: "S-HERO", name: "Hero", enabled: true, order: 1, variantId: "hero-split" }],
      "definitely-not-a-theme",
      "BASIC",
    );
    expect(errors.some((error) => error.includes("tidak kompatibel"))).toBe(true);
  });

  it("rejects an incompatible tier", async () => {
    const { validateSections } = await import("@/modules/sections");
    const errors = await validateSections(
      [{ code: "S-HERO", name: "Hero", enabled: true, order: 1, variantId: "hero-split" }],
      { themeId: "split-edt", tier: "NOT-A-TIER" },
    );
    expect(errors.some((error) => error.includes("tidak kompatibel"))).toBe(true);
  });

  it("accepts compatible theme and tier values", async () => {
    const { validateSections } = await import("@/modules/sections");
    const errors = await validateSections(
      [{ code: "S-HERO", name: "Hero", enabled: true, order: 1, variantId: "hero-split" }],
      "split-edt",
      "BASIC",
    );
    expect(errors).toEqual([]);
  });
});

describe("CMS Slice 3A project-scoped writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecords.mockResolvedValue(page([]));
    getRecord.mockResolvedValue({
      id: "proj-1",
      active_sections: { theme_id: "not-a-theme", tier: "BASIC" },
    });
  });

  it("does not persist an incompatible variant", async () => {
    const { saveProjectSections } = await import("@/modules/projects");
    const result = await saveProjectSections("proj-1", [
      { code: "S-HERO", name: "Hero", enabled: true, order: 1, variantId: "hero-split" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.includes("tidak kompatibel"))).toBe(true);
    }
    expect(createRecord).not.toHaveBeenCalled();
    expect(updateRecord).not.toHaveBeenCalled();
  });
});

describe("CMS Slice 3A page writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecords.mockImplementation(async (collection: string) => {
      if (collection === "project_pages") {
        return page([{ id: "page-1", project_id: "proj-1", title: "Home", slug: "", is_home: true, order: 0, seo: {}, settings: {} }]);
      }
      return page([]);
    });
  });

  it("rejects invalid page data before persistence", async () => {
    const { updateCmsPage } = await import("@/modules/projects");
    await expect(
      updateCmsPage("proj-1", "page-1", { slug: "not-allowed-for-home" }),
    ).rejects.toThrow(/Home slug/);
    expect(updateRecord).not.toHaveBeenCalled();
  });
});

describe("CMS Slice 3A site settings preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRecord.mockResolvedValue({
      id: "proj-1",
      active_sections: { site_settings: { site_name: "Old" } },
    });
    updateRecord.mockResolvedValue({
      id: "proj-1",
      client_label: "Project Baru",
      product_type: "LAND",
      status: "DRAFT",
      created: "",
      updated: "",
      active_sections: { site_settings: { site_name: "New", theme_id: "theme-1", tier: "PRO" } },
    });
  });

  it("preserves explicitly supplied theme_id and tier", async () => {
    const { editCmsSiteSettings } = await import("@/modules/projects");
    await editCmsSiteSettings("proj-1", {
      site_name: "New",
      footer_tagline: "Tag",
      theme_id: "theme-1",
      tier: "PRO",
    });
    expect(updateRecord).toHaveBeenCalledWith(
      "projects",
      "proj-1",
      expect.objectContaining({
        active_sections: expect.objectContaining({
          site_settings: expect.objectContaining({
            site_name: "New",
            theme_id: "theme-1",
            tier: "PRO",
          }),
        }),
      }),
    );
  });
});
