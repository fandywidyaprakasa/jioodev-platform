import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "./pb-platform";
import { confirmPayment, restoreQuota } from "./admin-server";
import { checkQrisCharge, createQrisCharge, mapQrisStatus } from "./qris";
import { logActivity } from "./activity-server";
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
  is_active?: boolean;
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
    const { refundQrisCharge } = await import("./qris");
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
    const { createNotification } = await import("./notifications-server");
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
