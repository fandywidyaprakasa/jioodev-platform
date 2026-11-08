import { promises as dns } from "node:dns";
import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import { findProject, patchProject } from "@/modules/projects";
import { logActivity } from "@/modules/activity";
import {
  buildPublicPath,
  findPublishedPageByProject,
  publishProject,
  publicBaseUrl,
  toPublishedPage,
  unpublishProject,
  type PublishOptions,
} from "./published";

export interface Deployment {
  id: string;
  projectId: string;
  target: string;
  environment: string;
  status: string;
  liveUrl: string;
  health: string;
  healthReason?: string;
}

export interface DomainRecord {
  id: string;
  projectId: string;
  domain: string;
  type: string;
  status: string;
  sslStatus: string;
  verifiedAt?: string;
}

interface PbDeployment {
  id: string;
  project_id?: string;
  target?: string;
  environment?: string;
  status?: string;
  live_url?: string;
  health?: unknown;
}

interface PbDomain {
  id: string;
  project_id?: string;
  domain?: string;
  type?: string;
  status?: string;
  ssl_status?: string;
  verified_at?: string;
}

function readHealth(value: unknown): { status: string; reason?: string } {
  if (typeof value === "string" && value.trim()) return { status: value };
  if (value && typeof value === "object") {
    const record = value as { status?: unknown; reason?: unknown };
    const status =
      typeof record.status === "string" && record.status.trim()
        ? record.status
        : "UNKNOWN";
    const reason =
      typeof record.reason === "string" && record.reason.trim()
        ? record.reason
        : undefined;
    return reason ? { status, reason } : { status };
  }
  return { status: "UNKNOWN" };
}

function healthValue(status: string, reason?: string) {
  return reason ? { status, reason } : status;
}

function toDeployment(item: PbDeployment): Deployment {
  const health = readHealth(item.health);
  return {
    id: item.id,
    projectId: item.project_id ?? "",
    target: item.target ?? "container",
    environment: item.environment ?? "production",
    status: item.status ?? "PENDING",
    liveUrl: item.live_url ?? "",
    health: health.status,
    ...(health.reason ? { healthReason: health.reason } : {}),
  };
}

function toDomain(item: PbDomain): DomainRecord {
  return {
    id: item.id,
    projectId: item.project_id ?? "",
    domain: item.domain ?? "",
    type: item.type ?? "custom",
    status: item.status ?? "PENDING",
    sslStatus: item.ssl_status ?? "PENDING",
    verifiedAt: item.verified_at,
  };
}

export async function getDeployment(projectId: string) {
  const data = await listRecords<PbDeployment>("deployments", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 1,
  });
  const item = data.items[0];
  return item ? toDeployment(item) : null;
}

export async function listDeployments(): Promise<Deployment[]> {
  const data = await listRecords<PbDeployment>("deployments", {
    sort: "-created",
    perPage: 100,
  });
  return data.items.map(toDeployment);
}

