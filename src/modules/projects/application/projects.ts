import {
  createRecord,
  deleteRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import { mockProjects } from "@/shared/lib/mock-data";
import { industryLabel, purposeLabels } from "@/shared/lib/taxonomy";
import { HTML_PROJECT_TECHNOLOGY_CONFIG } from "@/modules/adapters";
import { MVP_PRODUCT_TYPES } from "@/shared/types";
import { loadSectionSlot, loadSectionVariant, validateSectionContent } from "@/modules/sections";
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
  active_sections?: unknown;
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
  clientLabel?: string,
) {
  const filters: string[] = [];
  if (!isAdmin) {
    if (userId) filters.push(`user_id='${escapeFilter(userId)}'`);
    else if (guestId) filters.push(`guest_session_id='${escapeFilter(guestId)}'`);
    else return [];
  }
  if (clientLabel?.trim()) {
    filters.push(`client_label='${escapeFilter(clientLabel.trim())}'`);
  }
  const data = await listRecords<PbProject>("projects", {
    filter: filters.length ? filters.join(" && ") : undefined,
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
  templateCode?: string,
) {
  if (!MVP_PRODUCT_TYPES.includes(productType)) {
    throw new Error("MVP hanya mendukung Landing (LAND).");
  }
  const rec = await createRecord<PbProject>("projects", {
    ...(actor.userId ? { user_id: actor.userId } : {}),
    ...(actor.guestId ? { guest_session_id: actor.guestId } : {}),
    client_id: actor.userId ?? actor.guestId ?? "",
    client_label: "Project Baru",
    product_type: productType,
    status: "DRAFT",
    active_sections: {
      technology: HTML_PROJECT_TECHNOLOGY_CONFIG,
    },
    ...(templateCode ? { template_id: templateCode } : {}),
  });
  await ensureHomePage(rec.id);
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

export const EMPTY_COMPREHENSION_SUMMARY =
  "Konteks bisnis belum diisi. Lengkapi business brief agar ringkasan AI dapat dibuat.";

export function summarizeBusiness(
  profile: PbBusinessProfile | null,
): ComprehendResult {
  if (!profile || !profile.business_name) {
    return { summary: EMPTY_COMPREHENSION_SUMMARY, confidence: 0 };
  }

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
    `${profile.business_name} bergerak di bidang ${industryLabel(profile.industry) || "umum"}.`,
    `Target utama: ${profile.target_audience || "audiens umum"}.`,
    `Tujuan: ${purposeLabels(profile.business_purpose) || "meningkatkan visibilitas"}.`,
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

export const PUBLISH_PROTECTED_STATUSES: ProjectStatus[] = [
  "PAID",
  "DEPLOYED",
  "ACTIVE",
];

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

export interface PbProjectPage {
  id: string;
  project_id: string;
  title?: string;
  slug?: string;
  is_home?: boolean;
  order?: number;
  seo?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export async function listProjectPages(projectId: string) {
  const data = await listRecords<PbProjectPage>("project_pages", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "order",
    perPage: 200,
  });
  return data.items;
}

export const RESERVED_PAGE_SLUGS = new Set([
  "assets",
  "shared",
  "api",
  "admin",
  "app",
  "preview",
  "p",
]);

export function normalizePageSlug(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export async function ensureHomePage(projectId: string) {
  const pages = await listProjectPages(projectId);
  let home: PbProjectPage | null =
    pages.find((page) => page.is_home) ?? pages[0] ?? null;
  if (home && !home.is_home) {
    home = await updateRecord<PbProjectPage>("project_pages", home.id, {
      is_home: true,
    });
  }
  if (!home) {
    home = await createRecord<PbProjectPage>("project_pages", {
      project_id: projectId,
      title: "Home",
      slug: "",
      is_home: true,
      order: 0,
      seo: {},
      settings: {},
    });
  }
  if (!home) return null;

  const sections = await listRecords<PbSection>("project_sections", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    perPage: 500,
  });
  for (const section of sections.items) {
    if (!section.page_id) {
      await updateRecord<PbSection>("project_sections", section.id, {
        page_id: home.id,
      });
    }
  }
  return home;
}

export async function createProjectPage(
  projectId: string,
  input: { title?: string; slug?: string },
) {
  await ensureHomePage(projectId);
  const pages = await listProjectPages(projectId);
  const title = input.title?.trim() || "Halaman Baru";
  const slug = normalizePageSlug(input.slug || title);
  if (!slug || RESERVED_PAGE_SLUGS.has(slug)) {
    throw new Error("Slug halaman tidak valid atau reserved.");
  }
  if (pages.some((page) => page.slug === slug)) {
    throw new Error("Slug halaman sudah dipakai.");
  }
  return await createRecord<PbProjectPage>("project_pages", {
    project_id: projectId,
    title,
    slug,
    is_home: false,
    order: pages.reduce((max, page) => Math.max(max, page.order ?? 0), 0) + 1,
    seo: {},
    settings: {},
  });
}

export async function updateProjectPage(
  projectId: string,
  pageId: string,
  patch: {
    title?: string;
    slug?: string;
    order?: number;
    seo?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  },
) {
  const pages = await listProjectPages(projectId);
  const page = pages.find((item) => item.id === pageId);
  if (!page) return null;
  if (page.is_home && patch.settings?.hidden === true) {
    throw new Error("Home tidak bisa disembunyikan.");
  }
  let slug = page.slug ?? "";
  if (!page.is_home && patch.slug !== undefined) {
    slug = normalizePageSlug(patch.slug);
    if (!slug || RESERVED_PAGE_SLUGS.has(slug)) {
      throw new Error("Slug halaman tidak valid atau reserved.");
    }
    if (pages.some((item) => item.id !== page.id && item.slug === slug)) {
      throw new Error("Slug halaman sudah dipakai.");
    }
  }
  return await updateRecord<PbProjectPage>("project_pages", page.id, {
    ...(patch.title !== undefined ? { title: patch.title.trim() || "Halaman" } : {}),
    ...(!page.is_home ? { slug } : { slug: "" }),
    ...(patch.order !== undefined ? { order: patch.order } : {}),
    ...(patch.seo !== undefined ? { seo: patch.seo } : {}),
    ...(patch.settings !== undefined ? { settings: patch.settings } : {}),
  });
}

export async function deleteProjectPage(projectId: string, pageId: string) {
  const pages = await listProjectPages(projectId);
  const page = pages.find((item) => item.id === pageId);
  if (!page) return false;
  if (page.is_home) throw new Error("Home tidak bisa dihapus.");
  const sections = await listRecords<PbSection>("project_sections", {
    filter: `project_id='${escapeFilter(projectId)}' && page_id='${escapeFilter(pageId)}'`,
    perPage: 500,
  }).catch(() => null);
  for (const section of sections?.items ?? []) {
    await deleteRecord("project_sections", section.id);
  }
  await deleteRecord("project_pages", page.id);
  return true;
}

export interface PbSection {
  id: string;
  project_id: string;
  page_id?: string;
  section_code: string;
  variant_id?: string;
  order?: number;
  enabled?: boolean;
  content?: ({ name?: string } & Record<string, unknown>) | null;
}

function sectionContent(
  content: PbSection["content"],
): Record<string, unknown> | undefined {
  if (!content || typeof content !== "object") return undefined;
  const { name: _name, ...rest } = content;
  return Object.keys(rest).length ? rest : undefined;
}

async function listSectionRows(
  projectId: string,
  pageId?: string,
  options: { includeUnassigned?: boolean } = {},
) {
  const filters = [`project_id='${escapeFilter(projectId)}'`];
  if (pageId) {
    const pageFilter = `page_id='${escapeFilter(pageId)}'`;
    filters.push(
      options.includeUnassigned
        ? `(${pageFilter} || page_id='')`
        : pageFilter,
    );
  }
  const data = await listRecords<PbSection>("project_sections", {
    filter: filters.join(" && "),
    sort: "order",
    perPage: 200,
  });
  return data.items;
}

export async function getProjectSections(
  projectId: string,
  fallback: Section[],
  pageId?: string,
  options: { includeUnassigned?: boolean } = {},
): Promise<Section[]> {
  const rows = await listSectionRows(projectId, pageId, options);
  if (!rows.length) return fallback;
  return rows
    .map((row) => {
      const fallbackItem = fallback.find(
        (item) => item.code === row.section_code,
      );
      const content = sectionContent(row.content);
      const variantId = row.variant_id || fallbackItem?.variantId;
      return {
        code: row.section_code,
        name: row.content?.name ?? fallbackItem?.name ?? row.section_code,
        enabled: row.enabled !== false,
        order: row.order ?? 0,
        ...(variantId ? { variantId } : {}),
        ...(content ?? fallbackItem?.content
          ? { content: content ?? fallbackItem?.content }
          : {}),
      };
    })
    .sort((a, b) => a.order - b.order);
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
  pageId?: string,
): Promise<{ ok: true; sections: Section[] } | { ok: false; errors: string[] }> {
  const record = await findProject(projectId).catch(() => null);
  if (!record) return { ok: false, errors: ["project not found"] };
  const state =
    record.active_sections && typeof record.active_sections === "object" && !Array.isArray(record.active_sections)
      ? (record.active_sections as { theme_id?: string; tier?: "BASIC" | "PRO" | "AGENCY" })
      : {};
  const projectThemeId = state.theme_id;
  const projectTier = state.tier;
  const normalized = normalizeSections(sections);
  const errors: string[] = [];
  for (const section of normalized) {
    const slot = await loadSectionSlot(section.code);
    if (section.variantId) {
      if (!slot) {
        errors.push(`${section.code}: slot tidak dikenal.`);
      } else {
        const variant = await loadSectionVariant(section.code, section.variantId);
        if (!variant) {
          errors.push(`${section.code}: varian "${section.variantId}" tidak ditemukan.`);
        } else if (variant.slot_code !== section.code) {
          errors.push(`${section.code}: varian "${section.variantId}" bukan untuk slot ini.`);
        } else if (variant.status !== "READY") {
          errors.push(`${section.code}: varian "${section.variantId}" belum READY.`);
        } else if (projectThemeId && variant.compatible_themes?.length && !variant.compatible_themes.includes(projectThemeId)) {
          errors.push(`${section.code}: varian "${section.variantId}" tidak kompatibel dengan theme "${projectThemeId}".`);
        } else if (projectTier && variant.compatible_tiers?.length && !variant.compatible_tiers.includes(projectTier)) {
          errors.push(`${section.code}: varian "${section.variantId}" tidak kompatibel dengan tier "${projectTier}".`);
        }
      }
    }
    if (section.content && slot) {
      const fieldErrors = validateSectionContent(slot, section.content);
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors.map((e) => `${section.code}: ${e}`));
      }
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }
  }
  let includeUnassigned = false;
  if (pageId) {
    const pages = await listProjectPages(projectId).catch(() => []);
    const page = pages.find((item) => item.id === pageId);
    includeUnassigned = Boolean(page?.is_home);
  }
  const existing = new Map(
    (await listSectionRows(projectId, pageId, { includeUnassigned })).map((row) => [
      row.section_code,
      row,
    ]),
  );
  for (const [index, section] of normalized.entries()) {
    const current = existing.get(section.code);
    const payload = {
      project_id: projectId,
      ...(pageId ? { page_id: pageId } : {}),
      section_code: section.code,
      variant_id: section.variantId ?? current?.variant_id ?? "",
      order: section.order || index + 1,
      enabled: section.enabled,
      content: {
        ...(current?.content ?? {}),
        ...(section.content ?? {}),
        name: section.name,
      },
    };
    if (current) {
      await updateRecord<PbSection>("project_sections", current.id, payload);
    } else {
      await createRecord<PbSection>("project_sections", payload);
    }
  }
  return { ok: true, sections: normalized };
}

export type ProjectActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

export async function applyProjectUpdate(
  id: string,
  input: Partial<Pick<Project, "businessName" | "templateCode" | "status" | "previewUrl">>,
): Promise<ProjectActionResult<Project>> {
  const { record, mock } = await resolveProject(id);
  if (!record && !mock) {
    return { ok: false, code: "NOT_FOUND", message: "Data tidak ditemukan." };
  }

  const current = record?.status ?? mock?.status ?? "DRAFT";
  if (
    input.status &&
    input.status !== current &&
    PUBLISH_PROTECTED_STATUSES.includes(input.status)
  ) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message:
        "Status PAID, DEPLOYED, dan ACTIVE hanya dapat diubah oleh alur pembayaran atau publish.",
    };
  }
  if (input.status && !canTransition(current, input.status)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Transisi ${current} → ${input.status} tidak diizinkan.`,
    };
  }

  const patch: Record<string, unknown> = {};
  if (input.businessName !== undefined) patch.client_label = input.businessName;
  if (input.templateCode !== undefined) patch.template_id = input.templateCode;
  if (input.status !== undefined) patch.status = input.status;
  if (input.previewUrl !== undefined) patch.preview_url = input.previewUrl;

  if (!Object.keys(patch).length) {
    return { ok: true, value: record ? toProject(record) : (mock as Project) };
  }

  return { ok: true, value: await patchProject(id, patch) };
}

export async function selectProjectVariant(
  id: string,
  variantId: string,
): Promise<ProjectActionResult<{ status: ProjectStatus; variant_id: string }>> {
  const { record, mock } = await resolveProject(id);
  if (!record && !mock) {
    return { ok: false, code: "NOT_FOUND", message: "Data tidak ditemukan." };
  }
  const current = record?.status ?? mock?.status ?? "PREVIEWS";
  if (!canTransition(current, "PICKED")) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Status ${current} tidak dapat menuju PICKED.`,
    };
  }
  await setProjectStatus(id, "PICKED", {
    chosen_variant: { id: variantId },
  });
  return { ok: true, value: { status: "PICKED", variant_id: variantId } };
}

