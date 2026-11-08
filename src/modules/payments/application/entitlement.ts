import {
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";

interface PbSubscription {
  id: string;
  user_id?: string;
  package_id?: string;
  quota_landing_total?: number;
  quota_landing_used?: number;
  quota_web_total?: number;
  quota_web_used?: number;
  status?: string;
  period_end?: string;
  period_start?: string;
}

interface PbPackage {
  id: string;
  billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
}

interface PbProject {
  id: string;
  user_id?: string;
  product_type?: "LAND" | "WEB" | "COMM";
  status?: string;
}

export interface PaymentEntitlement {
  entitled: boolean;
  source: "admin" | "subscription" | null;
  subscriptionId?: string;
  remainingQuota?: number;
}

function getRemainingQuota(sub: PbSubscription): number {
  const landing = (sub.quota_landing_total ?? 0) - (sub.quota_landing_used ?? 0);
  const web = (sub.quota_web_total ?? 0) - (sub.quota_web_used ?? 0);
  return Math.max(0, landing + web);
}

function isSubscriptionActive(sub: PbSubscription): boolean {
  const periodEnd = sub.period_end;
  if (!periodEnd) return true;
  if (sub.package_id) {
    return true;
  }
  return new Date(periodEnd).getTime() > Date.now();
}

async function fetchPackageBillingType(packageId?: string): Promise<"LIFETIME" | null> {
  if (!packageId) return null;
  try {
    const pkg = await getRecord<PbPackage>("packages", packageId);
    if (pkg.billing_type === "LIFETIME") return "LIFETIME";
  } catch {
    return null;
  }
  return null;
}

export async function getPaymentEntitlement(
  userId: string | undefined,
  isAdmin: boolean
): Promise<PaymentEntitlement> {
  if (isAdmin) {
    return { entitled: true, source: "admin" };
  }
  if (!userId) {
    return { entitled: false, source: null };
  }

  const data = await listRecords<PbSubscription>("subscriptions", {
    filter: `user_id='${escapeFilter(userId)}' && status='ACTIVE'`,
    sort: "-period_end",
    perPage: 50,
  }).catch(() => ({ items: [] as PbSubscription[] }));

  for (const sub of data.items) {
    const remaining = getRemainingQuota(sub);
    if (remaining <= 0) continue;

    const billingType = await fetchPackageBillingType(sub.package_id);
    if (billingType === "LIFETIME") {
      return { entitled: true, source: "subscription", subscriptionId: sub.id, remainingQuota: remaining };
    }
    if (isSubscriptionActive(sub)) {
      return { entitled: true, source: "subscription", subscriptionId: sub.id, remainingQuota: remaining };
    }
  }

  return { entitled: false, source: null };
}

export async function consumeEntitlementQuota(
  subscriptionId: string,
  productType: "LAND" | "WEB"
): Promise<boolean> {
  const sub = await getRecord<PbSubscription>("subscriptions", subscriptionId).catch(() => null);
  if (!sub) return false;

  const field = productType === "LAND" ? "quota_landing_used" : "quota_web_used";
  const totalField = productType === "LAND" ? "quota_landing_total" : "quota_web_total";

  const used = ((sub[field as keyof PbSubscription] as number) ?? 0) + 1;
  const total = (sub[totalField as keyof PbSubscription] as number) ?? 0;

  const landingUsed = productType === "LAND" ? used : sub.quota_landing_used ?? 0;
  const webUsed = productType === "WEB" ? used : sub.quota_web_used ?? 0;
  const landingTotal = sub.quota_landing_total ?? 0;
  const webTotal = sub.quota_web_total ?? 0;

  const landingExhausted = landingUsed >= landingTotal;
  const webExhausted = webUsed >= webTotal;

  const patch: Record<string, number | string> = { [field]: used };
  if (landingExhausted && webExhausted) {
    patch.status = "EXHAUSTED";
  }

  await updateRecord<PbSubscription>("subscriptions", subscriptionId, patch);
  return true;
}

function getProductTypeForQuota(productType?: string): "LAND" | "WEB" {
  return productType === "LAND" ? "LAND" : "WEB";
}

export async function activateProjectViaEntitlement(
  projectId: string,
  actor: { userId?: string; isAdmin: boolean }
): Promise<{ activated: boolean; source?: string }> {
  const project = await getRecord<PbProject>("projects", projectId).catch(() => null);
  if (!project) return { activated: false };

  const status = project.status ?? "";
  if (["PAID", "DEPLOYED", "ACTIVE"].includes(status)) {
    return { activated: false };
  }

  const entitlement = await getPaymentEntitlement(actor.userId, actor.isAdmin);
  if (!entitlement.entitled) return { activated: false };

  await updateRecord<PbProject>("projects", projectId, {
    status: "PAID",
  });

  if (entitlement.source === "subscription" && entitlement.subscriptionId) {
    const productType = getProductTypeForQuota(project.product_type);
    await consumeEntitlementQuota(entitlement.subscriptionId, productType);
  }

  return { activated: true, source: entitlement.source ?? undefined };
}