// Write order for requestDeployment:
// 1. Read project and validate status.
// 2. publishProject creates/promotes an immutable snapshot (idempotent for an
//    unchanged content revision, so republish never duplicates versions).
// 3. markPublished points the deployment at the promoted snapshot.
// 4. checkDeploymentHealth verifies the public route + referenced assets before
//    the caller can treat the deployment as LIVE.
// Read/write failures propagate; an invalid transition returns null; publish
// failures are raised with a structured `code` for the HTTP layer.
async function ensureAuditLog(input: {
  actor?: string;
  action: string;
  entityType?: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  await logActivity({
    actor: input.actor,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    meta: input.meta,
  });
}

export type DeploymentFailureCode =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "PAYMENT_REQUIRED"
  | "NO_OUTPUT"
  | "HEALTH_FAILED"
  | "VALIDATION_FAILED"
  | "RENDER_FAILED"
  | "CONFLICT";

export interface DeploymentRequestError extends Error {
  code: DeploymentFailureCode;
}

function failDeployment(code: DeploymentFailureCode, message: string): never {
  const error = new Error(message) as DeploymentRequestError;
  error.name = "DeploymentRequestError";
  error.code = code;
  throw error;
}

export async function requestDeployment(
  projectId: string,
): Promise<Deployment | null> {
  const project = await findProject(projectId);
  if (!project) failDeployment("NOT_FOUND", "Project tidak ditemukan.");

  const status = project.status ?? "DRAFT";
  if (!["PAID", "DEPLOYED", "ACTIVE"].includes(status)) return null;

  // Read the current pointer first so a deployment read failure surfaces before
  // starting a new publish instead of being mistaken for a publish failure.
  await getDeployment(projectId);

  const published = await publishProject(projectId);
  if (!published.ok) {
    failDeployment(published.code, published.message);
  }

  const deployment = await markPublished(
    projectId,
    published.page.url,
    published.page.slug,
  );
  if (!deployment) {
    failDeployment("NOT_FOUND", "Deployment tidak ditemukan.");
  }

  const verified = await checkDeploymentHealth(projectId);
  return verified ?? deployment;
}

// Write order for markPublished (deployment pointer promotion):
// 1. Read existing deployment + project (getDeployment, findProject).
// 2. Write deployment record (create/update) -> deployment write boundary.
// 3. Patch project deployment_id/preview_url -> project write boundary.
// 4. Append audit success (logActivity) -> audit write boundary.
// A failure after boundary 2 leaves a deployment that is not yet linked to the
// project; a failure after boundary 3 leaves an auditable-but-unaudited complete
// pointer. Retrying is safe: an already-complete pointer is returned without
// repeating writes or audit-success.
export async function markPublished(
  projectId: string,
  liveUrl: string,
  slug: string,
): Promise<Deployment | null> {
  const existing = await getDeployment(projectId);
  const project = await findProject(projectId);
  const previewPath = buildPublicPath(slug);
  const alreadyComplete =
    !!existing &&
    existing.status === "PROVISIONING" &&
    existing.liveUrl === liveUrl &&
    project?.deployment_id === existing.id &&
    project?.preview_url === previewPath;

  if (alreadyComplete && existing) {
    return toDeployment(existing);
  }

  const payload = {
    project_id: projectId,
    target: "container",
    environment: "production",
    status: "PROVISIONING",
    live_url: liveUrl,
    health: "UNKNOWN",
  };
  const deployment = existing
    ? await updateRecord<PbDeployment>("deployments", existing.id, payload)
    : await createRecord<PbDeployment>("deployments", payload);

  await patchProject(projectId, {
    deployment_id: deployment.id,
    preview_url: previewPath,
  });
  await ensureAuditLog({
    actor: "user",
    action: "deploy.publish",
    entityType: "deployment",
    entityId: deployment.id,
    meta: { project_id: projectId, live_url: liveUrl },
  });
  return toDeployment(deployment);
}

// Write order for publishAndMarkLive:
// 1. publishProject creates/promotes immutable snapshot + project ACTIVE.
// 2. markPublished links the deployment pointer (PROVISIONING on republish).
// 3. checkDeploymentHealth probes the public route + assets so LIVE is only
//    reported after verification. A failed probe leaves DEGRADED + reason while
//    the project stays ACTIVE on the promoted snapshot.
// If step 2 fails, the publish snapshot remains promoted and project ACTIVE;
// retrying publishAndMarkLive is safe because publishProject returns the existing
// promoted page and markPublished reconciles the deployment pointer.
export async function publishAndMarkLive(
  projectId: string,
  options: PublishOptions = {},
) {
  const published = await publishProject(projectId, options);
  if (!published.ok) return published;
  const deployment = await markPublished(
    projectId,
    published.page.url,
    published.page.slug,
  );
  if (deployment) await checkDeploymentHealth(projectId);
  return published;
}

// Write order for unpublishAndSuspend:
// 1. unpublishProject updates published_pages to UNPUBLISHED and project to PAID.
// 2. suspendDeployment updates the deployment to SUSPENDED/UNKNOWN (project already PAID).
// A failure after step 1 leaves a durable, reconcilable incomplete state: the page is
// unpublished and the project is PAID, while the deployment may still be live. Retrying
// suspendDeployment reconciles the deployment without republishing or duplicating data.
// A failure during step 1 propagates and leaves the prior published state intact.
export async function unpublishAndSuspend(projectId: string) {
  const existingPage = await findPublishedPageByProject(projectId);
  const result =
    existingPage?.status === "UNPUBLISHED"
      ? { ok: true as const, page: toPublishedPage(existingPage) }
      : await unpublishProject(projectId);
  if (result.ok) {
    await suspendDeployment(projectId);
  }
  return result;
}

// Write order for suspendDeployment:
// 1. Read deployment (getDeployment).
// 2. Update deployment to SUSPENDED/UNKNOWN.
// 3. Patch project to PAID.
// Retrying is safe: an already-suspended deployment with a PAID project returns the
// existing record without repeating writes.
export async function suspendDeployment(
  projectId: string,
): Promise<Deployment | null> {
  const existing = await getDeployment(projectId);
  if (!existing) return null;
  const project = await findProject(projectId);
  const alreadyComplete =
    existing.status === "SUSPENDED" &&
    existing.health === "UNKNOWN" &&
    project?.status === "PAID";
  if (alreadyComplete) return toDeployment(existing);

  const updated = await updateRecord<PbDeployment>(
    "deployments",
    existing.id,
    { status: "SUSPENDED", health: "UNKNOWN" },
  );
  await patchProject(projectId, { status: "PAID" });
  return toDeployment(updated);
}

// Write order for checkDeploymentHealth:
// 1. Read deployment + published page.
// 2. Update deployment to DEGRADED/FAIL (+ reason) if no published page.
// 3. Probe public route when base URL exists (bounded by a timeout).
// 4. Probe a referenced public asset so a broken asset cannot hide behind a 200.
// 5. Update deployment to LIVE/OK or DEGRADED/FAIL (+ reason).
// Failures propagate; project status is never changed by this probe.
const DEFAULT_PROBE_TIMEOUT_MS = 3_000;
const PROBE_ASSET_EXT =
  /\.(?:avif|bmp|css|gif|ico|jpe?g|js|json|png|svg|ttf|webp|woff2?)$/i;

function probeTimeoutMs() {
  const configured = Number(process.env.DEPLOY_HEALTH_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_PROBE_TIMEOUT_MS;
}

async function probe(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), probeTimeoutMs());
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function referencedProbeAssets(html: string, pageUrl: string): string[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const pagePath = base.pathname.replace(/\/+$/, "") || "/";
  const assets = new Set<string>();
  for (const match of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const raw = match[1]?.trim();
    if (!raw || raw.startsWith("#")) continue;
    if (/^(?:data|blob|mailto|tel|javascript):/i.test(raw)) continue;
    let resolved: URL;
    try {
      resolved = new URL(raw, base);
    } catch {
      continue;
    }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;
    const assetPath = resolved.pathname.replace(/\/+$/, "") || "/";
    if (assetPath === pagePath) continue;
    if (!assetPath.includes("/media/") && !PROBE_ASSET_EXT.test(resolved.pathname)) {
      continue;
    }
    assets.add(resolved.toString());
  }
  return [...assets];
}

async function setDeploymentHealth(
  deployment: Deployment,
  status: string,
  health: string,
  reason?: string,
): Promise<Deployment> {
  const updated = await updateRecord<PbDeployment>("deployments", deployment.id, {
    status,
    health: healthValue(health, reason),
  });
  return toDeployment(updated);
}

export async function checkDeploymentHealth(projectId: string) {
  const deployment = await getDeployment(projectId);
  if (!deployment) return null;

  const page = await findPublishedPageByProject(projectId);
  if (!page || page.status !== "PUBLISHED") {
    return setDeploymentHealth(
      deployment,
      "DEGRADED",
      "FAIL",
      "Halaman publik belum dipublish sehingga belum bisa diverifikasi.",
    );
  }

  const base = publicBaseUrl();
  const url = base ? `${base}${buildPublicPath(page.slug ?? "")}` : "";
  if (!url) {
    if (deployment.status !== "LIVE") return deployment;
    return setDeploymentHealth(
      deployment,
      "DEGRADED",
      "UNKNOWN",
      "URL publik belum dikonfigurasi; status live belum terverifikasi.",
    );
  }

  const response = await probe(url);
  if (!response) {
    return setDeploymentHealth(
      deployment,
      "DEGRADED",
      "FAIL",
      `Route publik ${buildPublicPath(page.slug ?? "")} tidak dapat dihubungi.`,
    );
  }
  if (!response.ok) {
    return setDeploymentHealth(
      deployment,
      "DEGRADED",
      "FAIL",
      `Route publik membalas ${response.status}.`,
    );
  }

  let html = "";
  try {
    html = await response.text();
  } catch {
    html = "";
  }
  for (const asset of referencedProbeAssets(html, url).slice(0, 1)) {
    const assetResponse = await probe(asset);
    if (!assetResponse || !assetResponse.ok) {
      let assetPath = asset;
      try {
        assetPath = new URL(asset).pathname;
      } catch {
        // keep the raw URL in the reason
      }
      return setDeploymentHealth(
        deployment,
        "DEGRADED",
        "FAIL",
        `Aset ${assetPath} tidak dapat diakses.`,
      );
    }
  }

  return setDeploymentHealth(deployment, "LIVE", "OK");
}

// Write order for rollbackDeployment (admin):
// 1. Read deployment (getDeployment).
// 2. Update deployment to SUSPENDED/UNKNOWN.
// 3. Patch project to PAID.
// 4. Append audit success (logActivity).
// A failure after step 2 leaves a durable, reconcilable incomplete state: deployment
// suspended while project may remain ACTIVE. Retrying reconciles project/audit without
// duplicating audit-success once fully complete.
export async function rollbackDeployment(projectId: string) {
  const deployment = await getDeployment(projectId);
  if (!deployment) return null;
  const project = await findProject(projectId);
  const alreadyComplete =
    deployment.status === "SUSPENDED" &&
    deployment.health === "UNKNOWN" &&
    project?.status === "PAID";
  if (alreadyComplete) return toDeployment(deployment);

  const updated = await updateRecord<PbDeployment>(
    "deployments",
    deployment.id,
    {
      status: "SUSPENDED",
      health: "UNKNOWN",
    },
  );
  await patchProject(projectId, { status: "PAID" });
  await ensureAuditLog({
    actor: "admin",
    action: "deploy.rollback",
    entityType: "deployment",
    entityId: deployment.id,
    meta: { project_id: projectId },
  });
  return toDeployment(updated);
}

export async function reconcileDeploymentAudits(projectId: string): Promise<number> {
  const data = await listRecords<PbDeployment>("deployments", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    perPage: 100,
  }).catch(() => null);
  let recovered = 0;
  for (const deployment of data?.items ?? []) {
    if (deployment.status === "PROVISIONING") {
      await ensureAuditLog({
        actor: "user",
        action: "deploy.publish",
        entityType: "deployment",
        entityId: deployment.id,
        meta: { project_id: projectId, live_url: deployment.live_url ?? "" },
      });
      recovered += 1;
      continue;
    }
    if (deployment.status === "SUSPENDED") {
      const project = await findProject(projectId).catch(() => null);
      const page = await findPublishedPageByProject(projectId).catch(() => null);
      if (project?.status === "PAID" && page?.status !== "UNPUBLISHED") {
        await ensureAuditLog({
          actor: "admin",
          action: "deploy.rollback",
          entityType: "deployment",
          entityId: deployment.id,
          meta: { project_id: projectId },
        });
        recovered += 1;
      }
    }
  }
  return recovered;
}

