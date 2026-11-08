import {
  listProjectPages,
  getProjectSections,
  saveProjectSections,
  updateProjectPage,
  createProjectPage,
  deleteProjectPage,
  findProject,
  type PbProjectPage,
} from "./projects";
import { loadProjectSite, toSiteSnapshot, saveSiteSettings as saveLegacySiteSettings, type ProjectSite, type SiteSettings as LegacySiteSettings } from "./project-site";
import type { Section } from "@/shared/types";
import type {
  Page,
  SectionInstance,
  Site,
  SiteSettings as CmsSiteSettings,
  DraftSnapshot,
  Seo,
} from "@/shared/types";

function toCmsSiteSettings(site: ProjectSite): CmsSiteSettings {
  return {
    site_name: site.siteSettings.site_name,
    footer_tagline: site.siteSettings.footer_tagline,
    theme_id: site.themeId,
    tier: site.tier,
  };
}

export function toCmsSite(site: ProjectSite): Site {
  return {
    id: site.projectId,
    project_ref: site.projectId,
    site_settings: toCmsSiteSettings(site),
    theme_tier_ref: {
      theme_id: site.themeId,
      tier: site.tier,
    },
  };
}

export function toCmsPage(
  page: { id: string; title?: string; slug?: string; is_home?: boolean; order?: number; seo?: Record<string, unknown>; settings?: Record<string, unknown> },
  siteId: string,
): Page {
  return {
    id: page.id,
    site_id: siteId,
    title: page.title ?? (page.is_home ? "Home" : "Halaman"),
    slug: page.slug ?? "",
    is_home: Boolean(page.is_home),
    order: page.order ?? 0,
    seo: (page.seo ?? {}) as Seo,
    settings: page.settings ?? {},
  };
}

export function toCmsSections(site: ProjectSite): SectionInstance[] {
  return site.composition.blocks.map((block, index) => ({
    page_id: site.pageId,
    section_code: block.slot,
    variant_id: block.variant || undefined,
    order: block.order || index + 1,
    enabled: block.enabled,
    content:
      site.content[block.slot] && typeof site.content[block.slot] === "object" && !Array.isArray(site.content[block.slot])
        ? (site.content[block.slot] as Record<string, unknown>)
        : undefined,
  }));
}

export async function readCmsSite(projectId: string, pageId?: string) {
  const site = await loadProjectSite(projectId, pageId);
  if (!site) return null;
  return {
    site: toCmsSite(site),
    page: toCmsPage(site.page, site.projectId),
    pages: site.pages.map((p) => toCmsPage(p, site.projectId)),
    sections: toCmsSections(site),
    settings: toCmsSiteSettings(site),
  };
}

export async function listCmsPages(projectId: string): Promise<Page[]> {
  const pages = await listProjectPages(projectId);
  return pages.map((page) =>
    toCmsPage(
      {
        id: page.id,
        title: page.title ?? (page.is_home ? "Home" : "Halaman"),
        slug: page.slug ?? "",
        is_home: Boolean(page.is_home),
        order: page.order ?? 0,
        seo: page.seo ?? {},
        settings: page.settings ?? {},
      },
      projectId,
    ),
  );
}

export async function readCmsPage(projectId: string, pageId: string): Promise<Page | null> {
  const pages = await listProjectPages(projectId);
  const page = pages.find((item) => item.id === pageId);
  if (!page) return null;
  return toCmsPage(
    {
      id: page.id,
      title: page.title ?? (page.is_home ? "Home" : "Halaman"),
      slug: page.slug ?? "",
      is_home: Boolean(page.is_home),
      order: page.order ?? 0,
      seo: page.seo ?? {},
      settings: page.settings ?? {},
    },
    projectId,
  );
}

export async function readCmsSnapshot(projectId: string, pageId?: string): Promise<DraftSnapshot | null> {
  const site = await loadProjectSite(projectId, pageId);
  if (!site) return null;
  const cmsSite = toCmsSite(site);
  const cmsPage = toCmsPage(site.page, projectId);
  const sections = toCmsSections(site);
  const content: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(site.content)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      content[key] = value as Record<string, unknown>;
    }
  }
  return {
    site: cmsSite,
    page: cmsPage,
    sections,
    settings: toCmsSiteSettings(site),
    content,
    assets: { base_url: "", manifest: [] },
    snapshot_schema_version: 1,
    content_schema_version: 1,
  };
}

async function isHomePage(projectId: string, pageId: string): Promise<boolean> {
  const pages = await listProjectPages(projectId);
  return Boolean(pages.find((page) => page.id === pageId)?.is_home);
}

