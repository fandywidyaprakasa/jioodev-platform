import {
  createRecord,
  deleteRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "./pb-platform";
import { requestDeployment } from "./deploy-server";
import { getSetting } from "./settings-server";
import type {
  AdminStats,
  Package,
  Payment,
  PaymentStatus,
} from "@/shared/types";

interface PbPackage {
  id: string;
  name?: string;
  tier?: "FREE" | "PRO" | "AGENCY" | "ADDON";
  billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY";
  duration_months?: number;
  price?: number;
  max_sections?: number;
  js_allowed?: boolean;
  cms?: boolean;
  custom_domain?: boolean;
  deploy_included?: number;
  valid_from?: string;
  valid_until?: string;
  status?: "ACTIVE" | "EXPIRED" | "DRAFT";
  features?: string[];
  is_active?: boolean;
  sort_order?: number;
}

interface PbPayment {
  id: string;
  project_id?: string;
  user_id?: string;
  package_id?: string;
  amount?: number;
  invoice_no?: string;
  qr_string?: string;
  expires_at?: string;
  paid_at?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  status?: string;
  created: string;
}

interface PbProject {
  id: string;
  user_id?: string;
  product_type?: "LAND" | "WEB" | "COMM";
  status?: string;
}

interface PbSubscription {
  id: string;
  user_id?: string;
  quota_landing_total?: number;
  quota_landing_used?: number;
  quota_web_total?: number;
  quota_web_used?: number;
  status?: string;
}

export async function listPackages(): Promise<Package[]> {
  const data = await listRecords<PbPackage>("packages", {
    sort: "sort_order",
    perPage: 100,
  });
  return data.items.map((item) => ({
    id: item.id,
    name: item.name ?? "Paket",
    tier: item.tier ?? "FREE",
    billing_type: item.billing_type ?? "FREE",
    price: item.price ?? 0,
    max_sections: item.max_sections ?? 5,
    js_allowed: item.js_allowed ?? false,
    cms: item.cms ?? false,
    custom_domain: item.custom_domain ?? false,
    deploy_included: item.deploy_included ?? 0,
    valid_from: item.valid_from,
    valid_until: item.valid_until,
    status: item.status ?? "DRAFT",
    active: item.is_active !== false,
  }));
}

export async function createPackage(input: {
  name: string;
  tier?: "FREE" | "PRO" | "AGENCY" | "ADDON";
  billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY";
  duration_months?: number;
  price?: number;
  max_sections?: number;
  js_allowed?: boolean;
  cms?: boolean;
  custom_domain?: boolean;
  deploy_included?: number;
  valid_from?: string;
  valid_until?: string;
}) {
  const record = await createRecord<PbPackage>("packages", {
    name: input.name,
    tier: input.tier ?? "FREE",
    billing_type: input.billing_type ?? "FREE",
    duration_months: input.duration_months ?? 1,
    price: input.price ?? 0,
    max_sections: input.max_sections ?? 5,
    js_allowed: input.js_allowed ?? false,
    cms: input.cms ?? false,
    custom_domain: input.custom_domain ?? false,
    deploy_included: input.deploy_included ?? 0,
    valid_from: input.valid_from ?? new Date().toISOString().split('T')[0],
    valid_until: input.valid_until ?? null,
    status: "ACTIVE",
    is_active: true,
    sort_order: Date.now(),
  });
  return {
    id: record.id,
    name: record.name ?? input.name,
    tier: record.tier ?? "FREE",
    billing_type: record.billing_type ?? "FREE",
    price: record.price ?? 0,
    max_sections: record.max_sections ?? 5,
    js_allowed: record.js_allowed ?? false,
    cms: record.cms ?? false,
    custom_domain: record.custom_domain ?? false,
    deploy_included: record.deploy_included ?? 0,
    valid_from: record.valid_from,
    valid_until: record.valid_until,
    status: record.status ?? "ACTIVE",
    active: true,
  } satisfies Package;
}

export async function updatePackage(
  id: string,
  patch: {
    name?: string;
    tier?: "FREE" | "PRO" | "AGENCY" | "ADDON";
    billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY";
    price?: number;
    max_sections?: number;
    js_allowed?: boolean;
    cms?: boolean;
    custom_domain?: boolean;
    deploy_included?: number;
    valid_from?: string;
    valid_until?: string;
    status?: "ACTIVE" | "EXPIRED" | "DRAFT";
    active?: boolean;
  },
) {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.tier !== undefined) payload.tier = patch.tier;
  if (patch.billing_type !== undefined) payload.billing_type = patch.billing_type;
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.max_sections !== undefined) payload.max_sections = patch.max_sections;
  if (patch.js_allowed !== undefined) payload.js_allowed = patch.js_allowed;
  if (patch.cms !== undefined) payload.cms = patch.cms;
  if (patch.custom_domain !== undefined) payload.custom_domain = patch.custom_domain;
  if (patch.deploy_included !== undefined) payload.deploy_included = patch.deploy_included;
  if (patch.valid_from !== undefined) payload.valid_from = patch.valid_from;
  if (patch.valid_until !== undefined) payload.valid_until = patch.valid_until;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.active !== undefined) payload.is_active = patch.active;
  const record = await updateRecord<PbPackage>("packages", id, payload);
  return {
    id: record.id,
    name: record.name ?? "Paket",
    tier: record.tier ?? "FREE",
    billing_type: record.billing_type ?? "FREE",
    price: record.price ?? 0,
    max_sections: record.max_sections ?? 5,
    js_allowed: record.js_allowed ?? false,
    cms: record.cms ?? false,
    custom_domain: record.custom_domain ?? false,
    deploy_included: record.deploy_included ?? 0,
    valid_from: record.valid_from,
    valid_until: record.valid_until,
    status: record.status ?? "ACTIVE",
    active: record.is_active !== false,
  } satisfies Package;
}

