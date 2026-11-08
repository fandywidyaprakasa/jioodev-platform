import { beforeEach, describe, expect, it, vi } from "vitest";

type Rec = Record<string, unknown>;

const records: Record<string, Record<string, Rec>> = {
  projects: {},
  production_outputs: {},
  published_pages: {},
  payments: {},
  deployments: {},
};
let seq = 0;

const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();
const getRecord = vi.fn();
const findProject = vi.fn();
const patchProject = vi.fn();
const listProjectPages = vi.fn();
const loadProjectSite = vi.fn();
const toSiteSnapshot = vi.fn();
const renderSiteSnapshot = vi.fn();
const getBusinessProfile = vi.fn();
const getProjectCopy = vi.fn();
const getProjectAssetFile = vi.fn();
const getLatestJob = vi.fn();
const getOutput = vi.fn();
const isOutputRevoked = vi.fn();
const renderTemplateHtml = vi.fn();
const logActivity = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  getRecord: (...args: unknown[]) => getRecord(...args),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

vi.mock("@/modules/projects", () => ({
  findProject: (...args: unknown[]) => findProject(...args),
  patchProject: (...args: unknown[]) => patchProject(...args),
  listProjectPages: (...args: unknown[]) => listProjectPages(...args),
  loadProjectSite: (...args: unknown[]) => loadProjectSite(...args),
  toSiteSnapshot: (...args: unknown[]) => toSiteSnapshot(...args),
  renderSiteSnapshot: (...args: unknown[]) => renderSiteSnapshot(...args),
  getBusinessProfile: (...args: unknown[]) => getBusinessProfile(...args),
  getProjectCopy: (...args: unknown[]) => getProjectCopy(...args),
  getProjectAssetFile: (...args: unknown[]) => getProjectAssetFile(...args),
}));

vi.mock("@/modules/generation", () => ({
  getLatestJob: (...args: unknown[]) => getLatestJob(...args),
  getOutput: (...args: unknown[]) => getOutput(...args),
  isOutputRevoked: (...args: unknown[]) => isOutputRevoked(...args),
}));

vi.mock("@/modules/preview", () => ({
  renderTemplateHtml: (...args: unknown[]) => renderTemplateHtml(...args),
}));

vi.mock("@/modules/activity", () => ({
  logActivity: (...args: unknown[]) => logActivity(...args),
}));

const {
  findPublishedPageByProject,
  publishAndMarkLive,
  publishProject,
  renderPublishedPage,
} = await import("@/modules/publishing");

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

function collectionItems(collection: string, filter?: string) {
  return Object.values(records[collection] ?? {}).filter((item) =>
    matchesFilter(item, filter),
  );
}

function duplicateError() {
  const error = new Error("unique constraint failed");
  (error as Error & { status: number }).status = 409;
  return error;
}

function assertUnique(collection: string, body: Rec, ignoreId?: string) {
  const items = Object.values(records[collection] ?? {});
  if (
    collection === "production_outputs" &&
    body.idempotency_key &&
    items.some(
      (item) =>
        item.id !== ignoreId && item.idempotency_key === body.idempotency_key,
    )
  ) {
    throw duplicateError();
  }
  if (collection === "published_pages") {
    if (
      body.status === "PUBLISHED" &&
      items.some(
        (item) =>
          item.id !== ignoreId &&
          item.project_id === body.project_id &&
          item.status === "PUBLISHED",
      )
    ) {
      throw duplicateError();
    }
    if (
      body.slug &&
      items.some((item) => item.id !== ignoreId && item.slug === body.slug)
    ) {
      throw duplicateError();
    }
    if (
      body.output_id &&
      items.some(
        (item) => item.id !== ignoreId && item.output_id === body.output_id,
      )
    ) {
      throw duplicateError();
    }
  }
}

function seedProject(id: string, status: string, overrides: Rec = {}) {
  records.projects[id] = {
    id,
    client_label: "Kopi Senja",
    status,
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
    ...overrides,
  };
}

function seedJob(template = "LAND-LSPLIT-EDT-001") {
  records.production_outputs.job_1 = {
    id: "job_1",
    project_id: "p1",
    version: 1,
    status: "READY",
    created: "2026-11-03T00:00:00.000Z",
    report: {
      template,
      variants: [
        { id: "variant_1", label: "Editorial", previewUrl: "/preview/x" },
      ],
    },
  };
}

