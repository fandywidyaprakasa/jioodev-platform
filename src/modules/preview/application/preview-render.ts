import { promises as fs } from "node:fs";
import path from "node:path";
import { getOutput, decodePreviewToken, isOutputRevoked } from "@/modules/generation";
import { findProject } from "@/modules/projects";
import { getBusinessProfile } from "@/modules/projects";
import { getProjectCopy } from "@/modules/projects";
import { renderProjectSite } from "@/modules/projects";
import { mockCopy, mockBusinessContext } from "@/shared/lib/mock-data";

const VARIANTS: Record<string, { accent: string; heading: string }> = {
  "style-edt": { accent: "#2f6b4f", heading: "Fraunces" },
  "style-min": { accent: "#111827", heading: "DM Sans" },
  "style-bld": { accent: "#b45309", heading: "Fraunces" },
  "layout-split": { accent: "#2f6b4f", heading: "Fraunces" },
  "layout-menu": { accent: "#4b5563", heading: "DM Sans" },
  "layout-story": { accent: "#7c3aed", heading: "Fraunces" },
};

function templateDir() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

export interface PreviewContext {
  token: string;
  outputId: string;
  variantId: string;
  template: string;
}

export async function resolvePreview(token: string): Promise<PreviewContext | null> {
  const decoded = decodePreviewToken(token);
  if (!decoded) return null;
  const output = await getOutput(decoded.outputId);
  if (!output || isOutputRevoked(output)) return null;
  const variants = output.report?.variants ?? [];
  if (variants.length && !variants.some((item) => item.id === decoded.variantId)) {
    return null;
  }
  const template = output.report?.template ?? "LAND-LSPLIT-EDT-001";
  if (!/^[A-Za-z0-9-]+$/.test(template)) return null;
  return {
    token,
    outputId: output.id,
    variantId: decoded.variantId,
    template,
  };
}

async function readIfExists(file: string) {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return "";
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyBinds(html: string, binds: Record<string, string>) {
  let result = html;
  for (const [key, value] of Object.entries(binds)) {
    if (!value) continue;
    const pattern = new RegExp(
      `(<([a-zA-Z0-9]+)[^>]*data-bind="${key}"[^>]*>)([\\s\\S]*?)(</\\2>)`,
      "gm",
    );
    result = result.replace(pattern, (_match, open, tag, _body, close) => {
      return `${open}${escapeHtml(value)}${close}`;
    });
  }
  return result;
}

export interface RenderTemplateInput {
  template: string;
  assetBase: string;
  variantId?: string;
  binds?: Record<string, string>;
  title?: string;
}

export async function renderTemplateHtml({
  template,
  assetBase,
  variantId,
  binds = {},
  title,
}: RenderTemplateInput): Promise<string> {
  if (!/^[A-Za-z0-9-]+$/.test(template)) throw new Error("Template tidak valid.");
  const base = path.join(templateDir(), "templates");
  const shared = path.join(base, "_shared");
  const dir = path.join(base, template);
  const index = await readIfExists(path.join(dir, "index.html"));
  if (!index) throw new Error("Template tidak ditemukan.");

  const external = template.startsWith("PB-");
  const variant = variantId ? (VARIANTS[variantId] ?? null) : null;
  let html = applyBinds(index, binds);

  if (external) {
    const baseHref = `${assetBase.replace(/\/$/, "")}/`;
    if (/<base\b/i.test(html)) {
      html = html.replace(/<base\b[^>]*>/i, `<base href="${baseHref}">`);
    } else {
      html = html.replace(/<head\b[^>]*>/i, `$&<base href="${baseHref}">`);
    }
    html = html.replace(
      /(src|href)="\.\.\/_shared\//g,
      `$1="${assetBase}/shared/`,
    );
  } else {
    const [baseCss, componentsCss, templateCss, sharedJs, templateJs] =
      await Promise.all([
        readIfExists(path.join(shared, "base.css")),
        readIfExists(path.join(shared, "components.css")),
        readIfExists(path.join(dir, "assets", "style.css")),
        readIfExists(path.join(shared, "script.js")),
        readIfExists(path.join(dir, "assets", "script.js")),
      ]);
    html = html.replace(
      /<link[^>]+href="(?:\.\.\/_shared\/(?:base|components)\.css|assets\/style\.css)"[^>]*>/g,
      "",
    );
    const variantStyle = variant
      ? `\n:root{--accent:${variant.accent};--font-heading:${variant.heading};}`
      : "";
    html = html.replace(
      "</head>",
      `<style>${baseCss}\n${componentsCss}\n${templateCss}${variantStyle}</style></head>`,
    );
    html = html.replace(
      /<script[^>]+src="(?:\.\.\/_shared|assets)\/script\.js"[^>]*><\/script>/g,
      `<script>${sharedJs}\n${templateJs}</script>`,
    );
    html = html.replace(
      /(src|href)="\.\.\/_shared\//g,
      `$1="${assetBase}/shared/`,
    );
    html = html.replace(
      /(src|href)="assets\//g,
      `$1="${assetBase}/assets/`,
    );
  }
  if (title) {
    html = html.replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(title)}</title>`,
    );
  }
  return html;
}

export async function renderPreview(context: PreviewContext): Promise<string> {
  const decoded = decodePreviewToken(context.token);
  if (!decoded) throw new Error("Token tidak valid.");
  const output = await getOutput(decoded.outputId);
  if (!output?.project_id || isOutputRevoked(output)) {
    throw new Error("Output tidak ditemukan.");
  }

  const project = await findProject(output.project_id);
  const site = await renderProjectSite(output.project_id).catch(() => null);
  if (site) return site.html;
  const profile = await getBusinessProfile(output.project_id).catch(() => null);
  const copy = await getProjectCopy(output.project_id, mockCopy);
  const copyMap = new Map(copy.map((field) => [field.key, field.value]));

  const business =
    profile?.business_name ?? project?.client_label ?? mockBusinessContext.businessName;
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

  return renderTemplateHtml({
    template: context.template,
    assetBase: `/preview/${context.token}`,
    variantId: context.variantId,
    binds,
    title: `${business} — Preview JiooDev`,
  });
}

export async function renderTemplateByCode(code: string): Promise<string> {
  if (!/^[A-Za-z0-9-]+$/.test(code)) {
    throw new Error("Kode template tidak valid.");
  }
  const metaRaw = await readIfExists(
    path.join(templateDir(), "templates", code, "meta.json"),
  );
  if (metaRaw) {
    const meta = JSON.parse(metaRaw) as { status?: string };
    if (meta.status !== "READY") throw new Error("Template belum READY.");
  }
  return renderTemplateHtml({
    template: code,
    assetBase: `/template-preview/${code}`,
    binds: { year: String(new Date().getFullYear()) },
    title: `Contoh Template — JiooDev`,
  });
}