export async function deletePackage(id: string) {
  await deleteRecord("packages", id);
}

const PAYMENT_STATUS: Record<string, PaymentStatus> = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

function toPayment(item: PbPayment): Payment {
  return {
    id: item.id,
    projectId: item.project_id ?? "",
    amount: item.amount ?? 0,
    status: PAYMENT_STATUS[item.status ?? "PENDING"] ?? "PENDING",
    qrString: item.qr_string ?? "",
    expiresAt: item.expires_at ?? item.created,
    createdAt: item.created,
    invoiceNo: item.invoice_no,
  };
}

export async function getProjectPayment(
  projectId: string,
): Promise<Payment | null> {
  const data = await listRecords<PbPayment>("payments", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 1,
  });
  const item = data.items[0];
  return item ? toPayment(item) : null;
}

export async function listPendingPayments(): Promise<Payment[]> {
  const data = await listRecords<PbPayment>("payments", {
    filter: "status='PENDING'",
    sort: "-created",
    perPage: 100,
  });
  return data.items.map(toPayment);
}

export async function listPayments(): Promise<Payment[]> {
  const data = await listRecords<PbPayment>("payments", {
    sort: "-created",
    perPage: 100,
  });
  return data.items.map(toPayment);
}

async function bumpQuota(
  userId: string | undefined,
  productType: string | undefined,
  packageId?: string,
) {
  if (!userId) return;
  const data = await listRecords<PbSubscription>("subscriptions", {
    filter: `user_id='${escapeFilter(userId)}' && status='ACTIVE'`,
    sort: "-period_end",
    perPage: 1,
  });
  let sub = data.items[0];

  if (!sub) {
    let landing = productType === "LAND" ? 1 : 0;
    let web = productType === "LAND" ? 0 : 1;
    if (packageId) {
      const pkg = await getRecord<PbPackage>("packages", packageId).catch(
        () => null,
      );
      if (pkg) {
        landing = pkg.deploy_included ?? (pkg.tier === "AGENCY" ? 50 : pkg.tier === "PRO" ? 5 : 1);
        web = pkg.deploy_included ?? (pkg.tier === "AGENCY" ? 50 : pkg.tier === "PRO" ? 5 : 0);
      }
    }
    const now = new Date();
    sub = await createRecord<PbSubscription>("subscriptions", {
      user_id: userId,
      ...(packageId ? { package_id: packageId } : {}),
      period_start: now.toISOString(),
      period_end: new Date(
        now.getTime() + 30 * 24 * 3600 * 1000,
      ).toISOString(),
      quota_landing_total: landing,
      quota_landing_used: 0,
      quota_web_total: web,
      quota_web_used: 0,
      status: "ACTIVE",
    });
  }

  const patch: Record<string, number | string> = {};
  const field =
    productType === "LAND" ? "quota_landing_used" : "quota_web_used";
  const totalField =
    productType === "LAND" ? "quota_landing_total" : "quota_web_total";
  const used = ((sub[field as keyof PbSubscription] as number) ?? 0) + 1;
  const total = (sub[totalField as keyof PbSubscription] as number) ?? 0;
  patch[field] = used;

  const otherUsed =
    field === "quota_landing_used"
      ? sub.quota_web_used ?? 0
      : sub.quota_landing_used ?? 0;
  const otherTotal =
    field === "quota_landing_used"
      ? sub.quota_web_total ?? 0
      : sub.quota_landing_total ?? 0;
  if (used + otherUsed >= total + otherTotal) patch.status = "EXHAUSTED";

  await updateRecord<PbSubscription>("subscriptions", sub.id, patch);
}

