import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Rec = Record<string, unknown>;

const state = vi.hoisted(() => ({
  actor: null as
    | { id: string; role: "guest" | "user" | "admin"; guestId?: string }
    | null,
  records: {} as Record<string, Record<string, Rec>>,
}));

const getRecord = vi.fn();
const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();
const publishAndMarkLive = vi.fn();
const findPublishedPageByProject = vi.fn();
const unpublishAndSuspend = vi.fn();

vi.mock("@/shared/infrastructure/pocketbase/pb-platform", () => ({
  getRecord: (...args: unknown[]) => getRecord(...args),
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  deleteRecord: vi.fn(),
  escapeFilter: (value: string) => value.replace(/'/g, "\\'"),
}));

vi.mock("@/modules/auth", () => ({
  requireActor: async () =>
    state.actor ? { user: state.actor } : { response: json(401, "UNAUTHENTICATED") },
  requireUser: async () =>
    state.actor && state.actor.role !== "guest"
      ? { user: state.actor }
      : { response: json(401, "UNAUTHENTICATED") },
  notFound: () => json(404, "NOT_FOUND"),
  badRequest: (message: string) => json(400, "VALIDATION", message),
}));

vi.mock("@/modules/publishing", () => ({
  findPublishedPageByProject: (...args: unknown[]) =>
    findPublishedPageByProject(...args),
  publishAndMarkLive: (...args: unknown[]) => publishAndMarkLive(...args),
  unpublishAndSuspend: (...args: unknown[]) => unpublishAndSuspend(...args),
  toPublishedPage: (page: unknown) => page,
}));

function json(status: number, code: string, message = code) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const { PATCH } = await import("@/app/api/projects/[id]/route");
const pagesRoute = await import("@/app/api/projects/[id]/pages/route");
const publishRoute = await import("@/app/api/projects/[id]/publish/route");

function request(body: Rec) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

function seedProject(id: string, overrides: Rec = {}) {
  state.records.projects[id] = {
    id,
    client_label: "Kopi Senja",
    status: "PICKED",
    created: "2026-11-03T00:00:00.000Z",
    updated: "2026-11-03T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  state.records = { projects: {} };
  state.actor = null;
  vi.clearAllMocks();
  getRecord.mockImplementation(async (collection: string, id: string) => {
    const record = state.records[collection]?.[id];
    if (!record) throw new Error("not found");
    return record;
  });
  listRecords.mockResolvedValue({
    page: 1,
    perPage: 100,
    totalItems: 0,
    totalPages: 1,
    items: [],
  });
  updateRecord.mockImplementation(
    async (collection: string, id: string, body: Rec) => {
      const record = state.records[collection]?.[id];
      if (!record) throw new Error("not found");
      Object.assign(record, body);
      return record;
    },
  );
});

describe("PATCH /api/projects/[id] status security", () => {
  it("rejects a guest trying to self-mark PAID", async () => {
    seedProject("p_guest", {
      guest_session_id: "g1",
      status: "PICKED",
    });
    state.actor = { id: "guest:g1", role: "guest", guestId: "g1" };

    const response = await PATCH(request({ status: "PAID" }), {
      params: Promise.resolve({ id: "p_guest" }),
    });

    expect(response!.status).toBe(409);
    expect(state.records.projects.p_guest.status).toBe("PICKED");
  });

  it("rejects a user trying to self-mark DEPLOYED or ACTIVE", async () => {
    seedProject("p_user", { user_id: "u1", status: "PICKED" });
    state.actor = { id: "u1", role: "user" };

    for (const status of ["DEPLOYED", "ACTIVE"]) {
      const response = await PATCH(request({ status }), {
        params: Promise.resolve({ id: "p_user" }),
      });
      expect(response!.status).toBe(409);
      expect(state.records.projects.p_user.status).toBe("PICKED");
    }
  });

  it("still allows legitimate non-publish lifecycle transitions", async () => {
    seedProject("p_template", { user_id: "u1", status: "COMPREHENDED" });
    state.actor = { id: "u1", role: "user" };

    const response = await PATCH(request({ status: "TEMPLATE_CHOSEN" }), {
      params: Promise.resolve({ id: "p_template" }),
    });

    expect(response!.status).toBe(200);
    expect(state.records.projects.p_template.status).toBe("TEMPLATE_CHOSEN");
  });
});

describe("POST /api/projects/[id]/publish auth", () => {
  it("rejects a guest before entering the publish use case", async () => {
    seedProject("p_guest_publish", {
      guest_session_id: "g1",
      status: "PAID",
    });
    state.actor = { id: "guest:g1", role: "guest", guestId: "g1" };

    const response = await publishRoute.POST(
      { headers: new Headers() } as unknown as NextRequest,
      { params: Promise.resolve({ id: "p_guest_publish" }) },
    );

    expect(response.status).toBe(401);
    expect(publishAndMarkLive).not.toHaveBeenCalled();
  });
});

describe("GET /api/projects/[id]/pages read behavior", () => {
  it("fails closed on a page-list read error and never creates Home", async () => {
    seedProject("p_read", { user_id: "u1", status: "PICKED" });
    state.actor = { id: "u1", role: "user" };
    listRecords.mockRejectedValueOnce(new Error("page read failed"));
    createRecord.mockResolvedValue({ id: "page_new" });

    const response = await pagesRoute.GET(
      {} as unknown as NextRequest,
      { params: Promise.resolve({ id: "p_read" }) },
    );

    expect(response!.status).toBe(502);
    expect(createRecord).not.toHaveBeenCalled();
  });
});
