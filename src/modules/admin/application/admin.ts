import {
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import {
  getPlatformSettings,
  savePlatformSettings,
} from "@/shared/infrastructure/settings";
import { logActivity } from "@/modules/activity";
import type { AdminStats, Package } from "@/shared/types";

interface PbPackage {
  id: string;
  name?: string;
  tier?: "FREE" | "PRO" | "AGENCY" | "ADDON";
  billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
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

interface PbProject {
  id: string;
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
  billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
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
    valid_from: input.valid_from ?? new Date().toISOString().split("T")[0],
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
    billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
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

export { getPlatformSettings };

export async function updatePlatformSettings(
  patch: Record<string, unknown>,
  actor: { userId?: string; email?: string },
) {
  const settings = await savePlatformSettings(patch);
  await logActivity({
    userId: actor.userId,
    actor: actor.email ?? "admin",
    action: "settings.update",
    entityType: "settings",
    meta: patch,
  });
  return settings;
}

export async function adminStats(): Promise<AdminStats> {
  const [projects, pending, live, activeSubs] = await Promise.all([
    listRecords<PbProject>("projects", { perPage: 1 }),
    listRecords("payments", { filter: "status='PENDING'", perPage: 1 }),
    listRecords("deployments", { filter: "status='LIVE'", perPage: 1 }),
    listRecords("subscriptions", {
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

export { listRecords } from "@/shared/infrastructure/pocketbase/pb-platform";