function comprehensionPath(from: ProjectStatus): ProjectStatus[] | null {
  const path: ProjectStatus[] =
    from === "DRAFT" ? ["INTAKE", "COMPREHENDED"] : ["COMPREHENDED"];
  let cursor = from;
  for (const next of path) {
    if (!canTransition(cursor, next)) return null;
    cursor = next;
  }
  return path;
}

export async function comprehendProject(
  id: string,
): Promise<ProjectActionResult<ComprehendResult>> {
  const { record, mock } = await resolveProject(id);
  if (!record && !mock) {
    return { ok: false, code: "NOT_FOUND", message: "Data tidak ditemukan." };
  }
  const current: ProjectStatus = record?.status ?? mock?.status ?? "INTAKE";
  if (PUBLISH_PROTECTED_STATUSES.includes(current)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Status ${current} tidak dapat diubah oleh alur pemahaman.`,
    };
  }
  if (!comprehensionPath(current)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Status ${current} tidak dapat menuju COMPREHENDED.`,
    };
  }
  if (current !== "COMPREHENDED") {
    await setProjectStatus(id, "COMPREHENDED");
  }
  const profile = await getBusinessProfile(id).catch(() => null);
  return { ok: true, value: summarizeBusiness(profile) };
}

export interface ComprehendedContext {
  summary: string;
  confidence: number;
  corrections: string | null;
  confirmed_at: string;
}

