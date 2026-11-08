import { beforeEach, describe, expect, it, vi } from "vitest";

const { store } = vi.hoisted(() => {
  const store: Record<string, Record<string, Record<string, unknown>>> = {
    payments: {},
    projects: {},
    subscriptions: {},
    notifications: {},
    activity_log: {},
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
        let items = Object.values(store[collection] ?? {}).filter((item) =>
          matches(item, params.filter ?? ""),
        );
        if (params.sort?.startsWith("-")) {
          const field = params.sort.slice(1);
          items = [...items].sort((a, b) =>
            String(b[field] ?? "").localeCompare(String(a[field] ?? "")),
          );
        }
        const totalItems = items.length;
        if (params.perPage) items = items.slice(0, params.perPage);
        return { page: 1, perPage: params.perPage ?? 100, totalItems, totalPages: 1, items };
      },
    ),
    createRecord: vi.fn(async (collection: string, body: Record<string, unknown>) => {
      const record = {
        id: `${collection}_${++seq}`,
        created: new Date().toISOString(),
        ...body,
      };
      store[collection] ??= {};
      store[collection][record.id] = record;
      return record;
    }),
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

vi.mock("@/modules/payments/infrastructure/qris", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/payments/infrastructure/qris")>();
  return {
    ...actual,
    createQrisCharge: vi.fn(),
    checkQrisCharge: vi.fn(),
    refundQrisCharge: vi.fn(async () => true),
    qrisConfigured: vi.fn(() => true),
  };
});

vi.mock("@/modules/activity", () => ({
  logActivity: vi.fn(async () => undefined),
}));

vi.mock("@/modules/account", () => ({
  createNotification: vi.fn(async () => undefined),
}));

import { confirmPayment } from "@/modules/payments";
import {
  applyQrisCallback,
  ensureProjectPayment,
  refundPayment,
  refreshPayment,
  toPayment,
} from "@/modules/payments";
import { checkQrisCharge } from "@/modules/payments";

function reset() {
  for (const collection of Object.keys(store)) {
    store[collection] = {};
  }
}

beforeEach(() => {
  reset();
  vi.mocked(checkQrisCharge).mockReset();
});

describe("payment mapping", () => {
  it("keeps invoice number and status", () => {
    const payment = toPayment({
      id: "pay_1",
      project_id: "proj_1",
      amount: 899000,
      invoice_no: "INV-1",
      status: "CONFIRMED",
      created: "2026-11-03T00:00:00.000Z",
    });

    expect(payment.invoiceNo).toBe("INV-1");
    expect(payment.status).toBe("CONFIRMED");
  });
});

describe("ensureProjectPayment", () => {
  it("rejects an inactive package server-side", async () => {
    store.projects.proj_pkg = {
      id: "proj_pkg",
      user_id: "user_1",
      product_type: "WEB",
      status: "PICKED",
    };
    store.packages = {
      pkg_off: { id: "pkg_off", price: 1000, is_active: false },
    };

    const payment = await ensureProjectPayment("proj_pkg", "user_1", "pkg_off");

    expect(payment).toBeNull();
  });
});

describe("refreshPayment", () => {
  it("stores provider expiry as FAILED instead of an unsupported status", async () => {
    store.payments.pay_exp = {
      id: "pay_exp",
      project_id: "proj_1",
      status: "PENDING",
      charge_id: "charge_1",
      created: "2026-11-03T00:00:00.000Z",
      expires_at: "2026-11-03T01:00:00.000Z",
    };
    vi.mocked(checkQrisCharge).mockResolvedValue("EXPIRED");

    const payment = await refreshPayment("pay_exp");

    expect(payment?.status).toBe("FAILED");
    expect(store.payments.pay_exp.status).toBe("FAILED");
  });
});

describe("applyQrisCallback", () => {
  it("confirms a matching pending payment and ignores duplicates", async () => {
    store.payments.pay_hook = {
      id: "pay_hook",
      project_id: "proj_hook",
      user_id: "user_1",
      charge_id: "ch_hook",
      status: "PENDING",
      created: "2026-11-03T00:00:00.000Z",
    };
    store.projects.proj_hook = {
      id: "proj_hook",
      user_id: "user_1",
      product_type: "LAND",
      status: "PICKED",
    };

    const first = await applyQrisCallback({
      chargeId: "ch_hook",
      status: "paid",
    });
    const second = await applyQrisCallback({
      chargeId: "ch_hook",
      status: "settled",
    });

    expect(first?.status).toBe("CONFIRMED");
    expect(second?.status).toBe("CONFIRMED");
    expect(store.payments.pay_hook.status).toBe("CONFIRMED");
    expect(Object.values(store.subscriptions)).toHaveLength(1);
  });

  it("marks pending payment as failed on expired callback", async () => {
    store.payments.pay_expired = {
      id: "pay_expired",
      project_id: "proj_1",
      charge_id: "ch_expired",
      status: "PENDING",
      created: "2026-11-03T00:00:00.000Z",
    };

    const payment = await applyQrisCallback({
      chargeId: "ch_expired",
      status: "expired",
    });

    expect(payment?.status).toBe("FAILED");
    expect(store.payments.pay_expired.status).toBe("FAILED");
  });
});

describe("confirmPayment", () => {
  it("is idempotent and does not bump quota twice", async () => {
    store.payments.pay_ok = {
      id: "pay_ok",
      project_id: "proj_1",
      user_id: "user_1",
      status: "PENDING",
      created: "2026-11-03T00:00:00.000Z",
    };
    store.projects.proj_1 = {
      id: "proj_1",
      user_id: "user_1",
      product_type: "WEB",
      status: "PICKED",
    };

    await confirmPayment("pay_ok");
    await confirmPayment("pay_ok");

    const subs = Object.values(store.subscriptions);
    expect(subs).toHaveLength(1);
    expect(subs[0].quota_web_used).toBe(1);
  });
});

describe("refundPayment", () => {
  it("restores quota, returns project to PICKED, and is idempotent", async () => {
    store.payments.pay_refund = {
      id: "pay_refund",
      project_id: "proj_1",
      user_id: "user_1",
      invoice_no: "INV-2",
      status: "CONFIRMED",
      created: "2026-11-03T00:00:00.000Z",
    };
    store.projects.proj_1 = {
      id: "proj_1",
      user_id: "user_1",
      product_type: "WEB",
      status: "PAID",
    };
    store.subscriptions.sub_1 = {
      id: "sub_1",
      user_id: "user_1",
      quota_web_total: 1,
      quota_web_used: 1,
      quota_landing_total: 0,
      quota_landing_used: 0,
      status: "EXHAUSTED",
      created: "2026-11-03T00:00:00.000Z",
    };

    const refunded = await refundPayment("pay_refund");
    await refundPayment("pay_refund");

    expect(refunded?.status).toBe("REFUNDED");
    expect(store.projects.proj_1.status).toBe("PICKED");
    expect(store.subscriptions.sub_1.quota_web_used).toBe(0);
    expect(store.subscriptions.sub_1.status).toBe("ACTIVE");
  });
});
