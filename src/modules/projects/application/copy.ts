import {
  createRecord,
  escapeFilter,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import type { CopyField } from "@/shared/types";
import {
  ensureHomePage,
  findProject,
  getProjectSections,
  saveProjectSections,
} from "./projects";

interface PbAsset {
  id: string;
  project_id?: string;
  type?: string;
  meta?: { fields?: CopyField[] } | null;
}

export interface CopySiteSettings {
  site_name?: string;
  footer_tagline?: string;
}

export interface CopyContentOptions {
  businessName?: string;
  siteSettings?: CopySiteSettings;
}

export function applyCopyToContent(
  content: Record<string, unknown>,
  copy: CopyField[],
  options: CopyContentOptions = {},
): Record<string, unknown> {
  const copyMap = new Map(copy.map((field) => [field.key, field.value]));
  const hero = (content["S-HERO"] ?? {}) as Record<string, unknown>;
  const footer = (content["S-FOOT"] ?? {}) as Record<string, unknown>;
  const businessName =
    options.siteSettings?.site_name?.trim() || options.businessName;

  const ctaLabel = copyMap.get("cta_button");
  const existingCta =
    hero.primary_cta &&
    typeof hero.primary_cta === "object" &&
    !Array.isArray(hero.primary_cta)
      ? (hero.primary_cta as Record<string, unknown>)
      : {};
  const ctaHasTarget =
    typeof existingCta.href === "string" ||
    typeof existingCta.url === "string";

  content["S-HERO"] = {
    ...hero,
    ...(copyMap.get("hero_eyebrow")
      ? { eyebrow: copyMap.get("hero_eyebrow") }
      : {}),
    ...(copyMap.get("hero_title")
      ? { headline: copyMap.get("hero_title") }
      : {}),
    ...(copyMap.get("hero_subtitle")
      ? { subheadline: copyMap.get("hero_subtitle") }
      : {}),
    ...(ctaLabel
      ? {
          primary_cta: {
            ...existingCta,
            label: ctaLabel,
            ...(ctaHasTarget ? {} : { href: "#kontak" }),
          },
        }
      : {}),
  };
  content["S-FOOT"] = {
    ...footer,
    ...(businessName ? { business_name: businessName } : {}),
    ...(options.siteSettings?.footer_tagline
      ? { tagline: options.siteSettings.footer_tagline }
      : {}),
  };
  return content;
}

async function findCopyAsset(projectId: string) {
  const data = await listRecords<PbAsset>("content_assets", {
    filter: `project_id='${escapeFilter(projectId)}' && type='text'`,
    perPage: 1,
  });
  return data.items[0] ?? null;
}

async function applyCopyToSiteDocument(
  projectId: string,
  fields: CopyField[],
): Promise<void> {
  const project = await findProject(projectId);
  if (!project) return;
  const state =
    project.active_sections &&
    typeof project.active_sections === "object" &&
    !Array.isArray(project.active_sections)
      ? (project.active_sections as { site_settings?: CopySiteSettings })
      : {};
  const home = await ensureHomePage(projectId);
  if (!home) return;
  const sections = await getProjectSections(projectId, [], home.id);
  if (!sections.length) return;

  const content: Record<string, unknown> = {};
  for (const section of sections) {
    if (section.content) content[section.code] = section.content;
  }
  applyCopyToContent(content, fields, {
    businessName: project.client_label,
    siteSettings: state.site_settings ?? {},
  });
  const next = sections.map((section) => ({
    ...section,
    ...(content[section.code]
      ? { content: content[section.code] as Record<string, unknown> }
      : {}),
  }));
  const saved = await saveProjectSections(projectId, next, home.id);
  if (!saved.ok) {
    throw new Error(
      saved.errors[0] ?? "Gagal menyimpan copy ke site document.",
    );
  }
}

export async function getProjectCopy(
  projectId: string,
  fallback: CopyField[],
): Promise<CopyField[]> {
  try {
    const asset = await findCopyAsset(projectId);
    const fields = asset?.meta?.fields;
    if (Array.isArray(fields) && fields.length) {
      const byKey = new Map(fields.map((field) => [field.key, field]));
      return fallback.map((field) => byKey.get(field.key) ?? field);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function saveProjectCopy(
  projectId: string,
  fields: CopyField[],
): Promise<CopyField[]> {
  const existing = await findCopyAsset(projectId);
  const payload = {
    project_id: projectId,
    type: "text",
    meta: { fields },
  };
  if (existing) {
    await updateRecord<PbAsset>("content_assets", existing.id, payload);
  } else {
    await createRecord<PbAsset>("content_assets", payload);
  }
  await applyCopyToSiteDocument(projectId, fields);
  return fields;
}