export async function restoreQuota(
  userId: string | undefined,
  productType: string | undefined,
) {
  if (!userId) return;
  const data = await listRecords<PbSubscription>("subscriptions", {
    filter: `user_id='${escapeFilter(userId)}'`,
    sort: "-period_end",
    perPage: 1,
  });
  const sub = data.items[0];
  if (!sub) return;

  const field =
    productType === "LAND" ? "quota_landing_used" : "quota_web_used";
  const totalField =
    productType === "LAND" ? "quota_landing_total" : "quota_web_total";
  const used = Math.max(
    0,
    ((sub[field as keyof PbSubscription] as number) ?? 0) - 1,
  );
  const total = (sub[totalField as keyof PbSubscription] as number) ?? 0;
  const otherUsed =
    field === "quota_landing_used"
      ? sub.quota_web_used ?? 0
      : sub.quota_landing_used ?? 0;
  const otherTotal =
    field === "quota_landing_used"
      ? sub.quota_web_total ?? 0
      : sub.quota_landing_total ?? 0;

  const patch: Record<string, number | string> = { [field]: used };
  if (sub.status === "EXHAUSTED" && used + otherUsed < total + otherTotal) {
    patch.status = "ACTIVE";
  }
  await updateRecord<PbSubscription>("subscriptions", sub.id, patch);
}

const confirmInFlight = new Map<string, Promise<Payment | null>>();

export function confirmPayment(
  id: string,
  actorId?: string,
): Promise<Payment | null> {
  const pending = confirmInFlight.get(id);
  if (pending) return pending;
  const task = confirmPaymentOnce(id, actorId).finally(() => {
    confirmInFlight.delete(id);
  });
  confirmInFlight.set(id, task);
  return task;
}

async function confirmPaymentOnce(
  id: string,
  actorId?: string,
): Promise<Payment | null> {
  const payment = await getRecord<PbPayment>("payments", id).catch(() => null);
  if (!payment) return null;
  if (payment.status !== "PENDING") return toPayment(payment);

  const now = new Date().toISOString();
  const updated = await updateRecord<PbPayment>("payments", id, {
    status: "CONFIRMED",
    paid_at: now,
    confirmed_at: now,
    ...(actorId ? { confirmed_by: actorId } : {}),
  });

  if (payment.project_id) {
    const project = await getRecord<PbProject>("projects", payment.project_id).catch(
      () => null,
    );
    if (project && (project.status === "PICKED" || !project.status)) {
      await updateRecord<PbProject>("projects", project.id, {
        status: "PAID",
        payment_id: id,
      });
    }
    await bumpQuota(
      project?.user_id ?? payment.user_id,
      project?.product_type,
      payment.package_id,
    );
    if (project) {
      const autoDeploy = await getSetting<boolean>("autoDeploy", false).catch(
        () => false,
      );
      if (autoDeploy) {
        await requestDeployment(project.id).catch(() => null);
      }
    }
  }

  if (updated.user_id) {
    await createRecord("notifications", {
      user_id: updated.user_id,
      type: "payment",
      title: "Pembayaran dikonfirmasi",
      body: `Pembayaran ${updated.id} telah dikonfirmasi.`,
      link: payment.project_id ? `/app/projects/${payment.project_id}` : "/app",
      channel: "inapp",
      read: false,
    }).catch(() => undefined);
  }

  return toPayment(updated);
}

export async function adminStats(): Promise<AdminStats> {
  const [projects, pending, live, activeSubs] = await Promise.all([
    listRecords<PbProject>("projects", { perPage: 1 }),
    listRecords<PbPayment>("payments", { filter: "status='PENDING'", perPage: 1 }),
    listRecords("deployments", { filter: "status='LIVE'", perPage: 1 }),
    listRecords<PbSubscription>("subscriptions", {
      filter: "status='ACTIVE'",
      perPage: 1,
    }),
  ]);

  return {
    projects: projects.totalItems,
    pendingPayments: pending.totalItems,
    liveDeployments: live.totalItems,
    activeUsers: activeSubs.totalItems,
  };
}
