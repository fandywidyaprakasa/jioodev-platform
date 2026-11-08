import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import {
  checkQrisCharge,
  createQrisCharge,
  mapQrisStatus,
  refundQrisCharge,
} from "../infrastructure/qris";
import { logActivity } from "@/modules/activity";
import { createNotification } from "@/modules/account";
import { getSetting } from "@/shared/infrastructure/settings";
import { requestDeployment } from "@/modules/publishing";
import type { Payment, PaymentStatus } from "@/shared/types";

interface PbPayment {
  id: string;
  project_id?: string;
  user_id?: string;
  package_id?: string;
  amount?: number;
  invoice_no?: string;
  method?: string;
  provider?: string;
  charge_id?: string;
  reference?: string;
  qr_string?: string;
  expires_at?: string;
  paid_at?: string;
  raw_response?: unknown;
  status?: string;
  created: string;
}

interface PbProject {
  id: string;
  user_id?: string;
  product_type?: "LAND" | "WEB" | "COMM";
  status?: string;
}

interface PbPackage {
  id: string;
  price?: number;
  name?: string;
  tier?: "FREE" | "PRO" | "AGENCY" | "ADDON";
  is_active?: boolean;
  deploy_included?: number;
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

const PAYMENT_STATUS: Record<string, PaymentStatus> = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

const DEFAULT_AMOUNT: Record<string, number> = {
  LAND: 349000,
  WEB: 899000,
  COMM: 1499000,
};

export function toPayment(item: PbPayment): Payment {
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

export async function findPayment(id: string) {
  return await getRecord<PbPayment>("payments", id).catch(() => null);
}

export async function findPaymentByChargeId(chargeId: string) {
  const data = await listRecords<PbPayment>("payments", {
    filter: `charge_id='${escapeFilter(chargeId)}'`,
    sort: "-created",
    perPage: 1,
  });
  return data.items[0] ?? null;
}

export async function applyQrisCallback(input: {
  chargeId: string;
  status?: string;
}): Promise<Payment | null> {
  const payment = await findPaymentByChargeId(input.chargeId).catch(
    () => null,
  );
  if (!payment) return null;

  const mapped = mapQrisStatus(input.status);
  if (mapped === "CONFIRMED") {
    return await confirmPayment(payment.id);
  }
  if (
    (mapped === "FAILED" || mapped === "EXPIRED") &&
    payment.status === "PENDING"
  ) {
    const updated = await updateRecord<PbPayment>("payments", payment.id, {
      status: "FAILED",
    });
    return toPayment(updated);
  }
  return toPayment(payment);
}

export async function getLatestProjectPayment(projectId: string) {
  const data = await listRecords<PbPayment>("payments", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 1,
  });
  return data.items[0] ? toPayment(data.items[0]) : null;
}

export async function getProjectPayment(
  projectId: string,
): Promise<Payment | null> {
  return getLatestProjectPayment(projectId).catch(() => null);
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

export async function getPaymentForUser(
  id: string,
  userId: string,
  isAdmin: boolean,
) {
  const payment = await findPayment(id);
  if (!payment) return null;
  if (isAdmin) return toPayment(payment);
  if (payment.user_id === userId) return toPayment(payment);
  return null;
}

export async function ensureProjectPayment(
  projectId: string,
  userId: string,
  packageId?: string,
): Promise<Payment | null> {
  const project = await getRecord<PbProject>("projects", projectId).catch(
    () => null,
  );
  if (!project) return null;
  if (project.user_id && project.user_id !== userId) return null;

  const existing = await getLatestProjectPayment(projectId);
  if (existing) {
    if (existing.status === "CONFIRMED") return existing;
    if (
      existing.status === "PENDING" &&
      new Date(existing.expiresAt).getTime() > Date.now()
    ) {
      return existing;
    }
  }

  let amount = DEFAULT_AMOUNT[project.product_type ?? "LAND"] ?? 349000;
  if (packageId) {
    const pkg = await getRecord<PbPackage>("packages", packageId).catch(
      () => null,
    );
    if (!pkg || pkg.is_active === false) return null;
    if (typeof pkg.price === "number") amount = pkg.price;
  }

  const invoiceNo = `INV-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const reference = `JIOO-${projectId.slice(0, 8)}-${Date.now()}`;
  const charge = await createQrisCharge({
    amount,
    reference,
    description: `JiooDev project ${projectId}`,
  });

  const record = await createRecord<PbPayment>("payments", {
    project_id: projectId,
    user_id: userId,
    ...(packageId ? { package_id: packageId } : {}),
    amount,
    invoice_no: invoiceNo,
    method: charge.provider === "manual" ? "manual" : "gateway",
    provider: charge.provider,
    charge_id: charge.chargeId,
    reference: charge.reference,
    qr_string: charge.qrString,
    expires_at: charge.expiresAt,
    raw_response: charge.rawResponse ?? null,
    status: "PENDING",
  });

  await updateRecord<PbProject>("projects", projectId, {
    payment_id: record.id,
  }).catch(() => undefined);

  await logActivity({
    userId,
    actor: "user",
    action: "payment.create",
    entityType: "payment",
    entityId: record.id,
  });

  return toPayment(record);
}

export async function refreshPayment(id: string): Promise<Payment | null> {
  const payment = await findPayment(id);
  if (!payment) return null;
  if (payment.status !== "PENDING" || !payment.charge_id) {
    return toPayment(payment);
  }

  const status = await checkQrisCharge(payment.charge_id).catch(() => null);
  if (status === "CONFIRMED") {
    return await confirmPayment(id);
  }
  if (status === "FAILED" || status === "EXPIRED") {
    const updated = await updateRecord<PbPayment>("payments", id, {
      status: "FAILED",
    });
    return toPayment(updated);
  }
  return toPayment(payment);
}

export async function refundPayment(id: string, actorEmail?: string) {
  const payment = await findPayment(id);
  if (!payment) return null;
  if (payment.status === "REFUNDED") return toPayment(payment);
  if (payment.status !== "CONFIRMED") return null;
  if (payment.charge_id) {
    const ok = await refundQrisCharge(
      payment.charge_id,
      payment.amount ?? 0,
    ).catch(() => false);
    if (!ok) return null;
  }
  const updated = await updateRecord<PbPayment>("payments", id, {
    status: "REFUNDED",
  });

  if (payment.project_id) {
    const project = await getRecord<PbProject>("projects", payment.project_id)
      .catch(() => null);
    await restoreQuota(
      project?.user_id ?? payment.user_id,
      project?.product_type,
    );
    if (project?.status === "PAID") {
      await updateRecord<PbProject>("projects", project.id, {
        status: "PICKED",
      }).catch(() => undefined);
    }
  } else {
    await restoreQuota(payment.user_id, undefined);
  }

  await logActivity({
    userId: payment.user_id,
    actor: actorEmail ?? "admin",
    action: "payment.refund",
    entityType: "payment",
    entityId: id,
  });
  if (payment.user_id) {
    await createNotification({
      userId: payment.user_id,
      type: "payment",
      title: "Pembayaran direfund",
      body: `Pembayaran ${payment.invoice_no ?? id} telah direfund.`,
      link: payment.project_id
        ? `/app/projects/${payment.project_id}/payment`
        : "/app/account/invoices",
    });
  }
  return toPayment(updated);
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

// Multi-server note: the in-memory map below only deduplicates within one instance.
// For true cross-instance idempotency, store an idempotency key on the payment record
// (e.g. payments.idempotency_key, unique index) and check it before confirming.
// That schema change requires explicit approval before deploy.
const confirmInFlight = new Map<string, Promise<Payment | null>>();

export function confirmPayment(
  id: string,
  actorId?: string,
  idempotencyKey?: string,
): Promise<Payment | null> {
  const key = idempotencyKey ?? `${id}:${actorId ?? "system"}`;
  const pending = confirmInFlight.get(key);
  if (pending) return pending;
  const task = confirmPaymentOnce(id, actorId, key).finally(() => {
    confirmInFlight.delete(key);
  });
  confirmInFlight.set(key, task);
  return task;
}

async function confirmPaymentOnce(
  id: string,
  actorId?: string,
  idempotencyKey?: string,
): Promise<Payment | null> {
  const payment = await getRecord<PbPayment>("payments", id).catch(() => null);
  if (!payment) return null;
  if (payment.status !== "PENDING") return toPayment(payment);

  // Cross-instance idempotency guard (best-effort without schema change):
  // if a previous confirm already recorded this key, treat as already confirmed.
  const existingKey =
    payment.raw_response && typeof payment.raw_response === "object"
      ? (payment.raw_response as { idempotency_key?: unknown }).idempotency_key
      : null;
  if (existingKey && idempotencyKey && existingKey === idempotencyKey) {
    return toPayment(payment);
  }

  const now = new Date().toISOString();
  const updated = await updateRecord<PbPayment>("payments", id, {
    status: "CONFIRMED",
    paid_at: now,
    confirmed_at: now,
    ...(actorId ? { confirmed_by: actorId } : {}),
    raw_response: {
      ...(payment.raw_response && typeof payment.raw_response === "object"
        ? (payment.raw_response as Record<string, unknown>)
        : {}),
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    },
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
