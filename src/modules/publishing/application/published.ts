import path from "node:path";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import { getLatestJob, getOutput, isOutputRevoked } from "@/modules/generation";
import {
  findProject,
  getBusinessProfile,
  getProjectAssetFile,
  listProjectPages,
  patchProject,
} from "@/modules/projects";
import { getProjectCopy } from "@/modules/projects";
import { renderTemplateHtml } from "@/modules/preview";
import {
  loadProjectSite,
  renderSiteSnapshot,
  toSiteSnapshot,
  type SiteSnapshot,
} from "@/modules/projects";
import { mockBusinessContext, mockCopy } from "@/shared/lib/mock-data";
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

export const PUBLISH_ADAPTER_ID = "html";
export const PUBLISH_ADAPTER_VERSION = "1";
export const PUBLISH_RENDERER_VERSION = "1";
export const PUBLISH_HASH_ALGORITHM_VERSION = "sha256-json-v1";
export const PUBLISH_SNAPSHOT_SCHEMA_VERSION = 1;

const ALLOWED_PUBLISHED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function normalizeMediaType(value: string | null | undefined) {
  return (value ?? "").split(";")[0].trim().toLowerCase();
}

export interface PublishPageSnapshot {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  seo: Record<string, unknown>;
  settings: Record<string, unknown>;
  site: SiteSnapshot;
  html?: string;
  html_hash?: string;
  render_hash?: string;
  hash_algorithm_version?: string;
}

export interface LegacyPublishSnapshot {
  template: string;
  variantId?: string;
  businessName: string;
  html: string;
  html_hash: string;
  diagnostics?: string[];
}

export interface PublishSnapshotReport {
  kind: "publish";
  template: string;
  site: SiteSnapshot | null;
  pages: PublishPageSnapshot[];
  publish_revision: string;
  idempotency_key: string;
  client_idempotency_key?: string;
  render_hash: string;
  hash_algorithm_version: string;
  snapshot_schema_version: number;
  adapter_id: string;
  adapter_version: string;
  renderer_version: string;
  asset_manifest?: Array<{ path: string; hash: string }>;
  legacy?: LegacyPublishSnapshot;
}

export interface PublishCandidatePage {
  snapshot: PublishPageSnapshot;
  html: string;
  hash: string;
  url: string;
  title: string;
  noindex: boolean;
}

export interface PublishCandidateLegacy {
  html: string;
  hash: string;
  url: string;
  title: string;
  noindex: boolean;
  businessName: string;
}

export interface PublishCandidate {
  projectId: string;
  projectLabel?: string;
  slug: string;
  template: string;
  businessName?: string;
  site: SiteSnapshot | null;
  pages: PublishCandidatePage[];
  legacy?: PublishCandidateLegacy;
  assetManifest?: Array<{ path: string; hash: string }>;
  renderHash: string;
}

export interface PublishHealth {
  ok: boolean;
  message?: string;
  checks?: Record<string, boolean>;
}

export type PublishHealthCheck = (
  candidate: PublishCandidate,
) => Promise<PublishHealth>;

export interface PublishOptions {
  idempotencyKey?: string;
  healthCheck?: PublishHealthCheck;
}

export type PublishFailureCode =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "NO_OUTPUT"
  | "PAYMENT_REQUIRED"
  | "VALIDATION_FAILED"
  | "RENDER_FAILED"
  | "HEALTH_FAILED"
  | "CONFLICT";

export type PublishResult =
  | { ok: true; page: PublishedPage; idempotent?: boolean }
  | {
      ok: false;
      code: PublishFailureCode;
      message: string;
    };

interface PbPublishOutput {
  id: string;
  project_id?: string;
  version?: number;
  status?: string;
  idempotency_key?: string;
  report?: PublishSnapshotReport | null;
  created: string;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const entry = (value as Record<string, unknown>)[key];
        if (entry !== undefined) acc[key] = canonicalize(entry);
        return acc;
      }, {});
  }
  return value;
}

function collectPublishedProjectAssetIds(html: string, projectId: string): string[] {
  const matches = html.matchAll(
    new RegExp(`/api/projects/${projectId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/assets/([A-Za-z0-9]+)/file`, "g"),
  );
  return [...new Set([...matches].map((match) => match[1]).filter(Boolean))];
}

function containsPrivateProjectAssetPath(html: string) {
  return /\/api\/projects\/[A-Za-z0-9_-]+\/assets\/[A-Za-z0-9_-]+\/file/.test(html);
}

