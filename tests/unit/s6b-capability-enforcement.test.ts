import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Rec = Record<string, unknown>;

const state = vi.hoisted(() => ({
  actor: null as { id: string; role: "guest" | "user" | "admin"; guestId?: string } | null,
  project: null as Rec | null,
}));

const findProject = vi.fn();
const canAccess = vi.fn();
const createProjectPage = vi.fn();
const updateProjectPage = vi.fn();
const deleteProjectPage = vi.fn();
const getProjectSections = vi.fn();
const saveProjectSections = vi.fn();
const saveProjectSite = vi.fn();
const saveSiteSettings = vi.fn();
const uploadProjectAsset = vi.fn();
const listProjectPages = vi.fn();
const parseSections = vi.fn();
const validateSections = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  getRecord: vi.fn(async () => state.project),
  listRecords: vi.fn(async () => ({ page: 1, perPage: 100, totalItems: 0, totalPages: 1, items: [] })),
  createRecord: vi.fn(async (_c: string, body: Rec) => ({ id: "new", ...body })),
  updateRecord: vi.fn(async (_c: string, id: string, body: Rec) => ({ id, ...body })),
  deleteRecord: vi.fn(async () => undefined),
  escapeFilter: (value: string) => value,
}));

vi.mock("@/modules/auth", () => ({
  requireActor: async () =>
    state.actor ? { user: state.actor } : { response: new Response(null, { status: 401 }) },
  notFound: () => new Response(JSON.stringify({ error: { code: "NOT_FOUND" } }), { status: 404 }),
  badRequest: (message: string) => new Response(JSON.stringify({ error: { code: "VALIDATION", message } }), { status: 400 }),
}));

vi.mock("@/modules/projects", () => ({
  canAccess: (...args: unknown[]) => canAccess(...args),
  findProject: (...args: unknown[]) => findProject(...args),
  createProjectPage: (...args: unknown[]) => createProjectPage(...args),
  updateProjectPage: (...args: unknown[]) => updateProjectPage(...args),
  deleteProjectPage: (...args: unknown[]) => deleteProjectPage(...args),
  getProjectSections: (...args: unknown[]) => getProjectSections(...args),
  saveProjectSections: (...args: unknown[]) => saveProjectSections(...args),
  saveProjectSite: (...args: unknown[]) => saveProjectSite(...args),
  normalizeSections: (sections: unknown) => sections,
  saveSiteSettings: (...args: unknown[]) => saveSiteSettings(...args),
  uploadProjectAsset: (...args: unknown[]) => uploadProjectAsset(...args),
  listProjectPages: (...args: unknown[]) => listProjectPages(...args),
}));

vi.mock("@/modules/sections", () => ({
  parseSections: (...args: unknown[]) => parseSections(...args),
  validateSections: (...args: unknown[]) => validateSections(...args),
}));

const pagesRoute = await import("@/app/api/projects/[id]/pages/route");
const pageRoute = await import("@/app/api/projects/[id]/pages/[pageId]/route");
const sectionsRoute = await import("@/app/api/projects/[id]/sections/route");
const siteRoute = await import("@/app/api/projects/[id]/site/route");
const settingsRoute = await import("@/app/api/projects/[id]/site/settings/route");
const assetsRoute = await import("@/app/api/projects/[id]/assets/route");

function seedProject(productType?: string) {
  state.project = { id: "p1", product_type: productType ?? "LAND", status: "PICKED" };
  findProject.mockResolvedValue(state.project);
  canAccess.mockReturnValue(true);
  listProjectPages.mockResolvedValue([]);
}

function jsonReq(body: unknown) {
  return { json: async () => body } as unknown as NextRequest;
}

function assertResponse(response: Response | undefined): asserts response is Response {
  if (!response) {
    throw new Error("Expected route to return a response");
  }
}

beforeEach(() => {
  state.actor = { id: "u1", role: "user" };
  state.project = null;
  vi.clearAllMocks();
  findProject.mockResolvedValue(null);
  canAccess.mockReturnValue(false);
  parseSections.mockReturnValue({ sections: [{ code: "S-HERO", enabled: true, order: 1, variantId: "v1" }] });
  validateSections.mockResolvedValue([]);
  createProjectPage.mockResolvedValue({ id: "page-new", title: "New", slug: "new", is_home: false, order: 1, seo: {}, settings: {} });
  updateProjectPage.mockResolvedValue({ id: "page-1", title: "Updated", slug: "about", is_home: false, order: 1, seo: {}, settings: {} });
  deleteProjectPage.mockResolvedValue(true);
  saveProjectSections.mockResolvedValue({ ok: true, sections: [] });
  saveProjectSite.mockResolvedValue([{ code: "S-HERO" }]);
  saveSiteSettings.mockResolvedValue({ site_name: "x" });
  uploadProjectAsset.mockResolvedValue({ id: "asset-1", name: "a.png", url: "/x", size: 1, createdAt: "now" });
});

