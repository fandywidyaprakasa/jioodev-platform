import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import type {
  ActivityItem,
  Invoice,
  Notification,
  Subscription,
} from "@/shared/types";

interface PbNotification {
  id: string;
  title?: string;
  body?: string;
  link?: string;
  read?: boolean;
  created: string;
}

interface PbPayment {
  id: string;
  invoice_no?: string;
  amount?: number;
  status?: string;
  created: string;
}

interface PbSubscription {
  id: string;
  package_id?: string;
  period_end?: string;
  quota_landing_total?: number;
  quota_landing_used?: number;
  quota_web_total?: number;
  quota_web_used?: number;
  status?: string;
}

interface PbActivity {
  id: string;
  actor?: string;
  action?: string;
  created: string;
}

interface PbUserProfile {
  id: string;
  user_id?: string;
  name?: string;
  phone?: string;
  company?: string;
  locale?: string;
  timezone?: string;
  notifications_pref?: Record<string, unknown>;
}

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  locale: string;
  timezone: string;
  notificationsPref?: Record<string, boolean>;
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const data = await listRecords<PbNotification>("notifications", {
    filter: `user_id='${escapeFilter(userId)}'`,
    sort: "-created",
    perPage: 100,
  });
  return data.items.map((item) => ({
    id: item.id,
    title: item.title ?? "Notifikasi",
    body: item.body ?? "",
    read: item.read === true,
    createdAt: item.created,
  }));
}

export async function markNotificationRead(userId: string, id: string) {
  const data = await listRecords<PbNotification>("notifications", {
    filter: `id='${escapeFilter(id)}' && user_id='${escapeFilter(userId)}'`,
    perPage: 1,
  });
  const item = data.items[0];
  if (!item) return null;
  await updateRecord<PbNotification>("notifications", item.id, { read: true });
  return {
    id: item.id,
    title: item.title ?? "Notifikasi",
    body: item.body ?? "",
    read: true,
    createdAt: item.created,
  } satisfies Notification;
}

const INVOICE_STATUS: Record<string, Invoice["status"]> = {
  PENDING: "PENDING",
  CONFIRMED: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

export async function listInvoices(userId: string): Promise<Invoice[]> {
  const data = await listRecords<PbPayment>("payments", {
    filter: `user_id='${escapeFilter(userId)}'`,
    sort: "-created",
    perPage: 100,
  });
  return data.items.map((item) => ({
    id: item.id,
    invoiceNo: item.invoice_no,
    amount: item.amount ?? 0,
    status: INVOICE_STATUS[item.status ?? "PENDING"] ?? "PENDING",
    issuedAt: item.created,
  }));
}

export async function listActivity(userId: string): Promise<ActivityItem[]> {
  const data = await listRecords<PbActivity>("activity_log", {
    filter: `user_id='${escapeFilter(userId)}'`,
    sort: "-created",
    perPage: 100,
  });
  return data.items.map((item) => ({
    id: item.id,
    actor: item.actor ?? "system",
    action: item.action ?? "",
    createdAt: item.created,
  }));
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const data = await listRecords<PbSubscription>("subscriptions", {
    filter: `user_id='${escapeFilter(userId)}'`,
    sort: "-period_end",
    perPage: 1,
  });
  const item = data.items[0];
  if (!item) return null;

  let plan = "Paket";
  if (item.package_id) {
    try {
      const pkg = await getRecord<{ name?: string }>("packages", item.package_id);
      plan = pkg.name ?? plan;
    } catch {
      plan = item.package_id;
    }
  }

  const used =
    (item.quota_landing_used ?? 0) + (item.quota_web_used ?? 0);
  const total =
    (item.quota_landing_total ?? 0) + (item.quota_web_total ?? 0);

  return {
    plan,
    status:
      item.status === "EXPIRED"
        ? "EXPIRED"
        : item.status === "EXHAUSTED" || (total > 0 && used >= total)
          ? "EXHAUSTED"
          : "ACTIVE",
    quotaUsed: used,
    quotaTotal: total,
    renewAt: item.period_end ?? new Date().toISOString(),
  };
}

export async function getAccountProfile(
  userId: string,
): Promise<PbUserProfile | null> {
  const data = await listRecords<PbUserProfile>("user_profiles", {
    filter: `user_id='${escapeFilter(userId)}'`,
    perPage: 1,
  });
  return data.items[0] ?? null;
}

export async function saveAccountProfile(
  userId: string,
  patch: Partial<AccountProfile>,
) {
  const existing = await getAccountProfile(userId);
  const payload = {
    user_id: userId,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.company !== undefined ? { company: patch.company } : {}),
    ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
    ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
    ...(patch.notificationsPref !== undefined
      ? { notifications_pref: patch.notificationsPref }
      : {}),
  };
  if (existing) {
    return await updateRecord<PbUserProfile>("user_profiles", existing.id, payload);
  }
  return await createRecord<PbUserProfile>("user_profiles", payload);
}

export async function getNotificationPrefs(
  userId: string,
): Promise<Record<string, boolean>> {
  const profile = await getAccountProfile(userId).catch(() => null);
  return (profile?.notifications_pref as Record<string, boolean>) ?? {
    email: true,
    preview: true,
    product: false,
  };
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: Record<string, boolean>,
) {
  return await saveAccountProfile(userId, { notificationsPref: prefs });
}