async function resolvePublishedMediaForPublish(
  projectId: string,
  assetId: string,
): Promise<{ ok: true; hash: string } | { ok: false; message: string }> {
  let asset: Awaited<ReturnType<typeof getProjectAssetFile>>;
  try {
    asset = await getProjectAssetFile(projectId, assetId);
  } catch {
    return {
      ok: false,
      message: `Media ${assetId} tidak dapat dibaca saat publish.`,
    };
  }
  if (!asset || !asset.stream) {
    return { ok: false, message: `Media ${assetId} tidak ditemukan.` };
  }
  const contentType = normalizeMediaType(asset.contentType);
  if (!ALLOWED_PUBLISHED_MEDIA_TYPES.has(contentType)) {
    return {
      ok: false,
      message: `Media ${assetId} tidak didukung (${contentType || "unknown"}).`,
    };
  }
  try {
    const buffer = await new Response(asset.stream).arrayBuffer();
    return {
      ok: true,
      hash: createHash("sha256").update(Buffer.from(buffer)).digest("hex"),
    };
  } catch {
    return {
      ok: false,
      message: `Media ${assetId} tidak dapat dibaca saat publish.`,
    };
  }
}

async function rewritePublishedMediaUrls(input: {
  html: string;
  projectId: string;
  slug: string;
  manifest: Map<string, string>;
}): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  let html = input.html;
  for (const assetId of collectPublishedProjectAssetIds(html, input.projectId)) {
    let hash = input.manifest.get(assetId);
    if (!hash) {
      const resolved = await resolvePublishedMediaForPublish(
        input.projectId,
        assetId,
      );
      if (!resolved.ok) return resolved;
      hash = resolved.hash;
      input.manifest.set(assetId, hash);
    }
    const privatePath = `/api/projects/${input.projectId}/assets/${assetId}/file`;
    const publicPath = `/p/${input.slug}/media/${assetId}`;
    html = html.split(privatePath).join(publicPath);
  }
  if (containsPrivateProjectAssetPath(html)) {
    return {
      ok: false,
      message:
        "Media project masih mereferensikan URL privat yang tidak dapat dipublish.",
    };
  }
  return { ok: true, html };
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function snapshotBusinessName(site: SiteSnapshot | null) {
  for (const value of Object.values(site?.content ?? {})) {
    if (!value || typeof value !== "object") continue;
    const name = (value as Record<string, unknown>).business_name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return undefined;
}

export function publishPageTitle(input: {
  seoTitle?: unknown;
  isHome: boolean;
  pageTitle?: string;
  projectLabel?: string;
  slug: string;
}) {
  if (typeof input.seoTitle === "string" && input.seoTitle.trim()) {
    return input.seoTitle.trim();
  }
  if (input.isHome && input.projectLabel?.trim()) return input.projectLabel.trim();
  return (
    input.pageTitle?.trim() ||
    input.projectLabel?.trim() ||
    input.slug ||
    "JiooDev"
  );
}

function sortAssetManifest(
  entries: Iterable<{ path: string; hash: string }>,
): Array<{ path: string; hash: string }> {
  return [...entries].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}

function candidateRenderHash(input: {
  pages: PublishCandidatePage[];
  legacy?: PublishCandidateLegacy;
  assetManifest?: Array<{ path: string; hash: string }>;
}) {
  return sha256({
    pages: input.pages.map((page) => ({
      html: page.hash,
      render: page.snapshot.render_hash ?? null,
    })),
    legacy: input.legacy?.hash ?? null,
    assets: sortAssetManifest(input.assetManifest ?? []),
  });
}

function collectReferencedProjectMediaIds(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(
    /\/api\/projects\/[A-Za-z0-9_-]+\/assets\/([A-Za-z0-9]+)\/file/g,
  )) {
    if (match[1]) ids.add(match[1]);
  }
  for (const match of html.matchAll(/\/p\/[^/"'\s<>]+\/media\/([A-Za-z0-9]+)/g)) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

export async function defaultPublishHealthCheck(
  candidate: PublishCandidate,
): Promise<PublishHealth> {
  const allHtml = [
    ...candidate.pages.map((page) => page.html),
    ...(candidate.legacy ? [candidate.legacy.html] : []),
  ];
  const allHashesMatch =
    candidate.pages.every((page) => page.hash === sha256(page.html)) &&
    (candidate.legacy ? candidate.legacy.hash === sha256(candidate.legacy.html) : true);
  const manifest = Array.isArray(candidate.assetManifest)
    ? candidate.assetManifest
    : [];
  const manifestByPath = new Map(
    manifest
      .filter(
        (entry) =>
          entry &&
          typeof entry.path === "string" &&
          typeof entry.hash === "string",
      )
      .map((entry) => [entry.path, entry.hash]),
  );
  const referencedMediaIds = [
    ...new Set(allHtml.flatMap(collectReferencedProjectMediaIds)),
  ];
  let mediaOk = !allHtml.some(containsPrivateProjectAssetPath);
  for (const assetId of referencedMediaIds) {
    if (!/^[A-Za-z0-9]+$/.test(assetId)) {
      mediaOk = false;
      continue;
    }
    const entryHash = manifestByPath.get(`media/${assetId}`);
    if (!entryHash || !/^[a-f0-9]{64}$/i.test(entryHash)) {
      mediaOk = false;
      continue;
    }
    if (candidate.projectId) {
      try {
        const asset = await getProjectAssetFile(candidate.projectId, assetId);
        if (!asset || !asset.stream) {
          mediaOk = false;
          continue;
        }
        const contentType = normalizeMediaType(asset.contentType);
        if (!ALLOWED_PUBLISHED_MEDIA_TYPES.has(contentType)) {
          mediaOk = false;
          continue;
        }
        let buffer: ArrayBuffer;
        try {
          buffer = await new Response(asset.stream).arrayBuffer();
        } catch {
          continue;
        }
        if (buffer.byteLength > 0) {
          const actualHash = createHash("sha256")
            .update(Buffer.from(buffer))
            .digest("hex");
          if (actualHash !== entryHash) {
            mediaOk = false;
          }
        }
      } catch {
        mediaOk = false;
      }
    }
  }
  const seoChecks = [
    ...candidate.pages.map((page) => ({
      html: page.html,
      url: page.url,
      title: page.title,
      noindex: page.noindex,
    })),
    ...(candidate.legacy
      ? [
          {
            html: candidate.legacy.html,
            url: candidate.legacy.url,
            title: candidate.legacy.title,
            noindex: candidate.legacy.noindex,
          },
        ]
      : []),
  ];
  const checks: Record<string, boolean> = {
    template: /^[A-Za-z0-9-]+$/.test(candidate.template),
    render:
      allHtml.length > 0 &&
      allHtml.every((html) => typeof html === "string" && html.trim().length > 0),
    document: allHtml.every(
      (html) => /<body[\s>]/i.test(html) && /<\/html>/i.test(html),
    ),
    hash:
      candidate.renderHash ===
        candidateRenderHash(candidate) && allHashesMatch,
    diagnostics: allHtml.every(
      (html) => !/data-diagnostic=["']FAILED["']/i.test(html),
    ),
    seo: seoChecks.every((page) => {
      const injected = injectSeo(applyPageTitle(page.html, page.title), {
        url: page.url,
        title: page.title,
        noindex: page.noindex,
      });
      return (
        injected.includes(
          `rel="canonical" href="${escapeHtml(page.url)}"`,
        ) &&
        injected.includes('name="robots"') &&
        injected.includes(`<title>${escapeHtml(page.title)}</title>`)
      );
    }),
    home: candidate.legacy
      ? true
      : candidate.pages.some((page) => page.snapshot.isHome),
    business: candidate.businessName
      ? allHtml.some((html) =>
          html.includes(escapeHtml(candidate.businessName ?? "")),
        )
      : true,
    media: mediaOk,
    assets: mediaOk,
    referencedMedia: mediaOk,
    projectMedia: mediaOk,
    assetManifest: mediaOk,
    publicMedia: mediaOk,
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  return {
    ok: failed.length === 0,
    checks,
    message:
      failed.length === 0
        ? "Health gate lulus."
        : `Health gate gagal: ${failed.join(", ")}.`,
  };
}

interface PbPaymentLite {
  id: string;
  project_id?: string;
  status?: string;
  created: string;
}

export async function checkPublishPayment(
  projectId: string,
  projectStatus: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (await subscriptionEntitledForProject(projectId)) {
    return { ok: true };
  }
  const data = await listRecords<PbPaymentLite>("payments", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 1,
  });
  const latest = data.items[0];
  if (!latest) {
    if (["PAID", "DEPLOYED", "ACTIVE"].includes(projectStatus)) {
      return { ok: true };
    }
    return {
      ok: false,
      message: "Publish memerlukan pembayaran CONFIRMED.",
    };
  }
  if (latest.status === "CONFIRMED") return { ok: true };
  return {
    ok: false,
    message: "Publish memerlukan pembayaran CONFIRMED yang masih berlaku.",
  };
}

interface PbSubscriptionLite {
  id: string;
  user_id?: string;
  package_id?: string;
  quota_landing_total?: number;
  quota_landing_used?: number;
  quota_web_total?: number;
  quota_web_used?: number;
  status?: string;
  period_end?: string;
}

interface PbPackageLite {
  id: string;
  billing_type?: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
}

interface PbProjectLite {
  id: string;
  user_id?: string;
}

async function getProjectUserId(projectId: string): Promise<string | null> {
  const project = await listRecords<PbProjectLite>("projects", {
    filter: `id='${escapeFilter(projectId)}'`,
    perPage: 1,
  }).catch(() => ({ items: [] as PbProjectLite[] }));
  return project.items[0]?.user_id ?? null;
}

function getRemainingQuota(sub: PbSubscriptionLite): number {
  const landing = (sub.quota_landing_total ?? 0) - (sub.quota_landing_used ?? 0);
  const web = (sub.quota_web_total ?? 0) - (sub.quota_web_used ?? 0);
  return Math.max(0, landing + web);
}

function isSubscriptionActive(sub: PbSubscriptionLite): boolean {
  const periodEnd = sub.period_end;
  if (!periodEnd) return true;
  return new Date(periodEnd).getTime() > Date.now();
}

async function fetchPackageBillingType(packageId?: string): Promise<"LIFETIME" | null> {
  if (!packageId) return null;
  try {
    const pkg = await getRecord<PbPackageLite>("packages", packageId);
    if (pkg.billing_type === "LIFETIME") return "LIFETIME";
  } catch {
    return null;
  }
  return null;
}

export async function subscriptionEntitledForProject(projectId: string): Promise<boolean> {
  const userId = await getProjectUserId(projectId);
  if (!userId) return false;

  const data = await listRecords<PbSubscriptionLite>("subscriptions", {
    filter: `user_id='${escapeFilter(userId)}' && status='ACTIVE'`,
    sort: "-period_end",
    perPage: 50,
  }).catch(() => ({ items: [] as PbSubscriptionLite[] }));

  for (const sub of data.items) {
    const remaining = getRemainingQuota(sub);
    if (remaining <= 0) continue;

    const billingType = await fetchPackageBillingType(sub.package_id);
    if (billingType === "LIFETIME") return true;
    if (isSubscriptionActive(sub)) return true;
  }

  return false;
}

export const paymentGateBypasses = subscriptionEntitledForProject;

function isConflictResponse(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return status === 409;
}

export function slugify(value: string): string {
  const normalized = (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  const root = normalized || "halaman";
  return root.length >= 3 ? root : `${root}-page`;
}

export function isValidPublicSlug(slug: string) {
  return /^[a-z0-9-]{3,64}$/.test(slug);
}

export function buildPublicPath(slug: string, pageSlug?: string): string {
  return pageSlug ? `/p/${slug}/${pageSlug}` : `/p/${slug}`;
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

function applyPageTitle(html: string, title: string) {
  const tag = `<title>${escapeHtml(title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, tag);
  }
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head[^>]*>/i, `$&${tag}`);
  }
  return `${tag}${html}`;
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
  });
  return data.items[0] ?? null;
}

export async function findActivePublishedPageByProject(projectId: string) {
  const data = await listRecords<PbPublishedPage>("published_pages", {
    filter: `project_id='${escapeFilter(projectId)}' && status='PUBLISHED'`,
    sort: "-version",
    perPage: 1,
  });
  return data.items[0] ?? null;
}

export async function findPublishedPageBySlug(slug: string) {
  const data = await listRecords<PbPublishedPage>("published_pages", {
    filter: `slug='${escapeFilter(slug)}' && status='PUBLISHED'`,
    sort: "-version",
    perPage: 1,
  });
  return data.items[0] ?? null;
}

export async function listPublishedPages(perPage = 200) {
  const data = await listRecords<PbPublishedPage>("published_pages", {
    filter: "status='PUBLISHED'",
    sort: "-published_at",
    perPage,
  });
  return data.items;
}

async function slugTaken(slug: string) {
  const data = await listRecords<PbPublishedPage>("published_pages", {
    filter: `slug='${escapeFilter(slug)}'`,
    perPage: 1,
  });
  return Boolean(data.items.length);
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

async function renderLegacyCandidate(
  project: { id: string; client_label?: string },
  template: string,
  variantId: string | undefined,
  assetBase: string,
) {
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
    assetBase,
    variantId,
    binds,
    title: business,
  });
  return { html, businessName: business };
}

export async function publishProject(
  projectId: string,
  options: PublishOptions = {},
): Promise<PublishResult> {
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

  const payment = await checkPublishPayment(projectId, status);
  if (!payment.ok) {
    return { ok: false, code: "PAYMENT_REQUIRED", message: payment.message };
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

  const projectPages = await listProjectPages(projectId);
  const visiblePages = projectPages.filter(
    (page) => page.is_home === true || page.settings?.hidden !== true,
  );
  const pageSnapshots: PublishPageSnapshot[] = [];
  for (const projectPage of visiblePages) {
    const pageSite = await loadProjectSite(projectId, projectPage.id);
    if (!pageSite) {
      return {
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Snapshot CMS tidak lengkap; publish dibatalkan.",
      };
    }
    pageSnapshots.push({
      id: projectPage.id,
      title: projectPage.title ?? (projectPage.is_home ? "Home" : "Halaman"),
      slug: projectPage.slug ?? "",
      isHome: Boolean(projectPage.is_home),
      seo: projectPage.seo ?? {},
      settings: projectPage.settings ?? {},
      site: toSiteSnapshot(pageSite),
    });
  }
  const homePage = pageSnapshots.find((page) => page.isHome) ?? pageSnapshots[0];
  if (homePage?.settings?.hidden === true) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Home tidak boleh disembunyikan saat publish.",
    };
  }
  const site = homePage?.site ?? null;

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
  const existingSlug =
    existing && isValidPublicSlug(existing.slug ?? "") ? existing.slug : null;
  const slug =
    existingSlug ?? (await uniqueSlug(project.client_label ?? projectId));
  const base = publicBaseUrl();

  const candidatePages: PublishCandidatePage[] = [];
  const publishedAssetManifest = new Map<string, string>();
  let legacyCandidate: PublishCandidateLegacy | undefined;
  let businessName: string | undefined;
  if (site) {
    for (const pageSnapshot of pageSnapshots) {
      const rendered = await renderSiteSnapshot(pageSnapshot.site, {
        renderMode: "publish",
      }).catch(() => null);
      if (!rendered?.html || !rendered.html.trim()) {
        return {
          ok: false,
          code: "RENDER_FAILED",
          message: "Render candidate tidak menghasilkan halaman yang valid.",
        };
      }
      const url = `${base}${buildPublicPath(
        slug,
        pageSnapshot.isHome ? undefined : pageSnapshot.slug,
      )}`;
      const title = publishPageTitle({
        seoTitle: pageSnapshot.seo.title,
        isHome: pageSnapshot.isHome,
        pageTitle: pageSnapshot.title,
        projectLabel: project.client_label,
        slug,
      });
      const noindex = Boolean(pageSnapshot.seo.noindex);
      const rewritten = await rewritePublishedMediaUrls({
        html: rendered.html,
        projectId,
        slug,
        manifest: publishedAssetManifest,
      });
      if (!rewritten.ok) {
        return {
          ok: false,
          code: "RENDER_FAILED",
          message: rewritten.message,
        };
      }
      const html = rewritten.html;
      const hash = sha256(html);
      pageSnapshot.html = html;
      pageSnapshot.html_hash = hash;
      if (rendered.render_hash) {
        pageSnapshot.render_hash = rendered.render_hash;
        pageSnapshot.hash_algorithm_version =
          rendered.hash_algorithm_version;
      }
      candidatePages.push({
        snapshot: pageSnapshot,
        html,
        hash,
        url,
        title,
        noindex,
      });
    }
    businessName = snapshotBusinessName(site);
  } else {
    const rendered = await renderLegacyCandidate(
      project,
      template,
      variantId,
      buildPublicPath(slug),
    ).catch(() => null);
    if (!rendered?.html || !rendered.html.trim()) {
      return {
        ok: false,
        code: "RENDER_FAILED",
        message: "Render candidate tidak menghasilkan halaman yang valid.",
      };
    }
    const html = rendered.html;
    legacyCandidate = {
      html,
      hash: sha256(html),
      url: `${base}${buildPublicPath(slug)}`,
      title: rendered.businessName,
      noindex: false,
      businessName: rendered.businessName,
    };
    businessName = rendered.businessName;
  }

  const assetManifest = sortAssetManifest(
    [...publishedAssetManifest.entries()].map(([assetId, hash]) => ({
      path: `media/${assetId}`,
      hash,
    })),
  );
  const candidateForHash = {
    pages: candidatePages,
    legacy: legacyCandidate,
    assetManifest,
  };
  const renderHash = candidateRenderHash(candidateForHash);
  const publishRevision = sha256({
    projectId,
    template,
    site,
    pages: pageSnapshots,
    assetManifest,
    renderHash,
  });
  const idempotencyKey = sha256({ projectId, publishRevision });

  const outputs = await listRecords<PbPublishOutput>("production_outputs", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 200,
  });
  const publishOutputs = outputs.items.filter(
    (item) => item.report?.kind === "publish",
  );
  let candidate =
    publishOutputs.find(
      (item) =>
        item.idempotency_key === idempotencyKey ||
        item.report?.idempotency_key === idempotencyKey,
    ) ?? null;
  const versionRows = await listRecords<PbPublishOutput>(
    "production_outputs",
    {
      filter: `project_id='${escapeFilter(
        projectId,
      )}' && idempotency_key!=''`,
      sort: "-version",
      perPage: 1,
    },
  );
  const maxPublishVersion = Math.max(
    publishOutputs.reduce(
      (max, item) => Math.max(max, Number(item.version ?? 0)),
      0,
    ),
    Number(versionRows.items[0]?.version ?? 0),
  );

  if (candidate) {
    const active = await findActivePublishedPageByProject(projectId);
    if (active?.output_id === candidate.id) {
      if (status !== "ACTIVE") {
        await patchProject(projectId, {
          status: "ACTIVE",
          preview_url: buildPublicPath(slug),
        });
      }
      return { ok: true, page: toPublishedPage(active), idempotent: true };
    }
  }

  if (!candidate) {
    const report: PublishSnapshotReport = {
      kind: "publish",
      template,
      site,
      pages: pageSnapshots,
      publish_revision: publishRevision,
      idempotency_key: idempotencyKey,
      ...(options.idempotencyKey
        ? { client_idempotency_key: options.idempotencyKey }
        : {}),
      render_hash: renderHash,
      hash_algorithm_version: PUBLISH_HASH_ALGORITHM_VERSION,
      snapshot_schema_version: PUBLISH_SNAPSHOT_SCHEMA_VERSION,
      adapter_id: PUBLISH_ADAPTER_ID,
      adapter_version: PUBLISH_ADAPTER_VERSION,
      renderer_version: PUBLISH_RENDERER_VERSION,
      asset_manifest: assetManifest,
      ...(legacyCandidate
        ? {
            legacy: {
              template,
              variantId,
              businessName: legacyCandidate.businessName,
              html: legacyCandidate.html,
              html_hash: legacyCandidate.hash,
              diagnostics: [
                "Legacy template path is transitional (D-S2.2-05); it is not a second adapter.",
              ],
            },
          }
        : {}),
    };
    try {
      candidate = await createRecord<PbPublishOutput>("production_outputs", {
        project_id: projectId,
        version: maxPublishVersion + 1,
        status: "CANDIDATE",
        idempotency_key: idempotencyKey,
        report,
      });
    } catch (error) {
      if (!isConflictResponse(error)) throw error;
      const conflicting = await listRecords<PbPublishOutput>(
        "production_outputs",
        {
          filter: `project_id='${escapeFilter(
            projectId,
          )}' && idempotency_key='${escapeFilter(idempotencyKey)}'`,
          perPage: 1,
        },
      );
      candidate = conflicting.items[0] ?? null;
      if (!candidate) throw error;
    }
  }

  if (status === "PAID") {
    await patchProject(projectId, { status: "DEPLOYED" });
  }

  const healthCheck = options.healthCheck ?? defaultPublishHealthCheck;
  const health = await healthCheck({
    projectId,
    projectLabel: project.client_label,
    slug,
    template,
    businessName,
    site,
    pages: candidatePages,
    legacy: legacyCandidate,
    assetManifest,
    renderHash,
  }).catch(() => ({
    ok: false,
    message: "Health gate gagal dijalankan.",
  }));
  if (!health.ok) {
    return {
      ok: false,
      code: "HEALTH_FAILED",
      message: health.message ?? "Health gate gagal.",
    };
  }

  await updateRecord<PbPublishOutput>("production_outputs", candidate.id, {
    status: "READY",
  });

  const active = await findActivePublishedPageByProject(projectId);
  if (active?.output_id === candidate.id) {
    return { ok: true, page: toPublishedPage(active), idempotent: true };
  }
  if (active && (!existing || active.id !== existing.id)) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "Publish lain sedang berjalan; coba lagi.",
    };
  }

  const now = new Date().toISOString();
  const payload = {
    project_id: projectId,
    user_id: project.user_id ?? "",
    slug,
    status: "PUBLISHED",
    output_id: candidate.id,
    variant_id: variantId,
    template,
    title: project.client_label ?? slug,
    noindex: false,
    version: (existing?.version ?? 0) + 1,
    published_at: now,
    unpublished_at: "",
  };
  let saved: PbPublishedPage;
  try {
    saved = existing
      ? await updateRecord<PbPublishedPage>(
          "published_pages",
          existing.id,
          payload,
        )
      : await createRecord<PbPublishedPage>("published_pages", payload);
  } catch (error) {
    if (!isConflictResponse(error)) throw error;
    const conflicted = await findActivePublishedPageByProject(projectId);
    if (conflicted?.output_id === candidate.id) {
      saved = conflicted;
    } else if (conflicted) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "Publish lain sedang berjalan; coba lagi.",
      };
    } else {
      throw error;
    }
  }

  await patchProject(projectId, {
    status: "ACTIVE",
    preview_url: buildPublicPath(slug),
  });

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
  });
  return { ok: true as const, page: toPublishedPage(updated) };
}

