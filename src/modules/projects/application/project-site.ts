import { promises as fs } from "node:fs";
import path from "node:path";
import { renderComposition } from "@/modules/workspace";
import type { RenderAsset, RenderMode } from "@/modules/renderer";
import { listRecords } from "@/shared/infrastructure/pocketbase/pb-platform";
import {
  ensureHomePage,
  findProject,
  getBusinessProfile,
  getProjectSections,
  listProjectPages,
  patchProject,
  saveProjectSections,
  type PbProjectPage,
} from "./projects";
import { applyCopyToContent, getProjectCopy } from "./copy";
import { listProjectAssets, type ProjectAsset } from "./assets";
import { mockCopy } from "@/shared/lib/mock-data";
import { loadWorkspace, type WorkspaceData } from "@/modules/workspace";
import type { Section } from "@/shared/types";

export interface SiteSettings {
  site_name?: string;
  footer_tagline?: string;
}

interface SiteState {
  composition_id?: string;
  theme_id?: string;
  tier?: "BASIC" | "PRO" | "AGENCY";
  copy_migrated?: boolean;
  site_settings?: SiteSettings;
}

export interface SitePage {
  id: string;
  title: string;
  slug: string;
  is_home: boolean;
  order: number;
  seo: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface ProjectSite extends WorkspaceData {
  projectId: string;
  pageId: string;
  page: SitePage;
  pages: SitePage[];
  siteSettings: SiteSettings;
  compositionId: string;
  themeId: string;
  tier: "BASIC" | "PRO" | "AGENCY";
  persisted: boolean;
  assets: ProjectAsset[];
}

function toSitePage(page: PbProjectPage): SitePage {
  return {
    id: page.id,
    title: page.title ?? (page.is_home ? "Home" : "Halaman"),
    slug: page.slug ?? "",
    is_home: Boolean(page.is_home),
    order: page.order ?? 0,
    seo: page.seo ?? {},
    settings: page.settings ?? {},
  };
}

function libraryRoot() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

function safeId(value: string) {
  return /^[A-Za-z0-9-]+$/.test(value) ? value : null;
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function resolveCompositionId(templateId: string | undefined) {
  const fallback = "split-editorial-basic-v1";
  if (!templateId || !safeId(templateId)) return fallback;
  const meta = await readJson<{ display_name?: string; variant_label?: string }>(
    path.join(libraryRoot(), "templates", templateId, "meta.json"),
  );
  if (!meta) return fallback;
  const target = meta.display_name ?? meta.variant_label;
  if (!target) return fallback;
  const root = path.join(libraryRoot(), "compositions");
  const entries = await fs.readdir(root).catch(() => []);
  for (const entry of entries) {
    const composition = await readJson<{ composition_id?: string; display_name?: string }>(
      path.join(root, entry, "composition.json"),
    );
    if (
      composition?.display_name === target ||
      composition?.composition_id === entry
    ) {
      return composition.composition_id ?? entry;
    }
  }
  return fallback;
}

function siteState(project: { active_sections?: unknown }): SiteState {
  if (!project.active_sections || typeof project.active_sections !== "object") {
    return {};
  }
  return project.active_sections as SiteState;
}

function toSections(
  blocks: WorkspaceData["composition"]["blocks"],
  content: Record<string, unknown>,
  previous: Section[],
): Section[] {
  return blocks
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((block, index) => {
      const prior = previous.find((section) => section.code === block.slot);
      return {
        code: block.slot,
        name: prior?.name ?? block.slot,
        enabled: block.enabled,
        order: block.order || index + 1,
        variantId: block.variant,
        ...(content[block.slot] && typeof content[block.slot] === "object"
          ? { content: content[block.slot] as Record<string, unknown> }
          : prior?.content
            ? { content: prior.content }
            : {}),
      };
    });
}

async function applyLegacyCopy(
  projectId: string,
  content: Record<string, unknown>,
  clientLabel: string | undefined,
  siteSettings: SiteSettings,
) {
  const [profile, copy] = await Promise.all([
    getBusinessProfile(projectId).catch(() => null),
    getProjectCopy(projectId, mockCopy).catch(() => mockCopy),
  ]);
  return applyCopyToContent(content, copy, {
    businessName: profile?.business_name || clientLabel,
    siteSettings,
  });
}

function selectSitePage(pages: PbProjectPage[], pageId?: string) {
  return (
    (pageId ? pages.find((page) => page.id === pageId) : null) ??
    pages.find((page) => page.is_home) ??
    pages[0] ??
    null
  );
}

function virtualHomePage(projectId: string): PbProjectPage {
  return {
    id: `virtual-home-${projectId}`,
    project_id: projectId,
    title: "Home",
    slug: "",
    is_home: true,
    order: 0,
    seo: {},
    settings: {},
  };
}

function buildSiteContent(
  base: WorkspaceData,
  sections: Section[],
  siteSettings: SiteSettings,
) {
  const content = { ...base.content };
  for (const section of sections) {
    if (section.content) content[section.code] = section.content;
  }
  if (Object.keys(siteSettings).length) {
    const footer = (content["S-FOOT"] ?? {}) as Record<string, unknown>;
    content["S-FOOT"] = {
      ...footer,
      ...(siteSettings.site_name ? { business_name: siteSettings.site_name } : {}),
      ...(siteSettings.footer_tagline ? { tagline: siteSettings.footer_tagline } : {}),
    };
  }
  return content;
}

function buildSiteBlocks(
  base: WorkspaceData,
  sections: Section[],
): WorkspaceData["composition"]["blocks"] {
  return sections.map((section, index) => ({
    slot: section.code,
    variant:
      section.variantId ??
      base.composition.blocks.find((block) => block.slot === section.code)
        ?.variant ??
      "",
    enabled: section.enabled,
    order: section.order || index + 1,
  }));
}

export async function loadProjectSite(
  projectId: string,
  pageId?: string,
): Promise<ProjectSite | null> {
  const project = await findProject(projectId);
  if (!project) return null;
  const state = siteState(project);
  const pages = await listProjectPages(projectId);
  const selected = selectSitePage(pages, pageId) ?? virtualHomePage(projectId);
  const assets = await listProjectAssets(projectId).catch(() => []);
  const compositionId = state.composition_id ?? await resolveCompositionId(project.template_id);
  const base = await loadWorkspace(compositionId);
  if (!base) return null;

  const previous = await getProjectSections(projectId, [], selected.id, {
    includeUnassigned: Boolean(selected.is_home),
  });
  const stored = previous.length > 0;
  const sections = stored
    ? previous
    : toSections(base.composition.blocks, base.content, []);
  const blocks = buildSiteBlocks(base, sections);
  const siteSettings = state.site_settings ?? {};
  const content = buildSiteContent(base, sections, siteSettings);
  if (!stored || !state.copy_migrated) {
    await applyLegacyCopy(
      projectId,
      content,
      project.client_label,
      siteSettings,
    );
  }
  const effectivePages = pages.length ? pages : [selected];

  return {
    ...base,
    composition: {
      ...base.composition,
      blocks,
      theme_id: state.theme_id ?? base.composition.theme_id,
      tier: state.tier ?? base.composition.tier,
    },
    content,
    projectId,
    pageId: selected.id,
    page: toSitePage(selected),
    pages: effectivePages.map(toSitePage),
    siteSettings,
    compositionId,
    themeId: state.theme_id ?? base.composition.theme_id,
    tier: state.tier ?? base.composition.tier,
    persisted: stored,
    assets,
  };
}

type SiteBootstrapStatus =
  | "created"
  | "migrated"
  | "unchanged"
  | "not_found"
  | "unavailable";

interface SiteBootstrapResult {
  site: ProjectSite | null;
  status: SiteBootstrapStatus;
}

async function bootstrapProjectSite(
  projectId: string,
  pageId?: string,
): Promise<SiteBootstrapResult> {
  const project = await findProject(projectId);
  if (!project) return { site: null, status: "not_found" };
  const state = siteState(project);
  const siteSettings = state.site_settings ?? {};
  const home = await ensureHomePage(projectId);
  if (!home) {
    throw new Error(`Gagal menyiapkan Home untuk project ${projectId}.`);
  }
  const pages = await listProjectPages(projectId);
  const selected = selectSitePage(pages, pageId);
  if (!selected) return { site: null, status: "unavailable" };
  const compositionId = state.composition_id ?? await resolveCompositionId(project.template_id);
  const base = await loadWorkspace(compositionId);
  if (!base) return { site: null, status: "unavailable" };

  const previous = await getProjectSections(projectId, [], selected.id, {
    includeUnassigned: Boolean(selected.is_home),
  });
  const stored = previous.length > 0;
  const sections = stored
    ? previous
    : toSections(base.composition.blocks, base.content, []);
  const content = buildSiteContent(base, sections, siteSettings);
  let status: SiteBootstrapStatus = "unchanged";

  if (!stored) {
    await applyLegacyCopy(
      projectId,
      content,
      project.client_label,
      siteSettings,
    );
    const initialSections = sections.map((section) => ({
      ...section,
      ...(content[section.code] ? { content: content[section.code] as Record<string, unknown> } : {}),
    }));
    await saveProjectSections(projectId, initialSections, selected.id);
    await patchProject(projectId, {
      active_sections: {
        ...state,
        composition_id: compositionId,
        theme_id: state.theme_id ?? base.composition.theme_id,
        tier: state.tier ?? base.composition.tier,
        copy_migrated: true,
      },
    });
    status = "created";
  } else if (!state.copy_migrated) {
    await applyLegacyCopy(
      projectId,
      content,
      project.client_label,
      siteSettings,
    );
    const migratedSections = sections.map((section) => ({
      ...section,
      ...(content[section.code] ? { content: content[section.code] as Record<string, unknown> } : {}),
    }));
    await saveProjectSections(projectId, migratedSections, selected.id);
    await patchProject(projectId, {
      active_sections: {
        ...state,
        copy_migrated: true,
      },
    });
    status = "migrated";
  }

  const site = await loadProjectSite(projectId, pageId);
  if (!site) return { site: null, status: "unavailable" };
  return { site, status };
}

export async function ensureProjectSite(
  projectId: string,
  pageId?: string,
): Promise<ProjectSite | null> {
  return (await bootstrapProjectSite(projectId, pageId)).site;
}

export interface SiteSnapshot {
  compositionId: string;
  themeId: string;
  tier: "BASIC" | "PRO" | "AGENCY";
  blocks: WorkspaceData["composition"]["blocks"];
  content: Record<string, unknown>;
  siteId?: string;
  pageId?: string;
  pageSlug?: string;
  siteSettings?: SiteSettings;
  pageSettings?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  assets?: { base_url: string; manifest: RenderAsset[] };
}

export interface RenderSiteSnapshotOptions {
  renderMode?: RenderMode;
  seo?: Record<string, unknown>;
  assets?: { base_url?: string; manifest?: RenderAsset[] };
}

export function toSiteSnapshot(site: ProjectSite): SiteSnapshot {
  return {
    compositionId: site.compositionId,
    themeId: site.themeId,
    tier: site.tier,
    blocks: site.composition.blocks,
    content: site.content,
    siteId: site.projectId,
    pageId: site.page.id,
    pageSlug: site.page.slug,
    siteSettings: site.siteSettings,
    pageSettings: site.page.settings,
    seo: site.page.seo,
  };
}

export async function renderSiteSnapshot(
  snapshot: SiteSnapshot,
  options: RenderSiteSnapshotOptions = {},
) {
  return renderComposition(snapshot.compositionId, {
    themeId: snapshot.themeId,
    tier: snapshot.tier,
    blocks: snapshot.blocks,
    content: snapshot.content,
    renderMode: options.renderMode ?? "preview",
    siteId: snapshot.siteId,
    pageId: snapshot.pageId,
    pageSlug: snapshot.pageSlug,
    siteSettings: snapshot.siteSettings as Record<string, unknown> | undefined,
    pageSettings: snapshot.pageSettings,
    seo: options.seo ?? snapshot.seo,
    assets: options.assets
      ? {
          base_url: options.assets.base_url ?? snapshot.assets?.base_url ?? "",
          manifest: options.assets.manifest ?? snapshot.assets?.manifest ?? [],
        }
      : snapshot.assets,
  });
}

export async function saveProjectSite(
  projectId: string,
  sections: Section[],
  options: {
    pageId?: string;
    themeId?: string;
    tier?: ProjectSite["tier"];
    compositionId?: string;
    siteSettings?: SiteSettings;
  },
) {
  const project = await findProject(projectId);
  if (!project) return null;
  const state = siteState(project);
  let page: PbProjectPage | null;
  if (options.pageId) {
    const pages = await listProjectPages(projectId);
    page = pages.find((item) => item.id === options.pageId) ?? null;
    if (!page) return null;
    if (page.is_home) {
      page = (await ensureHomePage(projectId)) ?? page;
    }
  } else {
    page = await ensureHomePage(projectId);
  }
  if (!page) return null;
  const saved = await saveProjectSections(projectId, sections, page.id);
  if (!saved.ok) return saved;
  await patchProject(projectId, {
    active_sections: {
      ...state,
      composition_id: options.compositionId ?? state.composition_id,
      theme_id: options.themeId ?? state.theme_id,
      tier: options.tier ?? state.tier,
      copy_migrated: true,
      site_settings: options.siteSettings ?? state.site_settings ?? {},
    },
  });
  return saved;
}

export async function renderProjectSite(projectId: string, pageId?: string) {
  const site = await loadProjectSite(projectId, pageId);
  if (!site) return null;
  return renderSiteSnapshot(toSiteSnapshot(site));
}

interface PbProjectRow {
  id: string;
}

export async function backfillProjectSites(perPage = 500) {
  let page = 1;
  let total = 0;
  let backfilled = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (;;) {
    const data = await listRecords<PbProjectRow>("projects", {
      perPage,
      page,
      sort: "created",
    });
    total += data.items.length;
    for (const project of data.items) {
      try {
        const outcome = await bootstrapProjectSite(project.id);
        if (outcome.status === "created" || outcome.status === "migrated") {
          backfilled += 1;
        } else {
          skipped += 1;
        }
      } catch {
        failed.push(project.id);
      }
    }
    if (page >= data.totalPages) break;
    page += 1;
  }

  return { total, backfilled, skipped, failed };
}

export interface SitePage {
  id: string;
  title: string;
  slug: string;
  is_home: boolean;
  order: number;
  seo: Record<string, unknown>;
  settings: Record<string, unknown>;
}


export async function saveSiteSettings(
  projectId: string,
  patch: SiteSettings,
): Promise<SiteSettings | null> {
  const project = await findProject(projectId);
  if (!project) return null;
  const state = siteState(project);
  const next = { ...(state.site_settings ?? {}), ...patch };
  await patchProject(projectId, {
    active_sections: {
      ...state,
      copy_migrated: true,
      site_settings: next,
    },
  });
  return next;
}