describe("S6-B capability enforcement", () => {
  it("pages create: unsupported does not mutate, supported works", async () => {
    seedProject("WEB");
    const unsupported = await pagesRoute.POST(jsonReq({ title: "About", slug: "about" }), { params: Promise.resolve({ id: "p1" }) });
    assertResponse(unsupported);
    expect(unsupported.status).toBe(403);
    expect(createProjectPage).not.toHaveBeenCalled();

    seedProject("LAND");
    const supported = await pagesRoute.POST(jsonReq({ title: "About", slug: "about" }), { params: Promise.resolve({ id: "p1" }) });
    assertResponse(supported);
    expect(supported.status).toBe(201);
    expect(createProjectPage).toHaveBeenCalled();
  });

  it("pages update: unsupported does not mutate, supported works", async () => {
    seedProject("WEB");
    const unsupported = await pageRoute.PATCH(jsonReq({ title: "New title" }), { params: Promise.resolve({ id: "p1", pageId: "page-1" }) });
    assertResponse(unsupported);
    expect(unsupported.status).toBe(403);
    expect(updateProjectPage).not.toHaveBeenCalled();

    seedProject("LAND");
    const supported = await pageRoute.PATCH(jsonReq({ title: "New title" }), { params: Promise.resolve({ id: "p1", pageId: "page-1" }) });
    assertResponse(supported);
    expect(supported.status).toBe(200);
    expect(updateProjectPage).toHaveBeenCalled();
  });

  it("pages delete: unsupported does not mutate, supported works", async () => {
    seedProject("WEB");
    const unsupported = await pageRoute.DELETE({} as NextRequest, { params: Promise.resolve({ id: "p1", pageId: "page-1" }) });
    assertResponse(unsupported);
    expect(unsupported.status).toBe(403);
    expect(deleteProjectPage).not.toHaveBeenCalled();

    seedProject("LAND");
    const supported = await pageRoute.DELETE({} as NextRequest, { params: Promise.resolve({ id: "p1", pageId: "page-1" }) });
    assertResponse(supported);
    expect(supported.status).toBe(200);
    expect(deleteProjectPage).toHaveBeenCalled();
  });

  it("sections: unsupported does not mutate, supported works", async () => {
    seedProject("WEB");
    const unsupported = await sectionsRoute.PATCH(jsonReq({}), { params: Promise.resolve({ id: "p1" }) });
    assertResponse(unsupported);
    expect(unsupported.status).toBe(403);
    expect(saveProjectSections).not.toHaveBeenCalled();

    seedProject("LAND");
    const supported = await sectionsRoute.PATCH(jsonReq({}), { params: Promise.resolve({ id: "p1" }) });
    assertResponse(supported);
    expect(supported.status).toBe(200);
    expect(saveProjectSections).toHaveBeenCalled();
  });

  it("site: unsupported does not mutate, supported works", async () => {
    seedProject("WEB");
    const unsupported = await siteRoute.PATCH(jsonReq({ sections: [{ code: "S-HERO", enabled: true, order: 1, variantId: "v1" }] }), { params: Promise.resolve({ id: "p1" }) });
    assertResponse(unsupported);
    expect(unsupported.status).toBe(403);
    expect(saveProjectSite).not.toHaveBeenCalled();

    seedProject("LAND");
    const supported = await siteRoute.PATCH(jsonReq({ sections: [{ code: "S-HERO", enabled: true, order: 1, variantId: "v1" }] }), { params: Promise.resolve({ id: "p1" }) });
    assertResponse(supported);
    expect(supported.status).toBe(200);
    expect(saveProjectSite).toHaveBeenCalled();
  });

  it("site settings: unsupported does not mutate, supported works", async () => {
    seedProject("WEB");
    const unsupported = await settingsRoute.PATCH(jsonReq({ siteName: "X" }), { params: Promise.resolve({ id: "p1" }) });
    assertResponse(unsupported);
    expect(unsupported.status).toBe(403);
    expect(saveSiteSettings).not.toHaveBeenCalled();

    seedProject("LAND");
    const supported = await settingsRoute.PATCH(jsonReq({ siteName: "X" }), { params: Promise.resolve({ id: "p1" }) });
    assertResponse(supported);
    expect(supported.status).toBe(200);
    expect(saveSiteSettings).toHaveBeenCalled();
  });

  it("assets upload: unsupported does not mutate, supported works", async () => {
    seedProject("WEB");
    const form = new FormData();
    form.set("file", new File(["x"], "a.png", { type: "image/png" }));
    const req = { formData: async () => form } as unknown as NextRequest;
    const unsupported = await assetsRoute.POST(req, { params: Promise.resolve({ id: "p1" }) });
    assertResponse(unsupported);
    expect(unsupported.status).toBe(403);
    expect(uploadProjectAsset).not.toHaveBeenCalled();

    seedProject("LAND");
    const form2 = new FormData();
    form2.set("file", new File(["x"], "a.png", { type: "image/png" }));
    const req2 = { formData: async () => form2 } as unknown as NextRequest;
    const supported = await assetsRoute.POST(req2, { params: Promise.resolve({ id: "p1" }) });
    assertResponse(supported);
    expect(supported.status).toBe(201);
    expect(uploadProjectAsset).toHaveBeenCalled();
  });
});