export async function resolvePublishedPage(slug: string) {
  if (!isValidPublicSlug(slug)) return null;
  const page = await findPublishedPageBySlug(slug);
  if (!page || !page.output_id) return null;
  const output = await getOutput(page.output_id).catch(() => null);
  if (!output || output.status !== "READY" || isOutputRevoked(output)) {
    return null;
  }
  if (
    !page.project_id ||
    !output.project_id ||
    output.project_id !== page.project_id
  ) {
    return null;
  }
  const project = await findProject(page.project_id).catch(() => null);
  if (!project) return null;
  if (project.status && project.status !== "ACTIVE") return null;
  const template = page.template ?? output.report?.template ?? "";
  if (!/^[A-Za-z0-9-]+$/.test(template)) return null;
  return { page, output, project, template, variantId: page.variant_id };
}

function htmlIntegrityMatches(html: string, expected?: string) {
  return !expected || expected === sha256(html);
}

export async function renderPublishedPage(
  slug: string,
  origin?: string,
  pageSlug?: string,
): Promise<string | null> {
  const resolved = await resolvePublishedPage(slug);
  if (!resolved) return null;
  const { page, output, project, template, variantId } = resolved;
  const base = publicBaseUrl(origin);

  if (output.report?.kind === "publish" && output.report.site) {
    const pages = output.report.pages ?? [];
    const fallbackTarget: PublishPageSnapshot = {
      id: "home",
      title: page.title ?? project.client_label ?? "Home",
      slug: "",
      isHome: true,
      seo: {},
      settings: {},
      site: output.report.site as SiteSnapshot,
    };
    const target: PublishPageSnapshot | undefined = pageSlug
      ? pages.find((item) => item.slug === pageSlug)
      : pages.find((item) => item.isHome) ?? fallbackTarget;
    if (!target || target.settings?.hidden === true) return null;
    let html: string;
    if (target.html) {
      if (!htmlIntegrityMatches(target.html, target.html_hash)) return null;
      html = target.html;
    } else {
      const rendered = await renderSiteSnapshot(target.site, {
        renderMode: "publish",
      });
      if (
        target.render_hash &&
        rendered.render_hash &&
        target.render_hash !== rendered.render_hash
      ) {
        return null;
      }
      html = rendered.html;
    }
    const publicUrl = `${base}${buildPublicPath(
      page.slug ?? "",
      target.isHome ? undefined : target.slug,
    )}`;
    const seo = target.seo ?? {};
    const title = publishPageTitle({
      seoTitle: seo.title,
      isHome: target.isHome,
      pageTitle: target.title,
      projectLabel: project.client_label,
      slug: page.slug ?? "",
    });
    const description =
      (typeof seo.description === "string" && seo.description) ||
      `${project.client_label ?? target.title ?? "JiooDev"} — dibuat dengan JiooDev`;
    return injectSeo(applyPageTitle(html, title), {
      url: publicUrl || buildPublicPath(page.slug ?? ""),
      title,
      description,
      noindex: Boolean(seo.noindex) || Boolean(page.noindex),
    });
  }

  if (output.report?.kind === "publish" && output.report.legacy) {
    const legacy = output.report.legacy;
    if (!htmlIntegrityMatches(legacy.html, legacy.html_hash)) return null;
    const url = `${base}${buildPublicPath(slug)}`;
    return injectSeo(applyPageTitle(legacy.html, legacy.businessName), {
      url: url || buildPublicPath(slug),
      title: legacy.businessName,
      description: `${legacy.businessName} — dibuat dengan JiooDev`,
      noindex: Boolean(page.noindex),
    });
  }

  const legacy = await renderLegacyCandidate(
    project,
    template,
    variantId,
    buildPublicPath(slug),
  );
  const url = `${base}${buildPublicPath(slug)}`;
  return injectSeo(legacy.html, {
    url: url || buildPublicPath(slug),
    title: legacy.businessName,
    description: output.report?.template
      ? `${legacy.businessName} — dibuat dengan JiooDev`
      : undefined,
    noindex: Boolean(page.noindex),
  });
}

