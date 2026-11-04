import { promises as dns } from "node:dns";
import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "./pb-platform";
import { findProject, patchProject } from "./projects-server";
import { logActivity } from "./activity-server";
import {
  buildPublicPath,
  findPublishedPageByProject,
  publishProject,
  publicBaseUrl,
} from "./published-server";

export interface Deployment {
  id: string;
  projectId: string;
  target: string;
  environment: string;
  status: string;
  liveUrl: string;
  health: string;
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
  health?: string;
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

function toDeployment(item: PbDeployment): Deployment {
  return {
    id: item.id,
    projectId: item.project_id ?? "",
    target: item.target ?? "container",
    environment: item.environment ?? "production",
    status: item.status ?? "PENDING",
    liveUrl: item.live_url ?? "",
    health: item.health ?? "UNKNOWN",
  };
}

function toDomain(item: PbDomain): DomainRecord {
  return {
    id: item.id,
    projectId: item.project_id ?? "",
    domain: item.domain ?? "",
    type: item.type ?? "CNAME",
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
  }).catch(() => null);
  const item = data?.items[0];
  return item ? toDeployment(item) : null;
}

export async function listDeployments(): Promise<Deployment[]> {
  const data = await listRecords<PbDeployment>("deployments", {
    sort: "-created",
    perPage: 100,
  });
  return data.items.map(toDeployment);
}

export async function requestDeployment(
  projectId: string,
): Promise<Deployment | null> {
  const project = await findProject(projectId);
  if (!project) return null;

  const status = project.status ?? "DRAFT";
  if (!["PAID", "DEPLOYED", "ACTIVE"].includes(status)) return null;

  const existing = await getDeployment(projectId);
  if (existing && (existing.status === "LIVE" || existing.status === "PROVISIONING")) {
    return existing;
  }

  const published = await publishProject(projectId);
  if (!published.ok) return null;
  return markPublished(projectId, published.page.url, published.page.slug);
}

export async function markPublished(
  projectId: string,
  liveUrl: string,
  slug: string,
): Promise<Deployment | null> {
  const existing = await getDeployment(projectId);
  const payload = {
    project_id: projectId,
    target: "platform",
    environment: "production",
    status: "LIVE",
    live_url: liveUrl,
    health: "OK",
  };
  const deployment = existing
    ? await updateRecord<PbDeployment>("deployments", existing.id, payload)
    : await createRecord<PbDeployment>("deployments", payload);

  await patchProject(projectId, {
    status: "ACTIVE",
    deployment_id: deployment.id,
    preview_url: buildPublicPath(slug),
  }).catch(() => undefined);
  await logActivity({
    actor: "user",
    action: "deploy.publish",
    entityType: "deployment",
    entityId: deployment.id,
    meta: { project_id: projectId, live_url: liveUrl },
  });
  return toDeployment(deployment);
}

export async function suspendDeployment(
  projectId: string,
): Promise<Deployment | null> {
  const existing = await getDeployment(projectId);
  if (!existing) return null;
  const updated = await updateRecord<PbDeployment>(
    "deployments",
    existing.id,
    { status: "SUSPENDED", health: "UNKNOWN" },
  );
  await patchProject(projectId, { status: "PAID" }).catch(() => undefined);
  return toDeployment(updated);
}

export async function checkDeploymentHealth(projectId: string) {
  const deployment = await getDeployment(projectId);
  if (!deployment) return null;

  const page = await findPublishedPageByProject(projectId).catch(() => null);
  let healthy = Boolean(page && page.status === "PUBLISHED");
  if (healthy && page) {
    const base = publicBaseUrl();
    const url = base ? `${base}${buildPublicPath(page.slug ?? "")}` : "";
    if (url) {
      const response = await fetch(url, { cache: "no-store" }).catch(() => null);
      healthy = Boolean(response?.ok);
    }
  }

  const updated = await updateRecord<PbDeployment>(
    "deployments",
    deployment.id,
    {
      status: healthy ? "LIVE" : "DEGRADED",
      health: healthy ? "OK" : "FAIL",
    },
  );
  await patchProject(projectId, {
    status: healthy ? "ACTIVE" : "PAID",
  }).catch(() => undefined);
  return toDeployment(updated);
}

export async function rollbackDeployment(projectId: string) {
  const deployment = await getDeployment(projectId);
  if (!deployment) return null;
  const updated = await updateRecord<PbDeployment>(
    "deployments",
    deployment.id,
    {
      status: "SUSPENDED",
      health: "UNKNOWN",
    },
  );
  await patchProject(projectId, { status: "PAID" }).catch(() => undefined);
  await logActivity({
    actor: "admin",
    action: "deploy.rollback",
    entityType: "deployment",
    entityId: deployment.id,
    meta: { project_id: projectId },
  });
  return toDeployment(updated);
}

export async function listDomains(projectId: string): Promise<DomainRecord[]> {
  const data = await listRecords<PbDomain>("domains", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 100,
  }).catch(() => null);
  return (data?.items ?? []).map(toDomain);
}

const DOMAIN_RE = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/i;

export async function addDomain(projectId: string, domain: string) {
  const value = domain.trim().toLowerCase();
  if (!DOMAIN_RE.test(value)) return null;
  const record = await createRecord<PbDomain>("domains", {
    project_id: projectId,
    domain: value,
    type: "custom",
    status: "PENDING",
    ssl_status: "none",
  });
  return toDomain(record);
}

export async function verifyDomain(id: string) {
  const record = await getRecord<PbDomain>("domains", id).catch(() => null);
  if (!record) return null;

  const target = process.env.DOMAIN_CNAME_TARGET ?? "cname.jioo.site";
  let verified = false;
  try {
    const records = await dns.resolveCname(record.domain ?? "");
    verified = records.some((item) => item.toLowerCase() === target.toLowerCase());
  } catch {
    verified = false;
  }

  if (!verified) return toDomain(record);

  const updated = await updateRecord<PbDomain>("domains", id, {
    status: "ACTIVE",
    ssl_status: "none",
    verified_at: new Date().toISOString(),
  });
  return toDomain(updated);
}
