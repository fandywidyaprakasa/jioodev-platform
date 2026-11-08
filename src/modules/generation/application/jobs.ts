import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  createRecord,
  escapeFilter,
  getRecord,
  listRecords,
  updateRecord,
} from "@/shared/infrastructure/pocketbase/pb-platform";
import { createNotification } from "@/modules/account";
import { layoutLabel, styleLabel } from "@/shared/lib/taxonomy";
import {
  canTransition,
  findProject,
  getBusinessProfile,
  getProjectSections,
  setProjectStatus,
} from "@/modules/projects";
import { getProjectCopy } from "@/modules/projects";
import { mockTemplates } from "@/shared/lib/mock-data";
import type { GenerationJob, JobVariant, ProjectStatus } from "@/shared/types";
import type { SiteSnapshot } from "@/modules/projects";

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
    axis?: "style" | "layout";
    kind?: "generation" | "publish";
    site?: SiteSnapshot;
    pages?: Array<{
      id: string;
      title: string;
      slug: string;
      isHome: boolean;
      seo: Record<string, unknown>;
      settings: Record<string, unknown>;
      site: SiteSnapshot;
      html?: string;
      html_hash?: string;
    }>;
    legacy?: {
      template: string;
      variantId?: string;
      businessName: string;
      html: string;
      html_hash: string;
    };
    asset_manifest?: Array<{ path: string; hash: string }>;
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

type Axis = "style" | "layout";

const STYLE_VARIANTS = [
  { id: "style-edt", label: "Editorial", style: "EDT" },
  { id: "style-min", label: "Minimal", style: "MIN" },
  { id: "style-bld", label: "Bold", style: "BLD" },
];

const LAYOUT_VARIANTS = [
  { id: "layout-split", label: "Split", layout: "L-SPLIT" },
  { id: "layout-menu", label: "Menu", layout: "L-MENU" },
  { id: "layout-story", label: "Story", layout: "L-STORY" },
];

function axisVariants(
  axis: Axis,
  project: PbProject,
  outputId: string,
): JobVariant[] {
  const style = project.style ?? "EDT";
  const layout = project.layout ?? "L-SPLIT";
  const presets =
    axis === "style"
      ? STYLE_VARIANTS.map((preset) => ({
          id: preset.id,
          label: `${preset.label} · ${layoutLabel(layout)}`,
        }))
      : LAYOUT_VARIANTS.map((preset) => ({
          id: preset.id,
          label: `${preset.label} · ${styleLabel(style)}`,
        }));
  return presets.map((preset) => ({
    ...preset,
    previewUrl: `/preview/${encodePreviewToken(outputId, preset.id)}`,
  }));
}

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

export function generationReadiness(project: {
  status?: string | null;
  template_id?: string | null;
}):
  | { ok: true }
  | { ok: false; code: "INVALID_TRANSITION" | "VALIDATION"; message: string } {
  if (
    !["TEMPLATE_CHOSEN", "GENERATING", "PREVIEWS"].includes(project.status ?? "")
  ) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: "Generate hanya tersedia setelah template dipilih.",
    };
  }
  if (!project.template_id) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Pilih template sebelum generate.",
    };
  }
  return { ok: true };
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

async function latestGenerationOutput(projectId: string) {
  const perPage = 50;
  for (let page = 1; ; page += 1) {
    const data = await listRecords<PbOutput>("production_outputs", {
      filter: `project_id='${escapeFilter(projectId)}'`,
      sort: "-created",
      perPage,
      page,
    });
    const output = data.items.find(
      (item) => item.report?.kind !== "publish",
    );
    if (output) return output;
    if (!data.totalPages || page >= data.totalPages) return null;
  }
}

export async function getLatestJob(
  projectId: string,
): Promise<GenerationJob | null> {
  const output = await latestGenerationOutput(projectId).catch(() => null);
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
  options: { axis?: Axis; force?: boolean } = {},
): Promise<GenerationJob | null> {
  const project = (await findProject(projectId)) as PbProject | null;
  if (!project) return null;
  if (!generationReadiness(project).ok) return null;

  const previous = await latestGenerationOutput(projectId).catch(() => null);
  const axis = options.axis ?? "style";
  const previousAxis = previous?.report?.axis ?? "style";
  if (
    previous &&
    !options.force &&
    previous.status !== "FAILED" &&
    (previous.status === "READY" || previous.status === "PROCESSING") &&
    previousAxis === axis
  ) {
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
    report: { progress: 25, template, variants: [], axis },
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
        locked: axis,
        value:
          axis === "style"
            ? project.style ?? "EDT"
            : project.layout ?? "L-SPLIT",
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

  const variants = axisVariants(axis, project, output.id);

  const ready = await updateRecord<PbOutput>("production_outputs", output.id, {
    status: "READY",
    report: { progress: 100, template, variants, axis },
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
  const variants = (input.variants ?? output.report?.variants ?? [])
    .filter((variant) => Boolean(variant?.id))
    .map((variant) => ({
      ...variant,
      previewUrl: `/preview/${encodePreviewToken(output.id, variant.id)}`,
    }));
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

export async function revokeOutput(outputId: string) {
  const output = await getOutput(outputId).catch(() => null);
  if (!output) return { ok: false as const, code: "NOT_FOUND" as const };
  if (isOutputRevoked(output)) return { ok: true as const, outputId };

  const revokedAt = new Date().toISOString();
  try {
    await updateRecord("production_outputs", outputId, {
      revoked_at: revokedAt,
    });
  } catch {
    const quality =
      output.quality && typeof output.quality === "object"
        ? (output.quality as Record<string, unknown>)
        : {};
    await updateRecord("production_outputs", outputId, {
      quality: { ...quality, revoked_at: revokedAt },
    });
  }
  return { ok: true as const, outputId };
}