export async function listDomains(projectId: string): Promise<DomainRecord[]> {
  const data = await listRecords<PbDomain>("domains", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 100,
  }).catch(() => null);
  return (data?.items ?? []).map(toDomain);
}

const DOMAIN_LABEL_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const TLD_RE = /^[a-z]{2,63}$/;

function platformDomainSuffixes(): string[] {
  const base = (process.env.PLATFORM_DOMAIN ?? "jioo.site")
    .trim()
    .toLowerCase();
  const extra = (process.env.RESERVED_DOMAINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([base, ...extra].filter(Boolean)));
}

/** Normalisasi + validasi domain. Mengembalikan null bila tidak aman. */
export function normalizeDomain(input: string): string | null {
  const value = input.trim().toLowerCase().replace(/\.+$/, "");
  if (!value || value.length > 253) return null;
  if (/[/:@\s]/.test(value)) return null;
  const labels = value.split(".");
  if (labels.length < 2) return null;
  if (!labels.every((label) => DOMAIN_LABEL_RE.test(label))) return null;
  if (!TLD_RE.test(labels[labels.length - 1] ?? "")) return null;
  if (value === "localhost" || value.endsWith(".local") || value.endsWith(".internal")) {
    return null;
  }
  for (const suffix of platformDomainSuffixes()) {
    if (value === suffix || value.endsWith(`.${suffix}`)) return null;
  }
  return value;
}