export type PublishedProjectAssetReadResult =
  | {
      status: "ok";
      stream: ReadableStream<Uint8Array>;
      contentType: string;
    }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function readPublishedProjectAssetResult(
  slug: string,
  assetId: string,
): Promise<PublishedProjectAssetReadResult> {
  if (!isValidPublicSlug(slug)) return { status: "not_found" };
  if (!/^[A-Za-z0-9]+$/.test(assetId)) return { status: "not_found" };

  let resolved: Awaited<ReturnType<typeof resolvePublishedPage>>;
  try {
    resolved = await resolvePublishedPage(slug);
  } catch {
    return { status: "unavailable" };
  }
  if (!resolved) return { status: "not_found" };
  const { output, project } = resolved;

  const report = output.report;
  if (report?.kind !== "publish") return { status: "not_found" };
  const manifest = Array.isArray(report.asset_manifest)
    ? report.asset_manifest
    : [];
  const entry = manifest.find(
    (item) => item?.path === `media/${assetId}` && typeof item.hash === "string",
  );
  if (!entry) return { status: "not_found" };

  let asset: Awaited<ReturnType<typeof getProjectAssetFile>>;
  try {
    asset = await getProjectAssetFile(project.id, assetId);
  } catch {
    return { status: "unavailable" };
  }
  if (!asset || !asset.stream) return { status: "not_found" };
  const contentType = normalizeMediaType(asset.contentType);
  if (!ALLOWED_PUBLISHED_MEDIA_TYPES.has(contentType)) {
    return { status: "not_found" };
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await new Response(asset.stream).arrayBuffer();
  } catch {
    return { status: "unavailable" };
  }
  const actualHash = createHash("sha256")
    .update(Buffer.from(buffer))
    .digest("hex");
  if (actualHash !== entry.hash) return { status: "not_found" };

  const body = new Response(buffer).body;
  if (!body) return { status: "unavailable" };
  return { status: "ok", stream: body, contentType };
}

