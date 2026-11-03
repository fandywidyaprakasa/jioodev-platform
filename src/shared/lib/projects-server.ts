import {
  createRecord,
  deleteRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "./pb-platform";
import { mockComprehend, mockProjects } from "./mock-data";
import type {
  BusinessContext,
  ComprehendResult,
  ProductType,
  Project,
  ProjectStatus,
  Section,
} from "@/shared/types";

export interface PbProject {
  id: string;
  user_id?: string;
  guest_session_id?: string;
  client_label?: string;
  product_type?: ProductType;
  status?: ProjectStatus;
  template_id?: string;
  style?: string;
  layout?: string;
  chosen_variant?: { id?: string } | null;
  preview_url?: string;
  payment_id?: string;
  deployment_id?: string;
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

export async function listProjects(
  userId: string | undefined,
  isAdmin: boolean,
  guestId?: string,
) {
  let filter = "";
  if (!isAdmin) {
    if (userId) filter = `user_id='${escapeFilter(userId)}'`;
    else if (guestId) filter = `guest_session_id='${escapeFilter(guestId)}'`;
    else return [];
  }
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

export function canAccess(
  p: PbProject,
  userId: string | undefined,
  isAdmin: boolean,
  guestId?: string,
) {
  if (isAdmin) return true;
  if (userId && p.user_id && p.user_id === userId) return true;
  if (guestId && p.guest_session_id && p.guest_session_id === guestId) return true;
  return false;
}

export async function createProject(
  actor: { userId?: string; guestId?: string },
  productType: ProductType,
) {
  const rec = await createRecord<PbProject>("projects", {
    ...(actor.userId ? { user_id: actor.userId } : {}),
    ...(actor.guestId ? { guest_session_id: actor.guestId } : {}),
    client_id: actor.userId ?? actor.guestId ?? "",
    client_label: "Project Baru",
    product_type: productType,
    status: "DRAFT",
  });
  return toProject(rec);
}

interface PbGuestSession {
  id: string;
  token?: string;
}

export async function recordGuestSession(guestId: string, projectId: string) {
  const data = await listRecords<PbGuestSession>("guest_sessions", {
    filter: `token='${escapeFilter(guestId)}'`,
    perPage: 1,
  });
  const payload = {
    token: guestId,
    project_id: projectId,
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  };
  const existing = data.items[0];
  if (existing) {
    await updateRecord<PbGuestSession>("guest_sessions", existing.id, payload);
  } else {
    await createRecord<PbGuestSession>("guest_sessions", payload);
  }
}

export async function claimGuestProjects(guestId: string, userId: string) {
  const data = await listRecords<PbProject>("projects", {
    filter: `guest_session_id='${escapeFilter(guestId)}'`,
    perPage: 200,
  });
  for (const project of data.items) {
    await updateRecord<PbProject>("projects", project.id, {
      user_id: userId,
      guest_session_id: "",
      client_id: userId,
    });
  }
  const sessions = await listRecords<PbGuestSession>("guest_sessions", {
    filter: `token='${escapeFilter(guestId)}'`,
    perPage: 10,
  }).catch(() => null);
  for (const session of sessions?.items ?? []) {
    await updateRecord<PbGuestSession>("guest_sessions", session.id, {
      converted_user_id: userId,
    }).catch(() => undefined);
  }
  return data.items.length;
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

export function summarizeBusiness(
  profile: PbBusinessProfile | null,
): ComprehendResult {
  if (!profile || !profile.business_name) return mockComprehend;

  const filled = [
    profile.business_name,
    profile.industry,
    profile.target_audience,
    profile.design_pref,
    profile.business_goals,
    (profile.business_purpose ?? []).length ? "y" : "",
    (profile.channels ?? []).length ? "y" : "",
  ].filter(Boolean).length;

  const summary = [
    `${profile.business_name} bergerak di bidang ${profile.industry || "umum"}.`,
    `Target utama: ${profile.target_audience || "audiens umum"}.`,
    `Tujuan: ${(profile.business_purpose ?? []).join(", ") || "meningkatkan visibilitas"}.`,
    `Kanal: ${(profile.channels ?? []).join(", ") || "belum ditentukan"}.`,
    `Preferensi desain: ${profile.design_pref || "netral"}.`,
    `Hasil yang diharapkan: ${profile.business_goals || "meningkatkan konversi"}.`,
  ].join(" ");

  return {
    summary,
    confidence: Math.min(0.95, 0.55 + filled * 0.05),
  };
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

export const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["INTAKE"],
  INTAKE: ["COMPREHENDED"],
  COMPREHENDED: ["TEMPLATE_CHOSEN"],
  TEMPLATE_CHOSEN: ["GENERATING"],
  GENERATING: ["PREVIEWS", "TEMPLATE_CHOSEN"],
  PREVIEWS: ["PICKED"],
  PICKED: ["PAID", "PREVIEWS"],
  PAID: ["DEPLOYED"],
  DEPLOYED: ["ACTIVE"],
  ACTIVE: [],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus) {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export async function resolveProject(id: string) {
  const record = await findProject(id).catch(() => null);
  const mock = mockProjects.find((project) => project.id === id);
  return { record, mock };
}

export async function setProjectStatus(
  id: string,
  status: ProjectStatus,
  extra: Record<string, unknown> = {},
) {
  const { record, mock } = await resolveProject(id);
  if (record) {
    return await patchProject(id, { status, ...extra });
  }
  if (mock) {
    mock.status = status;
    mock.updatedAt = new Date().toISOString();
    return mock;
  }
  return null;
}

export interface PbSection {
  id: string;
  project_id: string;
  section_code: string;
  variant_id?: string;
  order?: number;
  enabled?: boolean;
  content?: { name?: string } | null;
}

async function listSectionRows(projectId: string) {
  const data = await listRecords<PbSection>("project_sections", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "order",
    perPage: 200,
  });
  return data.items;
}

export async function getProjectSections(
  projectId: string,
  fallback: Section[],
): Promise<Section[]> {
  const record = await findProject(projectId).catch(() => null);
  if (!record) return fallback;
  try {
    const rows = await listSectionRows(projectId);
    if (!rows.length) return fallback;
    return rows
      .map((row) => ({
        code: row.section_code,
        name:
          row.content?.name ??
          fallback.find((item) => item.code === row.section_code)?.name ??
          row.section_code,
        enabled: row.enabled !== false,
        order: row.order ?? 0,
      }))
      .sort((a, b) => a.order - b.order);
  } catch {
    return fallback;
  }
}

export const REQUIRED_SECTION_CODES = ["S-HERO"];

export function normalizeSections(sections: Section[]): Section[] {
  const hasHero = sections.some((section) => section.code === "S-HERO");
  const withHero = sections.map((section) =>
    REQUIRED_SECTION_CODES.includes(section.code)
      ? { ...section, enabled: true }
      : section,
  );
  if (hasHero) return withHero;
  return [
    { code: "S-HERO", name: "Hero", enabled: true, order: 1 },
    ...withHero.map((section, index) => ({ ...section, order: index + 2 })),
  ];
}

export async function saveProjectSections(
  projectId: string,
  sections: Section[],
): Promise<Section[]> {
  const record = await findProject(projectId).catch(() => null);
  if (!record) return sections;
  const normalized = normalizeSections(sections);
  const existing = new Map(
    (await listSectionRows(projectId)).map((row) => [row.section_code, row]),
  );
  for (const [index, section] of normalized.entries()) {
    const payload = {
      project_id: projectId,
      section_code: section.code,
      order: section.order || index + 1,
      enabled: section.enabled,
      content: { name: section.name },
    };
    const current = existing.get(section.code);
    if (current) {
      await updateRecord<PbSection>("project_sections", current.id, payload);
    } else {
      await createRecord<PbSection>("project_sections", payload);
    }
  }
  return normalized;
}