async function getStoredSections(projectId: string, pageId: string): Promise<Section[]> {
  const includeUnassigned = await isHomePage(projectId, pageId);
  return getProjectSections(projectId, [], pageId, { includeUnassigned });
}

function sharedToCmsSection(section: Section, pageId: string): SectionInstance {
  return {
    page_id: pageId,
    section_code: section.code,
    variant_id: section.variantId,
    order: section.order,
    enabled: section.enabled,
    content: section.content,
  };
}

function cmsToSharedSection(section: SectionInstance): Section {
  return {
    code: section.section_code,
    name: section.section_code,
    enabled: section.enabled,
    order: section.order,
    ...(section.variant_id ? { variantId: section.variant_id } : {}),
    ...(section.content ? { content: section.content } : {}),
  };
}

export async function createCmsPage(projectId: string, input: { title?: string; slug?: string }) {
  const page = await createProjectPage(projectId, input);
  const cmsPage = toCmsPage(
    {
      id: page.id,
      title: page.title,
      slug: page.slug,
      is_home: page.is_home,
      order: page.order,
      seo: page.seo ?? {},
      settings: page.settings ?? {},
    },
    projectId,
  );
  const errors = validateCmsPage(cmsPage);
  if (errors.length) throw new Error(errors.join("; "));
  return cmsPage;
}

export async function updateCmsPage(projectId: string, pageId: string, patch: {
  title?: string;
  slug?: string;
  order?: number;
  seo?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}) {
  const pages = await listProjectPages(projectId);
  const current = pages.find((item) => item.id === pageId);
  if (current) {
    const candidate = toCmsPage(
      {
        id: current.id,
        title: patch.title ?? current.title ?? (current.is_home ? "Home" : "Halaman"),
        slug: patch.slug ?? current.slug ?? "",
        is_home: Boolean(current.is_home),
        order: patch.order ?? current.order ?? 0,
        seo: (patch.seo ?? current.seo ?? {}) as Record<string, unknown>,
        settings: (patch.settings ?? current.settings ?? {}) as Record<string, unknown>,
      },
      projectId,
    );
    const errors = validateCmsPage(candidate);
    if (errors.length) throw new Error(errors.join("; "));
  }
  const page = await updateProjectPage(projectId, pageId, patch);
  if (!page) return null;
  return toCmsPage(
    {
      id: page.id,
      title: page.title,
      slug: page.slug,
      is_home: page.is_home,
      order: page.order,
      seo: page.seo ?? {},
      settings: page.settings ?? {},
    },
    projectId,
  );
}

export async function deleteCmsPage(projectId: string, pageId: string) {
  return deleteProjectPage(projectId, pageId);
}

export async function reorderCmsPages(projectId: string, orderedPageIds: string[]) {
  for (const [index, id] of orderedPageIds.entries()) {
    await updateProjectPage(projectId, id, { order: index + 1 });
  }
  return listCmsPages(projectId);
}

export async function listCmsSections(projectId: string, pageId: string): Promise<SectionInstance[]> {
  const sections = await getStoredSections(projectId, pageId);
  return sections.map((section) => sharedToCmsSection(section, pageId));
}

export async function toggleCmsSection(projectId: string, pageId: string, sectionCode: string, enabled: boolean) {
  const existing = await getStoredSections(projectId, pageId);
  const sections = existing.map((section) =>
    section.code === sectionCode ? { ...section, enabled } : section,
  );
  const result = await saveProjectSections(projectId, sections, pageId);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.sections.map((section) => sharedToCmsSection(section, pageId));
}

export async function reorderCmsSections(projectId: string, pageId: string, orderedSectionCodes: string[]) {
  const existing = await getStoredSections(projectId, pageId);
  const byCode = new Map(existing.map((section) => [section.code, section]));
  const sections = orderedSectionCodes
    .map((code, index) => {
      const section = byCode.get(code);
      if (!section) return null;
      return { ...section, order: index + 1 };
    })
    .filter((section): section is Section => Boolean(section));
  const result = await saveProjectSections(projectId, sections, pageId);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.sections.map((section) => sharedToCmsSection(section, pageId));
}

export async function selectCmsSectionVariant(projectId: string, pageId: string, sectionCode: string, variantId: string) {
  const existing = await getStoredSections(projectId, pageId);
  const sections = existing.map((section) =>
    section.code === sectionCode ? { ...section, variantId } : section,
  );
  const result = await saveProjectSections(projectId, sections, pageId);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.sections.map((section) => sharedToCmsSection(section, pageId));
}

