import { beforeEach, describe, expect, it, vi } from "vitest";

const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  getRecord: vi.fn(),
  deleteRecord: vi.fn(),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

const { createProjectPage, ensureHomePage, listProjectPages, normalizePageSlug } =
  await import("@/modules/projects");

function page(items: unknown[]) {
  return { page: 1, perPage: 200, totalItems: items.length, totalPages: 1, items };
}

describe("project page foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecords.mockImplementation(async (collection: string) => {
      if (collection === "project_pages") return page([]);
      if (collection === "project_sections") {
        return page([
          { id: "sec-1", project_id: "proj-1", section_code: "S-HERO" },
        ]);
      }
      return page([]);
    });
    createRecord.mockImplementation(async (collection: string, body: object) => ({
      id: "page-1",
      ...body,
    }));
    updateRecord.mockImplementation(async (collection: string, id: string, body: object) => ({
      id,
      ...body,
    }));
  });

  it("creates Home and attaches unassigned legacy sections", async () => {
    const home = await ensureHomePage("proj-1");

    expect(home?.id).toBe("page-1");
    expect(home?.is_home).toBe(true);
    expect(createRecord).toHaveBeenCalledWith(
      "project_pages",
      expect.objectContaining({ project_id: "proj-1", slug: "", is_home: true }),
    );
    expect(updateRecord).toHaveBeenCalledWith(
      "project_sections",
      "sec-1",
      { page_id: "page-1" },
    );
  });

  it("normalizes page slugs and creates a non-home page", async () => {
    listRecords.mockImplementation(async (collection: string) => {
      if (collection === "project_pages") {
        return page([
          { id: "page-home", project_id: "proj-1", is_home: true, order: 0 },
        ]);
      }
      return page([]);
    });
    createRecord.mockImplementation(async (collection: string, body: object) => ({
      id: "page-about",
      ...body,
    }));

    const created = await createProjectPage("proj-1", {
      title: "About Us",
      slug: "About Us!",
    });

    expect(normalizePageSlug("About Us!")).toBe("about-us");
    expect(created.slug).toBe("about-us");
    expect(created.is_home).toBe(false);
  });

  it("rejects reserved page slugs", async () => {
    listRecords.mockImplementation(async (collection: string) => {
      if (collection === "project_pages") {
        return page([
          { id: "page-home", project_id: "proj-1", is_home: true, order: 0 },
        ]);
      }
      return page([]);
    });

    await expect(
      createProjectPage("proj-1", { title: "Assets", slug: "assets" }),
    ).rejects.toThrow("reserved");
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("reuses the existing Home page", async () => {
    listRecords.mockImplementation(async (collection: string) => {
      if (collection === "project_pages") {
        return page([
          { id: "page-home", project_id: "proj-1", is_home: true },
        ]);
      }
      return page([]);
    });

    const home = await ensureHomePage("proj-1");

    expect(home?.id).toBe("page-home");
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("propagates page-list read failures instead of treating them as empty", async () => {
    listRecords.mockRejectedValueOnce(new Error("page read failed"));

    await expect(listProjectPages("proj-1")).rejects.toThrow("page read failed");
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("propagates Home write failures instead of swallowing them", async () => {
    createRecord.mockRejectedValueOnce(new Error("page write failed"));

    await expect(ensureHomePage("proj-1")).rejects.toThrow("page write failed");
  });

  it("propagates legacy section attachment failures", async () => {
    listRecords.mockImplementation(async (collection: string) => {
      if (collection === "project_pages") {
        return page([
          { id: "page-home", project_id: "proj-1", is_home: true },
        ]);
      }
      if (collection === "project_sections") {
        return page([
          { id: "sec-1", project_id: "proj-1", section_code: "S-HERO" },
        ]);
      }
      return page([]);
    });
    updateRecord.mockRejectedValueOnce(new Error("section write failed"));

    await expect(ensureHomePage("proj-1")).rejects.toThrow(
      "section write failed",
    );
  });
});
