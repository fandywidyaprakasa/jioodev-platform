import {
  createRecord,
  deleteRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "./pb-platform";
import type { BusinessContext, ProductType, Project, ProjectStatus } from "@/shared/types";

export interface PbProject {
  id: string;
  user_id?: string;
  guest_session_id?: string;
  client_label?: string;
  product_type?: ProductType;
  status?: ProjectStatus;
  template_id?: string;
  preview_url?: string;
  created: string;
  updated: string;
}

export const PROJECT_STATUSES: ProjectStatus[] = [
  "DRAFT",
  "INTAKE",
  "COMPREHENDED",
  "TEMPLATE_CHOSEN",
  "GENERATING",
  "PREVIEWS",
  "PICKED",
  "PAID",
  "DEPLOYED",
  "ACTIVE",
];

export function toProject(r: PbProject): Project {
  return {
    id: r.id,
    clientLabel: r.client_label ?? "Project Baru",
    productType: r.product_type ?? "LAND",
    status: r.status ?? "DRAFT",
    createdAt: r.created,
    updatedAt: r.updated,
    businessName: r.client_label,
    templateCode: r.template_id,
    previewUrl: r.preview_url,
  };
}

export async function listProjects(userId: string, isAdmin: boolean) {
  const filter = isAdmin ? "" : `user_id='${escapeFilter(userId)}'`;
  const data = await listRecords<PbProject>("projects", {
    filter: filter || undefined,
    sort: "-updated",
    perPage: 200,
  });
  return data.items.map(toProject);
}

export async function findProject(id: string): Promise<PbProject | null> {
  try {
    return await getRecord<PbProject>("projects", id);
  } catch {
    return null;
  }
}

export function canAccess(p: PbProject, userId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  if (p.user_id && p.user_id === userId) return true;
  return false;
}

export async function createProject(userId: string, productType: ProductType) {
  const rec = await createRecord<PbProject>("projects", {
    user_id: userId,
    client_label: "Project Baru",
    product_type: productType,
    status: "DRAFT",
  });
  return toProject(rec);
}

export async function patchProject(
  id: string,
  patch: Record<string, unknown>,
) {
  const rec = await updateRecord<PbProject>("projects", id, patch);
  return toProject(rec);
}

export async function removeProject(id: string) {
  await deleteRecord("projects", id);
}

export interface PbBusinessProfile {
  id: string;
  project_id: string;
  business_name?: string;
  industry?: string;
  business_purpose?: string[];
  target_audience?: string;
  channels?: string[];
  design_pref?: string;
  business_goals?: string;
}

export async function getBusinessProfile(projectId: string) {
  try {
    const data = await listRecords<PbBusinessProfile>("business_profiles", {
      filter: `project_id='${escapeFilter(projectId)}'`,
      perPage: 1,
    });
    return data.items[0] ?? null;
  } catch {
    return null;
  }
}

export async function saveBusinessProfile(
  projectId: string,
  ctx: BusinessContext,
) {
  const payload = {
    project_id: projectId,
    business_name: ctx.businessName,
    industry: ctx.industry,
    business_purpose: ctx.businessPurpose,
    target_audience: ctx.targetAudience,
    channels: ctx.channels,
    design_pref: ctx.designPref,
    business_goals: ctx.businessGoals,
  };
  const existing = await getBusinessProfile(projectId);
  if (existing) {
    await updateRecord<PbBusinessProfile>("business_profiles", existing.id, payload);
    return;
  }
  await createRecord<PbBusinessProfile>("business_profiles", payload);
}
