import {
  createRecord,
  deleteRecord,
  escapeFilter,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import { logActivity } from "@/modules/activity";

interface PbUser {
  id: string;
  email?: string;
  name?: string;
}

interface PbSubscription {
  id: string;
  user_id?: string;
  package_id?: string;
  period_start?: string;
  period_end?: string;
  quota_landing_total?: number;
  quota_landing_used?: number;
  quota_web_total?: number;
  quota_web_used?: number;
  status?: string;
}

interface PbPackage {
  id: string;
  name?: string;
  deploy_included?: number;
  tier?: string;
  billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
}

export interface UserWithSubscription {
  id: string;
  email: string;
  name: string;
  subscription: {
    id: string;
    package_id: string;
    package_name?: string;
    period_start: string;
    period_end: string | null;
    quota_landing_total: number;
    quota_landing_used: number;
    quota_web_total: number;
    quota_web_used: number;
    status: string;
  } | null;
}

export async function listUsersWithSubscriptions(): Promise<UserWithSubscription[]> {
  const [usersData, subsData] = await Promise.all([
    listRecords<PbUser>("users", { sort: "-created", perPage: 100 }),
    listRecords<PbSubscription>("subscriptions", { perPage: 200 }),
  ]);

  const subsByUser = new Map<string, PbSubscription[]>();
  for (const sub of subsData.items) {
    const uid = sub.user_id ?? "";
    if (!subsByUser.has(uid)) subsByUser.set(uid, []);
    subsByUser.get(uid)!.push(sub);
  }

  const packagesData = await listRecords<PbPackage>("packages", { perPage: 200 });
  const packagesById = new Map(packagesData.items.map((p) => [p.id, p]));

  return usersData.items.map((user) => {
    const userSubs = subsByUser.get(user.id) ?? [];
    const activeSub = userSubs.find((s) => s.status === "ACTIVE") ?? userSubs[0] ?? null;
    let packageName: string | undefined;
    if (activeSub?.package_id) {
      const pkg = packagesById.get(activeSub.package_id);
      packageName = pkg?.name;
    }
    return {
      id: user.id,
      email: user.email ?? "",
      name: user.name ?? "",
      subscription: activeSub
        ? {
            id: activeSub.id,
            package_id: activeSub.package_id ?? "",
            package_name: packageName,
            period_start: activeSub.period_start ?? "",
            period_end: activeSub.period_end ?? null,
            quota_landing_total: activeSub.quota_landing_total ?? 0,
            quota_landing_used: activeSub.quota_landing_used ?? 0,
            quota_web_total: activeSub.quota_web_total ?? 0,
            quota_web_used: activeSub.quota_web_used ?? 0,
            status: activeSub.status ?? "EXPIRED",
          }
        : null,
    };
  });
}

export async function grantSubscription(input: {
  userId: string;
  packageId: string;
  periodEnd?: string | null;
  quotaLanding?: number;
  quotaWeb?: number;
}): Promise<{ id: string }> {
  const pkgData = await listRecords<PbPackage>("packages", {
    filter: `id='${escapeFilter(input.packageId)}'`,
    perPage: 1,
  });
  const pkg = pkgData.items[0];
  if (!pkg) throw new Error("Paket tidak ditemukan");

  const existingData = await listRecords<PbSubscription>("subscriptions", {
    filter: `user_id='${escapeFilter(input.userId)}' && status='ACTIVE'`,
    sort: "-period_end",
    perPage: 1,
  });
  const existing = existingData.items[0];

  const isLifetime = pkg.billing_type === "LIFETIME" || input.periodEnd === null;
  const periodEnd = isLifetime ? null : input.periodEnd ?? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const deployIncluded = pkg.deploy_included ?? 0;
  const quotaLanding = input.quotaLanding ?? (pkg.tier === "WEB" ? 0 : deployIncluded || 1);
  const quotaWeb = input.quotaWeb ?? (pkg.tier === "WEB" ? deployIncluded : 0);

  const now = new Date().toISOString();

  if (existing) {
    await updateRecord<PbSubscription>("subscriptions", existing.id, {
      package_id: input.packageId,
      period_start: now,
      period_end: periodEnd,
      quota_landing_total: quotaLanding,
      quota_landing_used: 0,
      quota_web_total: quotaWeb,
      quota_web_used: 0,
      status: "ACTIVE",
    });
    return { id: existing.id };
  }

  const created = await createRecord<PbSubscription>("subscriptions", {
    user_id: input.userId,
    package_id: input.packageId,
    period_start: now,
    period_end: periodEnd,
    quota_landing_total: quotaLanding,
    quota_landing_used: 0,
    quota_web_total: quotaWeb,
    quota_web_used: 0,
    status: "ACTIVE",
  });

  await logActivity({
    userId: input.userId,
    actor: "admin",
    action: "subscription.grant",
    entityType: "subscription",
    entityId: created.id,
    meta: { packageId: input.packageId, periodEnd, isLifetime },
  });

  return { id: created.id };
}

export async function updateSubscription(
  id: string,
  patch: {
    package_id?: string;
    period_end?: string | null;
    quota_landing_total?: number;
    quota_web_total?: number;
    quota_landing_used?: number;
    quota_web_used?: number;
    status?: string;
  },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.package_id !== undefined) payload.package_id = patch.package_id;
  if (patch.period_end !== undefined) payload.period_end = patch.period_end;
  if (patch.quota_landing_total !== undefined) payload.quota_landing_total = patch.quota_landing_total;
  if (patch.quota_web_total !== undefined) payload.quota_web_total = patch.quota_web_total;
  if (patch.quota_landing_used !== undefined) payload.quota_landing_used = patch.quota_landing_used;
  if (patch.quota_web_used !== undefined) payload.quota_web_used = patch.quota_web_used;
  if (patch.status !== undefined) payload.status = patch.status;
  await updateRecord("subscriptions", id, payload);
}

export async function revokeSubscription(id: string): Promise<void> {
  await updateRecord("subscriptions", id, { status: "EXPIRED" });
}