function publishSnapshots() {
  return Object.values(records.production_outputs).filter(
    (output) => (output.report as Rec | undefined)?.kind === "publish",
  );
}

function publishedPages() {
  return Object.values(records.published_pages);
}

function page(id: string, isHome: boolean, slug: string, overrides: Rec = {}) {
  return {
    id,
    project_id: "p1",
    title: id,
    slug,
    is_home: isHome,
    order: 0,
    seo: {},
    settings: {},
    ...overrides,
  };
}

function resetPages() {
  listProjectPages.mockResolvedValue([
    page("page_home", true, ""),
    page("page_about", false, "about"),
  ]);
}

beforeEach(() => {
  for (const collection of Object.keys(records)) records[collection] = {};
  seq = 0;
  vi.clearAllMocks();
  delete process.env.PUBLIC_PAGE_BASE_URL;
  delete process.env.NEXTAUTH_URL;

  listRecords.mockImplementation(
    async (
      collection: string,
      params: { filter?: string; sort?: string } = {},
    ) => {
      const items = collectionItems(collection, params.filter);
      if (params.sort === "-version") {
        items.sort(
          (a, b) => Number(b.version ?? 0) - Number(a.version ?? 0),
        );
      }
      if (params.sort === "-created") {
        items.sort((a, b) =>
          String(b.created ?? "").localeCompare(String(a.created ?? "")),
        );
      }
      return {
        page: 1,
        perPage: 100,
        totalItems: items.length,
        totalPages: 1,
        items,
      };
    },
  );
  createRecord.mockImplementation(async (collection: string, body: Rec) => {
    assertUnique(collection, body);
    const record = {
      id: `${collection}_${++seq}`,
      created: new Date(Date.now() + seq).toISOString(),
      ...body,
    };
    records[collection] ??= {};
    records[collection][record.id] = record;
    return record;
  });
  updateRecord.mockImplementation(
    async (collection: string, id: string, body: Rec) => {
      const record = records[collection]?.[id];
      if (!record) throw new Error("not found");
      assertUnique(collection, { ...record, ...body }, id);
      Object.assign(record, body);
      return record;
    },
  );
  getRecord.mockImplementation(async (collection: string, id: string) => {
    const record = records[collection]?.[id];
    if (!record) throw new Error("not found");
    return record;
  });

  findProject.mockImplementation(
    async (id: string) => records.projects[id] ?? null,
  );
  patchProject.mockImplementation(
    async (id: string, patch: Rec) => {
      const record = records.projects[id];
      if (!record) throw new Error("project not found");
      Object.assign(record, patch);
      return record;
    },
  );

  resetPages();
  loadProjectSite.mockImplementation(async (_projectId: string, pageId: string) => ({
    id: pageId,
    persisted: pageId === "page_home" ? false : true,
  }));
  toSiteSnapshot.mockImplementation((site: { id: string }) => ({
    compositionId: "split-editorial-basic-v1",
    themeId: "split-edt",
    tier: "BASIC",
    blocks: [{ slot: "S-HERO", variant: "hero-split", enabled: true, order: 1 }],
    content:
      site.id === "page_home"
        ? { "S-FOOT": { business_name: "Kopi Senja" } }
        : { "S-HERO": { headline: "Tentang Kami" } },
  }));
  renderSiteSnapshot.mockImplementation(async (snapshot: Rec) => ({
    html: `<!doctype html><html><head><title>Kopi Senja</title></head><body><div data-slot="S-HERO">${JSON.stringify(
      snapshot.content,
    )}</div></body></html>`,
  }));
  getProjectAssetFile.mockImplementation(async () => ({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    }),
    contentType: "image/png",
  }));

  getBusinessProfile.mockResolvedValue(null);
  getProjectCopy.mockImplementation(
    async (_projectId: string, fallback: unknown[]) => fallback,
  );
  getLatestJob.mockResolvedValue({
    id: "job_1",
    status: "READY",
    progress: 100,
    variants: [
      { id: "variant_1", label: "Editorial", previewUrl: "/preview/x" },
    ],
  });
  getOutput.mockImplementation(
    async (id: string) => records.production_outputs[id] ?? null,
  );
  isOutputRevoked.mockReturnValue(false);
  renderTemplateHtml.mockResolvedValue(
    "<!doctype html><html><head><title>Kopi Senja</title></head><body><h1>Kopi Senja</h1></body></html>",
  );
  logActivity.mockResolvedValue(undefined);

  seedProject("p1", "PAID");
  seedJob();
});