/** Token kepemilikan per-domain (disimpan di TXT, bukan schema). */
export function domainVerificationToken(domainId: string): string {
  return `jioo-verify=${domainId}`;
}

export function domainVerificationHost(domain: string): string {
  return `_jioo.${domain}`;
}

export function domainCnameTarget(): string {
  return (process.env.DOMAIN_CNAME_TARGET ?? "cname.jioo.site")
    .trim()
    .toLowerCase()
    .replace(/\.+$/, "");
}

export type AddDomainResult =
  | { ok: true; domain: DomainRecord }
  | { ok: false; code: "INVALID" | "CONFLICT"; message: string };

export async function addDomain(
  projectId: string,
  domain: string,
): Promise<AddDomainResult> {
  const value = normalizeDomain(domain);
  if (!value) {
    return {
      ok: false,
      code: "INVALID",
      message: "Format domain tidak valid atau domain platform dilindungi.",
    };
  }

  const existing = await listRecords<PbDomain>("domains", {
    filter: `domain='${escapeFilter(value)}'`,
    perPage: 1,
  }).catch(() => null);
  if (existing?.items.length) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "Domain sudah terdaftar pada project lain.",
    };
  }

  const record = await createRecord<PbDomain>("domains", {
    project_id: projectId,
    domain: value,
    type: "custom",
    status: "PENDING",
    ssl_status: "none",
  });
  await logActivity({
    actor: "user",
    action: "domain.add",
    entityType: "domain",
    entityId: record.id,
    meta: { projectId, domain: value },
  }).catch(() => undefined);
  return { ok: true, domain: toDomain(record) };
}