export async function confirmProjectComprehension(
  id: string,
  corrections?: string,
): Promise<
  | { ok: true; corrections: string | null; comprehension: ComprehendedContext }
  | { ok: false; code: string; message: string }
> {
  const { record, mock } = await resolveProject(id);
  if (!record && !mock) {
    return { ok: false, code: "NOT_FOUND", message: "Data tidak ditemukan." };
  }

  const current: ProjectStatus = record?.status ?? mock?.status ?? "DRAFT";
  if (PUBLISH_PROTECTED_STATUSES.includes(current)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Status ${current} tidak dapat dikonfirmasi oleh alur pemahaman.`,
    };
  }
  if (!comprehensionPath(current)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Status ${current} tidak dapat menuju COMPREHENDED.`,
    };
  }

  const profile = await getBusinessProfile(id).catch(() => null);
  const summary = summarizeBusiness(profile);
  const comprehension: ComprehendedContext = {
    summary: summary.summary,
    confidence: summary.confidence,
    corrections: corrections ?? null,
    confirmed_at: new Date().toISOString(),
  };

  if (record) {
    const state =
      record.active_sections &&
      typeof record.active_sections === "object" &&
      !Array.isArray(record.active_sections)
        ? (record.active_sections as Record<string, unknown>)
        : {};
    await patchProject(id, {
      status: "COMPREHENDED",
      active_sections: { ...state, comprehended_context: comprehension },
    });
  } else if (mock) {
    mock.status = "COMPREHENDED";
    mock.updatedAt = comprehension.confirmed_at;
  }

  return {
    ok: true as const,
    corrections: comprehension.corrections,
    comprehension,
  };
}

export async function saveProjectBusinessContext(
  id: string,
  ctx: BusinessContext,
) {
  const project = await findProject(id).catch(() => null);
  const current = project?.status ?? "DRAFT";
  await saveBusinessProfile(id, ctx);
  await patchProject(id, {
    client_label: ctx.businessName,
    status: current === "DRAFT" ? "INTAKE" : current,
  });
  return ctx;
}