export async function editCmsSectionContent(projectId: string, pageId: string, sectionCode: string, content: Record<string, unknown>) {
  const existing = await getStoredSections(projectId, pageId);
  const sections = existing.map((section) =>
    section.code === sectionCode ? { ...section, content } : section,
  );
  const result = await saveProjectSections(projectId, sections, pageId);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.sections.map((section) => sharedToCmsSection(section, pageId));
}

export async function editCmsSiteSettings(projectId: string, patch: CmsSiteSettings) {
  const project = await findProject(projectId).catch(() => null);
  if (project) {
    const site = mapLegacyProjectToCmsSite(project, {
      site_name: patch.site_name,
      footer_tagline: patch.footer_tagline,
    });
    const errors = validateCmsSite(site);
    if (errors.length) throw new Error(errors.join("; "));
  }
  const legacyPatch: Record<string, unknown> = {
    site_name: patch.site_name,
    footer_tagline: patch.footer_tagline,
  };
  if (patch.theme_id !== undefined) legacyPatch.theme_id = patch.theme_id;
  if (patch.tier !== undefined) legacyPatch.tier = patch.tier;
  return saveLegacySiteSettings(projectId, legacyPatch as never);
}

export function cmsSectionToLegacySection(section: SectionInstance): Section {
  return cmsToSharedSection(section);
}

export function legacySectionToCmsSection(section: Section, pageId: string): SectionInstance {
  return sharedToCmsSection(section, pageId);
}


export function mapLegacySiteSettingsToCms(settings: { site_name?: string; footer_tagline?: string } | null | undefined): CmsSiteSettings {
  return {
    site_name: settings?.site_name,
    footer_tagline: settings?.footer_tagline,
  };
}

export function mapLegacyProjectToCmsSite(project: { id: string; active_sections?: unknown }, settings?: { site_name?: string; footer_tagline?: string }): Site {
  const rawState = project.active_sections && typeof project.active_sections === "object" ? (project.active_sections as Record<string, unknown>) : {};
  const state = rawState as { theme_id?: string; tier?: "BASIC" | "PRO" | "AGENCY"; site_settings?: { site_name?: string; footer_tagline?: string } };
  const cmsSettings = mapLegacySiteSettingsToCms(settings ?? state.site_settings);
  return {
    id: project.id,
    project_ref: project.id,
    site_settings: {
      ...cmsSettings,
      theme_id: state.theme_id,
      tier: state.tier,
    },
    theme_tier_ref: state.theme_id ? { theme_id: state.theme_id, tier: state.tier ?? "BASIC" } : undefined,
  };
}

export function mapLegacyPageToCmsPage(page: PbProjectPage, siteId: string = page.project_id): Page {
  return toCmsPage(
    {
      id: page.id,
      title: page.title ?? (page.is_home ? "Home" : "Halaman"),
      slug: page.slug ?? "",
      is_home: Boolean(page.is_home),
      order: page.order ?? 0,
      seo: page.seo ?? {},
      settings: page.settings ?? {},
    },
    siteId || page.project_id,
  );
}

export function mapLegacySectionToCmsSection(section: Section, pageId: string): SectionInstance {
  return sharedToCmsSection(section, pageId);
}

export function mapCmsSectionToLegacy(section: SectionInstance): Section {
  return cmsToSharedSection(section);
}

export const legacyCompatibilityAdapter = {
  site: mapLegacyProjectToCmsSite,
  page: mapLegacyPageToCmsPage,
  section: {
    toCms: mapLegacySectionToCmsSection,
    toLegacy: mapCmsSectionToLegacy,
  },
  settings: mapLegacySiteSettingsToCms,
};

export const mapLegacyToCanonicalSite = mapLegacyProjectToCmsSite;
export const mapLegacyToCanonicalPage = mapLegacyPageToCmsPage;
export const mapLegacyToCanonicalSection = mapLegacySectionToCmsSection;
export const fromLegacySection = mapLegacySectionToCmsSection;
export const toCanonicalSection = mapLegacySectionToCmsSection;
export const fromCanonicalSection = mapCmsSectionToLegacy;

export function validateCmsPage(page: Page): string[] {
  const errors: string[] = [];
  if (!page.title?.trim()) errors.push("title wajib diisi.");
  if (page.is_home && page.slug && page.slug.trim() !== "") errors.push("Home slug harus kosong.");
  if (!page.is_home && !page.slug?.trim()) errors.push("slug wajib diisi.");
  return errors;
}

export function validateCmsSite(site: Site): string[] {
  const errors: string[] = [];
  if (!site.project_ref?.trim()) errors.push("project_ref wajib diisi.");
  return errors;
}