export async function verifyDomain(id: string): Promise<DomainRecord | null> {
  const record = await getRecord<PbDomain>("domains", id).catch(() => null);
  if (!record) return null;
  if (record.status === "ACTIVE") return toDomain(record);

  const domain = record.domain ?? "";
  const target = domainCnameTarget();
  const token = domainVerificationToken(record.id);

  // 1) Bukti kepemilikan: TXT _jioo.<domain> = "jioo-verify=<id>".
  let ownsDomain = false;
  try {
    const txtRecords = await dns.resolveTxt(domainVerificationHost(domain));
    ownsDomain = txtRecords.some((chunks) => chunks.join("").includes(token));
  } catch {
    ownsDomain = false;
  }
  if (!ownsDomain) return toDomain(record);

  // 2) Bukti routing: CNAME ke target platform.
  let routed = false;
  try {
    const records = await dns.resolveCname(domain);
    routed = records.some(
      (item) => item.trim().toLowerCase().replace(/\.+$/, "") === target,
    );
  } catch {
    routed = false;
  }
  if (!routed) return toDomain(record);

  const updated = await updateRecord<PbDomain>("domains", id, {
    status: "ACTIVE",
    ssl_status: "none",
    verified_at: new Date().toISOString(),
  });
  await logActivity({
    actor: "user",
    action: "domain.verify",
    entityType: "domain",
    entityId: id,
    meta: { domain, target },
  }).catch(() => undefined);
  return toDomain(updated);
}
