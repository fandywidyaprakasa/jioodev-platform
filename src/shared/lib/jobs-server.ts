import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "./pb-platform";
import { createNotification } from "./notifications-server";
import {
  canTransition,
  findProject,
  getBusinessProfile,
  getProjectSections,
  setProjectStatus,
} from "./projects-server";
import { getProjectCopy } from "./copy-server";
import { mockTemplates } from "./mock-data";
import type { GenerationJob, JobVariant, ProjectStatus } from "@/shared/types";

interface PbOutput {
  id: string;
  project_id?: string;
  version?: number;
  html_path?: string;
  thumbnail?: string;
  report?: {
    progress?: number;
    template?: string;
    variants?: JobVariant[];
  } | null;
  quality?: unknown;
  status?: string;
  revoked_at?: string;
  created: string;
}

interface PbProject {
  id: string;
  client_label?: string;
  product_type?: "LAND" | "WEB" | "COMM";
  template_id?: string;
  style?: string;
  layout?: string;
  status?: ProjectStatus;
}

const VARIANT_PRESETS = [
  { id: "var-editorial", label: "Editorial", style: "EDT", layout: "L-SPLIT" },
  { id: "var-minimal", label: "Minimal", style: "MIN", layout: "L-PORT" },
  { id: "var-bold", label: "Bold", style: "BLD", layout: "L-CONV" },
];

function templateRoot() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

function hermesJobUrl() {
  return process.env.HERMES_JOB_URL ?? process.env.HERMES_API_URL ?? "";
}

export function hermesConfigured() {
  return Boolean(hermesJobUrl());
}

export async function dispatchHermesJob(payload: {
  job_id: string;
  project_id: string;
  business_context: unknown;
  template: { asset_code: string; path: string };
  axis: { locked: string; value: string; count: number };
  sections: string[];
  copy_candidates: { copy_id: string; content: string }[];
}) {
  const url = hermesJobUrl();
  if (!url) return false;
  const token = process.env.HERMES_API_TOKEN;
  const secret = process.env.HERMES_CALLBACK_SECRET;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(secret ? { "x-hermes-secret": secret } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  return Boolean(response?.ok);
}

function resolveTemplate(project: PbProject) {
  const candidate = project.template_id;
  if (candidate) {
    const dir = path.join(templateRoot(), "templates", candidate);
    if (existsSync(path.join(dir, "index.html"))) return candidate;
  }
  const fallback =
    mockTemplates.find((item) => item.productType === project.product_type) ??
    mockTemplates[0];
  const code = fallback?.code ?? "LAND-LSPLIT-EDT-001";
  const dir = path.join(templateRoot(), "templates", code);
  if (existsSync(path.join(dir, "index.html"))) return code;
  return "LAND-LSPLIT-EDT-001";
}

const PREVIEW_TTL = Number(process.env.PREVIEW_TOKEN_TTL ?? 3600);

function previewSecret() {
  const value = process.env.PREVIEW_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PREVIEW_TOKEN_SECRET wajib di production.");
  }
  return "jioodev-dev-preview-secret";
}

function sign(payload: string) {
  return createHmac("sha256", previewSecret()).update(payload).digest("base64url");
}

export function encodePreviewToken(
  outputId: string,
  variantId: string,
  ttlSeconds = PREVIEW_TTL,
) {
  const payload = Buffer.from(
    JSON.stringify({
      outputId,
      variantId,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      jti: randomUUID(),
    }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodePreviewToken(token: string) {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = sign(payload);
    const given = Buffer.from(signature);
    const want = Buffer.from(expected);
    if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      outputId?: string;
      variantId?: string;
      exp?: number;
      jti?: string;
    };
    if (!data.outputId || !data.variantId || !data.exp || !data.jti) return null;
    if (data.exp <= Math.floor(Date.now() / 1000)) return null;
    return {
      outputId: data.outputId,
      variantId: data.variantId,
      exp: data.exp,
      jti: data.jti,
    };
  } catch {
    return null;
  }
}

export function isOutputRevoked(output: {
  revoked_at?: string;
  quality?: unknown;
}) {
  if (output.revoked_at) return true;
  const quality = output.quality;
  return Boolean(
    quality &&
      typeof quality === "object" &&
      "revoked_at" in quality &&
      (quality as { revoked_at?: unknown }).revoked_at,
  );
}

function toJob(output: PbOutput): GenerationJob {
  const report = output.report ?? {};
  const ready = output.status === "READY";
  return {
    id: output.id,
    status:
      output.status === "FAILED"
        ? "FAILED"
        : ready
          ? "READY"
          : output.status === "PROCESSING"
            ? "PROCESSING"
            : "QUEUED",
    progress: ready ? 100 : (report.progress ?? 10),
    variants: Array.isArray(report.variants) ? report.variants : [],
  };
}

export async function getOutput(id: string) {
  return await getRecord<PbOutput>("production_outputs", id).catch(() => null);
}

export async function getLatestJob(
  projectId: string,
): Promise<GenerationJob | null> {
  const data = await listRecords<PbOutput>("production_outputs", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 1,
  }).catch(() => null);
  const output = data?.items[0];
  return output ? toJob(output) : null;
}

