import path from "node:path";
import { promises as fs } from "node:fs";
import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "./pb-platform";
import { getLatestJob, getOutput, isOutputRevoked } from "./jobs-server";
import {
  findProject,
  getBusinessProfile,
  patchProject,
} from "./projects-server";
import { getProjectCopy } from "./copy-server";
import { renderTemplateHtml } from "./preview-render";
import { mockBusinessContext, mockCopy } from "./mock-data";
import type { JobVariant, PublishedPage } from "@/shared/types";

interface PbPublishedPage {
  id: string;
  project_id?: string;
  user_id?: string;
  slug?: string;
  status?: string;
  output_id?: string;
  variant_id?: string;
  template?: string;
  title?: string;
  noindex?: boolean;
  version?: number;
  published_at?: string;
  unpublished_at?: string;
  custom_domain?: string;
  created?: string;
  updated?: string;
}

export type PublishResult =
  | { ok: true; page: PublishedPage }
  | {
      ok: false;
      code: "NOT_FOUND" | "INVALID_TRANSITION" | "NO_OUTPUT";
      message: string;
    };

export function slugify(value: string): string {
  const normalized = (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return normalized || "halaman";
}

export function buildPublicPath(slug: string): string {
  return `/p/${slug}`;
}

export function publicBaseUrl(origin?: string): string {
  const configured =
    process.env.PUBLIC_PAGE_BASE_URL || process.env.NEXTAUTH_URL || "";
  return (configured || origin || "").replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function injectSeo(
  html: string,
  input: { url: string; title: string; description?: string; noindex?: boolean },
) {
  const tags = [
    `<link rel="canonical" href="${escapeHtml(input.url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(input.title)}">`,
    `<meta property="og:url" content="${escapeHtml(input.url)}">`,
    input.description
      ? `<meta name="description" content="${escapeHtml(input.description)}">`
      : "",
    input.description
      ? `<meta property="og:description" content="${escapeHtml(input.description)}">`
      : "",
    `<meta name="robots" content="${input.noindex ? "noindex,nofollow" : "index,follow"}">`,
  ]
    .filter(Boolean)
    .join("");
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${tags}</head>`);
  return `${tags}${html}`;
}

export function toPublishedPage(
  item: PbPublishedPage,
  origin?: string,
): PublishedPage {
  const slug = item.slug ?? "";
  const base = publicBaseUrl(origin);
  return {
    slug,
    url: base ? `${base}${buildPublicPath(slug)}` : buildPublicPath(slug),
    status: item.status === "UNPUBLISHED" ? "UNPUBLISHED" : "PUBLISHED",
    version: item.version ?? 1,
    title: item.title ?? "",
    noindex: Boolean(item.noindex),
    publishedAt: item.published_at || undefined,
    unpublishedAt: item.unpublished_at || undefined,
    customDomain: item.custom_domain || undefined,
  };
}

export async function findPublishedPageByProject(projectId: string) {
  const data = await listRecords<PbPublishedPage>("published_pages", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-version",
    perPage: 1,
  }).catch(() => null);
  return data?.items[0] ?? null;
}

export async function findPublishedPageBySlug(slug: string) {
  const data = await listRecords<PbPublishedPage>("published_pages", {
    filter: `slug='${escapeFilter(slug)}' && status='PUBLISHED'`,
    sort: "-version",
    perPage: 1,
  }).catch(() => null);
  return data?.items[0] ?? null;
}

export async function listPublishedPages(perPage = 200) {
  const data = await listRecords<PbPublishedPage>("published_pages", {
    filter: "status='PUBLISHED'",
    sort: "-published_at",
    perPage,
  }).catch(() => null);
  return data?.items ?? [];
}

async function slugTaken(slug: string) {
  const data = await listRecords<PbPublishedPage>("published_pages", {
    filter: `slug='${escapeFilter(slug)}'`,
    perPage: 1,
  }).catch(() => null);
  return Boolean(data?.items.length);
}

async function uniqueSlug(base: string) {
  const root = slugify(base);
  if (!(await slugTaken(root))) return root;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${root}-${index}`;
    if (!(await slugTaken(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function publishProject(projectId: string): Promise<PublishResult> {
  const project = await findProject(projectId).catch(() => null);
  if (!project) {
    return { ok: false, code: "NOT_FOUND", message: "Project tidak ditemukan." };
  }
  const status = project.status ?? "DRAFT";
  if (!["PAID", "DEPLOYED", "ACTIVE"].includes(status)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: "Publish memerlukan project berstatus PAID.",
    };
  }

  const job = await getLatestJob(projectId).catch(() => null);
  if (!job || job.status !== "READY" || !job.variants.length) {
    return {
      ok: false,
      code: "NO_OUTPUT",
      message: "Belum ada output READY untuk dipublish.",
    };
  }
  const output = await getOutput(job.id).catch(() => null);
  if (!output || isOutputRevoked(output)) {
    return {
      ok: false,
      code: "NO_OUTPUT",
      message: "Output tidak ditemukan atau sudah dicabut.",
    };
  }

  const template =
    output.report?.template ?? project.template_id ?? "LAND-LSPLIT-EDT-001";
  if (!/^[A-Za-z0-9-]+$/.test(template)) {
    return { ok: false, code: "NO_OUTPUT", message: "Template tidak valid." };
  }

  const chosen = (project.chosen_variant ?? null) as
    | { id?: string }
    | string
    | null;
  const chosenId =
    typeof chosen === "string" ? chosen : chosen?.id ?? undefined;
  const variantId =
    job.variants.find((variant) => variant.id === chosenId)?.id ??
    (job.variants[0] as JobVariant).id;

  const existing = await findPublishedPageByProject(projectId);
  const slug =
    existing?.slug ?? (await uniqueSlug(project.client_label ?? projectId));
  const now = new Date().toISOString();
  const payload = {
    project_id: projectId,
    user_id: project.user_id ?? "",
    slug,
    status: "PUBLISHED",
    output_id: job.id,
    variant_id: variantId,
    template,
    title: project.client_label ?? slug,
    noindex: false,
    version: (existing?.version ?? 0) + 1,
    published_at: now,
    unpublished_at: "",
  };
  const saved = existing
    ? await updateRecord<PbPublishedPage>("published_pages", existing.id, payload)
    : await createRecord<PbPublishedPage>("published_pages", payload);

  await patchProject(projectId, {
    status: "ACTIVE",
    preview_url: buildPublicPath(slug),
  }).catch(() => undefined);

  return { ok: true, page: toPublishedPage(saved) };
}

export async function unpublishProject(projectId: string) {
  const existing = await findPublishedPageByProject(projectId);
  if (!existing) return { ok: false as const, code: "NOT_FOUND" as const };
  const updated = await updateRecord<PbPublishedPage>(
    "published_pages",
    existing.id,
    {
      status: "UNPUBLISHED",
      unpublished_at: new Date().toISOString(),
    },
  );
  await patchProject(projectId, {
    status: "PAID",
    preview_url: "",
  }).catch(() => undefined);
  return { ok: true as const, page: toPublishedPage(updated) };
}

export async function resolvePublishedPage(slug: string) {
  if (!/^[a-z0-9-]{3,64}$/.test(slug)) return null;
  const page = await findPublishedPageBySlug(slug);
  if (!page || !page.output_id) return null;
  const output = await getOutput(page.output_id).catch(() => null);
  if (!output || output.status !== "READY" || isOutputRevoked(output)) {
    return null;
  }
  const project = await findProject(page.project_id ?? "").catch(() => null);
  if (!project) return null;
  const template = page.template ?? output.report?.template ?? "";
  if (!/^[A-Za-z0-9-]+$/.test(template)) return null;
  return { page, output, project, template, variantId: page.variant_id };
}

export async function renderPublishedPage(
  slug: string,
  origin?: string,
): Promise<string | null> {
  const resolved = await resolvePublishedPage(slug);
  if (!resolved) return null;
  const { page, output, project, template, variantId } = resolved;

  const profile = await getBusinessProfile(project.id).catch(() => null);
  const copy = await getProjectCopy(project.id, mockCopy);
  const copyMap = new Map(copy.map((field) => [field.key, field.value]));
  const business =
    profile?.business_name ??
    project.client_label ??
    mockBusinessContext.businessName;

  const binds: Record<string, string> = {
    business_name: business,
    hero_eyebrow: copyMap.get("hero_eyebrow") ?? "",
    hero_title: copyMap.get("hero_title") ?? "",
    hero_subtitle: copyMap.get("hero_subtitle") ?? "",
    header_cta: copyMap.get("cta_button") ?? "",
    hero_cta: copyMap.get("cta_button") ?? "",
    offer_cta: copyMap.get("cta_button") ?? "",
    footer_text: profile?.target_audience
      ? `${business} · ${profile.target_audience}`
      : business,
    year: String(new Date().getFullYear()),
  };

  const html = await renderTemplateHtml({
    template,
    assetBase: buildPublicPath(slug),
    variantId,
    binds,
    title: business,
  });
  const url = `${publicBaseUrl(origin)}${buildPublicPath(slug)}`;
  return injectSeo(html, {
    url: url || buildPublicPath(slug),
    title: business,
    description:
      output.report?.template
        ? `${business} — dibuat dengan JiooDev`
        : undefined,
    noindex: Boolean(page.noindex),
  });
}

export async function readPublishedAsset(
  slug: string,
  kind: "assets" | "shared",
  parts: string[],
) {
  const resolved = await resolvePublishedPage(slug);
  if (!resolved) return null;
  const root =
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library");
  const dir =
    kind === "shared"
      ? path.join(root, "templates", "_shared")
      : path.join(root, "templates", resolved.template, "assets");
  const file = path.join(dir, ...parts);
  if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) return null;
  try {
    return await fs.readFile(file);
  } catch {
    return null;
  }
}

export function publishedAssetType(file: string) {
  const types: Record<string, string> = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
  };
  return types[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}