export async function readPublishedProjectAsset(
  slug: string,
  assetId: string,
): Promise<{ stream: ReadableStream<Uint8Array> | null; contentType: string } | null> {
  const result = await readPublishedProjectAssetResult(slug, assetId);
  if (result.status !== "ok") return null;
  return { stream: result.stream, contentType: result.contentType };
}

export async function resolvePublishedProjectAsset(slug: string, assetId: string) {
  return readPublishedProjectAsset(slug, assetId);
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

export async function listOrphanedPublishOutputs(projectId: string) {
  const outputs = await listRecords<PbPublishOutput>("production_outputs", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 200,
  });
  const publishOutputs = outputs.items.filter(
    (item) => item.report?.kind === "publish",
  );
  const pages = await listRecords<PbPublishedPage>("published_pages", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    perPage: 200,
  });
  const referenced = new Set(
    pages.items.map((item) => item.output_id).filter(Boolean),
  );
  return publishOutputs.filter((item) => !referenced.has(item.id));
}

export async function reconcilePublishingProject(projectId: string) {
  const project = await findProject(projectId).catch(() => null);
  const orphaned = await listOrphanedPublishOutputs(projectId);
  let failedCandidates = 0;
  for (const output of orphaned) {
    if (output.status !== "CANDIDATE") continue;
    try {
      await updateRecord<PbPublishOutput>("production_outputs", output.id, {
        status: "FAILED",
      });
      failedCandidates += 1;
    } catch {
      // Leave the candidate for a later retry; do not throw for reconciliation.
    }
  }
  let staleDeployedRecovered = false;
  if (project?.status === "DEPLOYED") {
    const active = await findActivePublishedPageByProject(projectId).catch(
      () => null,
    );
    if (!active) {
      try {
        await patchProject(projectId, { status: "PAID" });
        staleDeployedRecovered = true;
      } catch {
        // Leave state for a later retry.
      }
    }
  }
  return {
    orphanedOutputs: orphaned.map((item) => item.id),
    failedCandidates,
    staleDeployedRecovered,
  };
}