export async function getProjectJob(
  projectId: string,
  jobId: string,
): Promise<GenerationJob | null> {
  const output = await getOutput(jobId);
  if (!output || output.project_id !== projectId) return null;
  return toJob(output);
}

export async function createOrGetJob(
  projectId: string,
): Promise<GenerationJob | null> {
  const project = (await findProject(projectId)) as PbProject | null;
  if (!project) return null;

  const latest = await listRecords<PbOutput>("production_outputs", {
    filter: `project_id='${escapeFilter(projectId)}'`,
    sort: "-created",
    perPage: 1,
  }).catch(() => null);
  const previous = latest?.items[0];
  if (previous && (previous.status === "READY" || previous.status === "PROCESSING")) {
    return toJob(previous);
  }

  const template = resolveTemplate(project);
  const current = project.status ?? "TEMPLATE_CHOSEN";
  if (current !== "GENERATING" && canTransition(current, "GENERATING")) {
    await setProjectStatus(projectId, "GENERATING").catch(() => undefined);
  }

  const version = (previous?.version ?? 0) + 1;
  const output = await createRecord<PbOutput>("production_outputs", {
    project_id: projectId,
    version,
    status: "PROCESSING",
    report: { progress: 25, template, variants: [] },
  });

  if (hermesConfigured()) {
    const [profile, sections, copy] = await Promise.all([
      getBusinessProfile(projectId).catch(() => null),
      getProjectSections(projectId, []).catch(() => []),
      getProjectCopy(projectId, []).catch(() => []),
    ]);
    const dispatched = await dispatchHermesJob({
      job_id: output.id,
      project_id: projectId,
      business_context: profile
        ? {
            business_name: profile.business_name ?? "",
            industry: profile.industry ?? "",
            business_purpose: profile.business_purpose ?? [],
            target_audience: profile.target_audience ?? "",
            channels: profile.channels ?? [],
            design_pref: profile.design_pref ?? "",
            business_goals: profile.business_goals ?? "",
          }
        : null,
      template: {
        asset_code: template,
        path: path.join(templateRoot(), "templates", template),
      },
      axis: {
        locked: "style",
        value: project.style ?? "EDT",
        count: 3,
      },
      sections: sections.filter((section) => section.enabled).map((section) => section.code),
      copy_candidates: copy.map((field) => ({
        copy_id: field.key,
        content: field.value,
      })),
    }).catch(() => false);
    if (dispatched) {
      return toJob(output);
    }
  }

  const variants: JobVariant[] = VARIANT_PRESETS.map((preset) => ({
    id: preset.id,
    label: `${preset.label} · ${preset.layout}`,
    previewUrl: `/preview/${encodePreviewToken(output.id, preset.id)}`,
  }));

  const ready = await updateRecord<PbOutput>("production_outputs", output.id, {
    status: "READY",
    report: { progress: 100, template, variants },
  });

  if (canTransition("GENERATING", "PREVIEWS") || current === "GENERATING") {
    await setProjectStatus(projectId, "PREVIEWS").catch(() => undefined);
  }

  const userId = (project as PbProject & { user_id?: string }).user_id;
  if (userId) {
    await createNotification({
      userId,
      type: "generation",
      title: "Preview siap dipilih",
      body: `3 varian untuk ${project.client_label ?? "project"} sudah siap.`,
      link: `/app/projects/${projectId}/preview`,
    });
  }

  return toJob(ready);
}

export async function completeJob(input: {
  jobId: string;
  status: string;
  variants?: JobVariant[];
  htmlPath?: string;
  quality?: unknown;
}) {
  const output = await getOutput(input.jobId);
  if (!output) return null;

  const status =
    input.status === "READY"
      ? "READY"
      : input.status === "FAILED"
        ? "FAILED"
        : "PROCESSING";
  const variants = input.variants ?? output.report?.variants ?? [];
  const wasReady = output.status === "READY";
  const updated = await updateRecord<PbOutput>("production_outputs", input.jobId, {
    status,
    ...(input.htmlPath ? { html_path: input.htmlPath } : {}),
    ...(input.quality !== undefined ? { quality: input.quality } : {}),
    report: {
      ...(output.report ?? {}),
      variants,
      progress: status === "READY" ? 100 : (output.report?.progress ?? 50),
    },
  });

  if (status === "READY" && !wasReady && output.project_id) {
    await setProjectStatus(output.project_id, "PREVIEWS").catch(() => undefined);
    const project = await findProject(output.project_id).catch(() => null);
    if (project?.user_id) {
      await createNotification({
        userId: project.user_id,
        type: "generation",
        title: "Preview siap dipilih",
        body: "Varian desain telah selesai diproses.",
        link: `/app/projects/${output.project_id}/preview`,
      });
    }
  }

  return toJob(updated);
}

export async function getJobTemplate(jobId: string) {
  const output = await getOutput(jobId);
  return output?.report?.template ?? null;
}