describe("publish readiness gate", () => {
  it("activates only after readiness passes and includes pages regardless of persisted flag", async () => {
    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    const snapshots = publishSnapshots();
    expect(snapshots).toHaveLength(1);
    const report = snapshots[0].report as Rec;
    const included = (report.pages as Array<{ id: string }>).map(
      (item) => item.id,
    );
    expect(included.sort()).toEqual(["page_about", "page_home"]);
    expect(loadProjectSite).toHaveBeenCalledWith("p1", "page_home");
    expect(records.projects.p1.status).toBe("ACTIVE");
    expect(publishedPages()).toHaveLength(1);
    expect(publishedPages()[0].version).toBe(1);
    expect(snapshots[0].status).toBe("READY");
    expect(report.adapter_id).toBe("html");
    expect(report.adapter_version).toBe("1");
    expect(report.renderer_version).toBe("1");
  });

  it("does not activate when a CMS page snapshot is missing", async () => {
    loadProjectSite.mockImplementation(
      async (_projectId: string, pageId: string) =>
        pageId === "page_about" ? null : { id: pageId, persisted: false },
    );

    const result = await publishProject("p1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(records.projects.p1.status).not.toBe("ACTIVE");
    expect(publishedPages()).toHaveLength(0);
  });

  it("does not activate when candidate rendering fails", async () => {
    renderSiteSnapshot.mockRejectedValue(new Error("render failed"));

    const result = await publishProject("p1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("RENDER_FAILED");
    expect(records.projects.p1.status).not.toBe("ACTIVE");
    expect(publishedPages()).toHaveLength(0);
  });

  it("does not activate when the required health check fails and leaves the candidate unready", async () => {
    const result = await publishProject("p1", {
      healthCheck: async () => ({ ok: false, message: "route not healthy" }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("HEALTH_FAILED");
    expect(records.projects.p1.status).toBe("DEPLOYED");
    expect(publishedPages()).toHaveLength(0);
    expect(publishSnapshots()[0].status).toBe("CANDIDATE");
  });

  it("requires a CONFIRMED payment when a payment record exists", async () => {
    records.payments.pay_1 = {
      id: "pay_1",
      project_id: "p1",
      status: "PENDING",
      created: "2026-11-04T00:00:00.000Z",
    };

    const blocked = await publishProject("p1");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("PAYMENT_REQUIRED");
    expect(records.projects.p1.status).not.toBe("ACTIVE");

    records.payments.pay_1.status = "REFUNDED";
    const refunded = await publishProject("p1");
    expect(refunded.ok).toBe(false);
    if (!refunded.ok) expect(refunded.code).toBe("PAYMENT_REQUIRED");

    records.payments.pay_1.status = "CONFIRMED";
    const ok = await publishProject("p1");
    expect(ok.ok).toBe(true);
    expect(records.projects.p1.status).toBe("ACTIVE");
  });

  it("fails closed when published-page lookup is unavailable", async () => {
    const original = listRecords.getMockImplementation();
    listRecords.mockImplementation(
      async (collection: string, params?: { filter?: string }) => {
        if (collection === "published_pages") {
          throw new Error("published read failed");
        }
        return original?.(collection, params ?? {});
      },
    );

    await expect(findPublishedPageByProject("p1")).rejects.toThrow(
      "published read failed",
    );
  });

  it("changes referenced asset bytes create a new publish version", async () => {
    renderSiteSnapshot.mockResolvedValue({
      html: '<!doctype html><html><head><title>Kopi Senja</title></head><body><img src="/api/projects/p1/assets/asset1/file"></body></html>',
    });
    getProjectAssetFile.mockImplementation(async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      contentType: "image/png",
    }));
    const first = await publishProject("p1");
    expect(first.ok).toBe(true);
    const firstReport = publishSnapshots()[0].report as Rec;
    const firstRenderHash = firstReport.render_hash;
    const firstRevision = firstReport.publish_revision;
    const firstIdempotency = firstReport.idempotency_key;

    getProjectAssetFile.mockImplementation(async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([9, 9, 9]));
          controller.close();
        },
      }),
      contentType: "image/png",
    }));
    const second = await publishProject("p1");
    expect(second.ok).toBe(true);
    const secondReport = publishSnapshots().at(-1)?.report as Rec;
    expect(secondReport.render_hash).not.toBe(firstRenderHash);
    expect(secondReport.publish_revision).not.toBe(firstRevision);
    expect(secondReport.idempotency_key).not.toBe(firstIdempotency);
    expect(Number(publishSnapshots().at(-1)?.version)).toBe(2);
  });

  it("fails closed when a referenced media asset is missing", async () => {
    renderSiteSnapshot.mockResolvedValue({
      html: '<!doctype html><html><head><title>Kopi Senja</title></head><body><img src="/api/projects/p1/assets/asset1/file"></body></html>',
    });
    getProjectAssetFile.mockResolvedValue(null);

    const result = await publishProject("p1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("RENDER_FAILED");
    expect(records.projects.p1.status).not.toBe("ACTIVE");
    expect(publishedPages()).toHaveLength(0);
    expect(publishSnapshots()).toHaveLength(0);
  });

  it("fails closed when a referenced media stream cannot be read", async () => {
    renderSiteSnapshot.mockResolvedValue({
      html: '<!doctype html><html><head><title>Kopi Senja</title></head><body><img src="/api/projects/p1/assets/asset1/file"></body></html>',
    });
    getProjectAssetFile.mockImplementation(async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.error(new Error("read failed"));
        },
      }),
      contentType: "image/png",
    }));

    const result = await publishProject("p1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("RENDER_FAILED");
    expect(records.projects.p1.status).not.toBe("ACTIVE");
    expect(publishedPages()).toHaveLength(0);
    expect(publishSnapshots()).toHaveLength(0);
  });

  it("fails closed when a referenced media type is unsupported", async () => {
    renderSiteSnapshot.mockResolvedValue({
      html: '<!doctype html><html><head><title>Kopi Senja</title></head><body><img src="/api/projects/p1/assets/asset1/file"></body></html>',
    });
    getProjectAssetFile.mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      contentType: "image/svg+xml",
    });

    const result = await publishProject("p1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("RENDER_FAILED");
    expect(records.projects.p1.status).not.toBe("ACTIVE");
    expect(publishedPages()).toHaveLength(0);
    expect(publishSnapshots()).toHaveLength(0);
  });

  it("normalizes mixed-case MIME parameters consistently", async () => {
    renderSiteSnapshot.mockResolvedValue({
      html: '<!doctype html><html><head><title>Kopi Senja</title></head><body><img src="/api/projects/p1/assets/asset1/file"></body></html>',
    });
    getProjectAssetFile.mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      contentType: "IMAGE/PNG; charset=UTF-8",
    });

    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    const report = publishSnapshots().at(-1)?.report as Rec;
    expect(report.asset_manifest).toEqual([{ path: "media/asset1", hash: expect.any(String) }]);
  });

  it("rewrites referenced project media and records a sorted manifest", async () => {
    renderSiteSnapshot.mockResolvedValue({
      html: '<!doctype html><html><head><title>Kopi Senja</title></head><body><img src="/api/projects/p1/assets/asset1/file"></body></html>',
    });

    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    const report = publishSnapshots()[0].report as Rec;
    const pages = report.pages as Array<{ html: string }>;
    expect(pages[0].html).toContain("/p/");
    expect(pages[0].html).not.toContain("/api/projects/p1/assets/asset1/file");
    expect(report.asset_manifest).toEqual([{ path: "media/asset1", hash: expect.any(String) }]);
  });

  it("preserves CONFIRMED payment across republish without creating a new payment", async () => {
    records.payments.pay_1 = {
      id: "pay_1",
      project_id: "p1",
      status: "CONFIRMED",
      created: "2026-11-04T00:00:00.000Z",
    };
    expect((await publishProject("p1")).ok).toBe(true);
    renderSiteSnapshot.mockResolvedValue({
      html: "<!doctype html><html><head><title>Kopi Senja</title></head><body><div data-slot=\"S-HERO\">Kopi Senja baru</div></body></html>",
    });

    expect((await publishProject("p1")).ok).toBe(true);

    expect(Object.keys(records.payments)).toHaveLength(1);
    expect(records.payments.pay_1.status).toBe("CONFIRMED");
    expect(records.projects.p1.status).toBe("ACTIVE");
  });

  it("fails closed when payment lookup is unavailable", async () => {
    listRecords.mockImplementation(async (collection: string) => {
      if (collection === "payments") throw new Error("payments read failed");
      return { page: 1, perPage: 100, totalItems: 0, totalPages: 1, items: [] };
    });

    await expect(publishProject("p1")).rejects.toThrow("payments read failed");
    expect(records.projects.p1.status).not.toBe("ACTIVE");
  });

  it("does not let hidden non-home pages block publish or enter the snapshot", async () => {
    listProjectPages.mockResolvedValue([
      page("page_home", true, ""),
      page("page_hidden", false, "hidden", { settings: { hidden: true } }),
      page("page_about", false, "about"),
    ]);
    loadProjectSite.mockImplementation(
      async (_projectId: string, pageId: string) => {
        if (pageId === "page_hidden") throw new Error("hidden page broken");
        return { id: pageId, persisted: false };
      },
    );

    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    const report = publishSnapshots()[0].report as Rec;
    const ids = (report.pages as Array<{ id: string }>).map((item) => item.id);
    expect(ids.sort()).toEqual(["page_about", "page_home"]);
  });

  it("normalizes short slugs so the public link resolves", async () => {
    seedProject("p1", "PAID", { client_label: "A" });

    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.slug).toBe("a-page");
      expect(result.page.slug.length).toBeGreaterThanOrEqual(3);
    }
    const html = await renderPublishedPage("a-page");
    expect(html).toContain('href="/p/a-page"');
  });

  it("verifies stored HTML hashes when serving and rejects tampered snapshots", async () => {
    const published = await publishProject("p1");
    expect(published.ok).toBe(true);
    const snapshot = publishSnapshots()[0];
    const report = snapshot.report as Rec;
    const home = (report.pages as Rec[]).find((item) => item.isHome);
    expect(home?.html_hash).toBeTruthy();

    home!.html = "<html><body>tampered</body></html>";
    expect(await renderPublishedPage("kopi-senja")).toBeNull();

    snapshot.status = "FAILED";
    expect(await renderPublishedPage("kopi-senja")).toBeNull();
  });

  it("serves legacy publishes from the stored snapshot instead of live inputs", async () => {
    listProjectPages.mockResolvedValue([]);
    const result = await publishProject("p1");
    expect(result.ok).toBe(true);
    expect(renderTemplateHtml).toHaveBeenCalledTimes(1);

    renderTemplateHtml.mockResolvedValue(
      "<!doctype html><html><body>LIVE CHANGED</body></html>",
    );
    const html = await renderPublishedPage("kopi-senja");

    expect(html).toContain("Kopi Senja");
    expect(html).not.toContain("LIVE CHANGED");
    expect(renderTemplateHtml).toHaveBeenCalledTimes(1);
  });

  it("uses per-page titles and canonical URLs for non-home pages", async () => {
    listProjectPages.mockResolvedValue([
      page("page_home", true, ""),
      page("page_about", false, "about", {
        title: "Tentang Kami",
        seo: { title: "Tentang Kopi Senja" },
      }),
    ]);
    const result = await publishProject("p1");
    expect(result.ok).toBe(true);

    const html = await renderPublishedPage("kopi-senja", undefined, "about");
    expect(html).toContain('rel="canonical" href="/p/kopi-senja/about"');
    expect(html).toContain("<title>Tentang Kopi Senja</title>");
  });

  it("reuses the same publish revision on duplicate idempotent retries", async () => {
    const first = await publishProject("p1", { idempotencyKey: "retry-1" });
    expect(first.ok).toBe(true);
    expect(publishSnapshots()).toHaveLength(1);
    const firstVersion = publishedPages()[0].version;

    const second = await publishProject("p1", { idempotencyKey: "retry-1" });

    expect(second.ok).toBe(true);
    if (second.ok) expect(second.idempotent).toBe(true);
    expect(publishSnapshots()).toHaveLength(1);
    expect(publishedPages()[0].version).toBe(firstVersion);
    expect(records.projects.p1.status).toBe("ACTIVE");
  });

  it("serializes concurrent same-revision publishes through the unique key", async () => {
    const [first, second] = await Promise.all([
      publishProject("p1"),
      publishProject("p1"),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(publishSnapshots()).toHaveLength(1);
    expect(publishedPages()).toHaveLength(1);
    expect(publishedPages()[0].version).toBe(1);
  });

  it("retries a failed health gate on the same revision without duplicating it", async () => {
    let healthy = false;
    const healthCheck = async () =>
      healthy
        ? { ok: true, message: "healthy" }
        : { ok: false, message: "not yet healthy" };

    const failed = await publishProject("p1", {
      idempotencyKey: "retry-2",
      healthCheck,
    });
    expect(failed.ok).toBe(false);
    expect(publishSnapshots()).toHaveLength(1);
    expect(publishedPages()).toHaveLength(0);

    healthy = true;
    const retried = await publishProject("p1", {
      idempotencyKey: "retry-2",
      healthCheck,
    });

    expect(retried.ok).toBe(true);
    expect(publishSnapshots()).toHaveLength(1);
    expect(publishSnapshots()[0].status).toBe("READY");
    expect(publishedPages()).toHaveLength(1);
    expect(publishedPages()[0].version).toBe(1);
    expect(records.projects.p1.status).toBe("ACTIVE");
  });

  it("increases the publish revision counter for new content", async () => {
    renderSiteSnapshot.mockResolvedValueOnce({
      html: "<!doctype html><html><head><title>Kopi Senja</title></head><body><div data-slot=\"S-HERO\">Kopi Senja satu</div></body></html>",
    });
    const first = await publishProject("p1");
    expect(first.ok).toBe(true);

    renderSiteSnapshot.mockResolvedValue({
      html: "<!doctype html><html><head><title>Kopi Senja</title></head><body><div data-slot=\"S-HERO\">Kopi Senja dua</div></body></html>",
    });
    const second = await publishProject("p1");
    expect(second.ok).toBe(true);

    const versions = publishSnapshots()
      .map((item) => Number(item.version))
      .sort((a, b) => a - b);
    expect(versions).toEqual([1, 2]);
    expect(publishedPages()[0].version).toBe(2);
  });

  it("keeps ACTIVE and the old snapshot when a republish candidate fails health", async () => {
    records.published_pages.page_old = {
      id: "page_old",
      project_id: "p1",
      user_id: "",
      slug: "kopi-senja",
      status: "PUBLISHED",
      output_id: "job_1",
      version: 1,
      template: "LAND-LSPLIT-EDT-001",
      published_at: "2026-11-03T00:00:00.000Z",
    };
    seedProject("p1", "ACTIVE");

    const result = await publishProject("p1", {
      healthCheck: async () => ({ ok: false, message: "candidate unhealthy" }),
    });

    expect(result.ok).toBe(false);
    expect(records.projects.p1.status).toBe("ACTIVE");
    expect(records.published_pages.page_old.output_id).toBe("job_1");
    expect(records.published_pages.page_old.version).toBe(1);
  });

  it("propagates deployment write failures instead of reporting a false live success", async () => {
    const original = createRecord.getMockImplementation();
    createRecord.mockImplementation(async (collection: string, body: Rec) => {
      if (collection === "deployments") {
        throw new Error("deployment write failed");
      }
      return original?.(collection, body);
    });

    await expect(publishAndMarkLive("p1")).rejects.toThrow(
      "deployment write failed",
    );
  });

  it("keeps legacy projects publishable through the legacy render path", async () => {
    listProjectPages.mockResolvedValue([]);

    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    const snapshots = publishSnapshots();
    expect(snapshots).toHaveLength(1);
    const report = snapshots[0].report as Rec;
    expect(report.site).toBeNull();
    expect(report.template).toBe("LAND-LSPLIT-EDT-001");
    expect(records.projects.p1.status).toBe("ACTIVE");

    const html = await renderPublishedPage("kopi-senja");
    expect(html).toContain("Kopi Senja");
    expect(html).toContain('rel="canonical"');
  });

  it("records composition snapshots with renderer and adapter metadata", async () => {
    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    const report = publishSnapshots()[0].report as Rec;
    expect(report.site).not.toBeNull();
    expect(Array.isArray(report.pages)).toBe(true);
    expect((report.pages as Rec[]).length).toBeGreaterThan(0);
    expect(report.adapter_id).toBe("html");
    expect(report.adapter_version).toBe("1");
    expect(report.renderer_version).toBe("1");
    expect(report.asset_manifest).toBeDefined();
  });

  it("records legacy snapshots as diagnosable transitional use, not a second adapter", async () => {
    listProjectPages.mockResolvedValue([]);

    const result = await publishProject("p1");

    expect(result.ok).toBe(true);
    const report = publishSnapshots()[0].report as Rec;
    expect(report.site).toBeNull();
    expect(report.legacy).toBeTruthy();
    expect((report.legacy as Rec).diagnostics).toContain(
      "Legacy template path is transitional (D-S2.2-05); it is not a second adapter.",
    );
    expect(report.adapter_id).toBe("html");
  });
});
