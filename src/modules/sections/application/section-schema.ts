import { promises as fs } from "node:fs";
import path from "node:path";
import type { Section, SectionVariantOption } from "@/shared/types";

export interface SectionFieldSchema {
  type: string;
  required?: boolean;
  values?: string[];
}

export interface SectionSlotSchema {
  code: string;
  name: string;
  status?: string;
  required?: boolean;
  order_min?: number;
  order_max?: number;
  content_schema?: {
    version?: number;
    fields?: Record<string, SectionFieldSchema>;
  };
}

export interface SectionVariantSchema {
  code: string;
  name: string;
  slot_code: string;
  status: string;
  compatible_themes?: string[];
  compatible_tiers?: string[];
}

function libraryRoot() {
  return (
    process.env.JIOODEV_LIBRARY_DIR ??
    path.join(process.cwd(), "..", "library")
  );
}

function safeCode(value: string) {
  return /^[A-Za-z0-9-]+$/.test(value);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function loadSectionSlot(
  code: string,
): Promise<SectionSlotSchema | null> {
  if (!safeCode(code)) return null;
  return readJson<SectionSlotSchema>(
    path.join(libraryRoot(), "sections", code, "slot.json"),
  );
}

export async function loadSectionVariant(
  slot: string,
  variant: string,
): Promise<SectionVariantSchema | null> {
  if (!safeCode(slot) || !safeCode(variant)) return null;
  return readJson<SectionVariantSchema>(
    path.join(libraryRoot(), "sections", slot, variant, "variant.json"),
  );
}

export async function listSectionVariants(
  slot: string,
): Promise<SectionVariantOption[]> {
  if (!safeCode(slot)) return [];
  try {
    const entries = await fs.readdir(path.join(libraryRoot(), "sections", slot), {
      withFileTypes: true,
    });
    const variants = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const variant = await readJson<SectionVariantSchema>(
            path.join(libraryRoot(), "sections", slot, entry.name, "variant.json"),
          );
          if (!variant || variant.status !== "READY") return null;
          return {
            code: variant.code ?? entry.name,
            name: variant.name ?? entry.name,
          } satisfies SectionVariantOption;
        }),
    );
    return variants.filter((variant): variant is SectionVariantOption => Boolean(variant));
  } catch {
    return [];
  }
}

function isLink(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const link = value as { href?: unknown; url?: unknown };
  return typeof link.href === "string" || typeof link.url === "string";
}

function isImage(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const image = value as { src?: unknown; url?: unknown };
  return typeof image.src === "string" || typeof image.url === "string";
}

function validateField(field: SectionFieldSchema, value: unknown): string | null {
  switch (field.type) {
    case "text":
      return typeof value === "string" ? null : "harus berupa teks.";
    case "link":
      return isLink(value) ? null : "harus berupa link.";
    case "image":
      return isImage(value) ? null : "harus berupa gambar.";
    case "enum":
      return field.values?.includes(String(value))
        ? null
        : `harus salah satu dari: ${field.values?.join(", ") ?? "-"}.`;
    case "array":
      return Array.isArray(value) ? null : "harus berupa array.";
    case "object":
      return value && typeof value === "object" && !Array.isArray(value)
        ? null
        : "harus berupa object.";
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? null
        : "harus berupa angka.";
    case "boolean":
      return typeof value === "boolean" ? null : "harus berupa boolean.";
    default:
      return null;
  }
}

export function validateSectionContent(
  slot: SectionSlotSchema,
  content: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  const fields = slot.content_schema?.fields ?? {};
  for (const [name, field] of Object.entries(fields)) {
    const present =
      Object.prototype.hasOwnProperty.call(content, name) &&
      content[name] !== undefined &&
      content[name] !== null;
    if (!present) {
      if (field.required) errors.push(`${slot.code}.${name}: wajib diisi.`);
      continue;
    }
    const error = validateField(field, content[name]);
    if (error) errors.push(`${slot.code}.${name}: ${error}`);
  }
  return errors;
}

export async function validateSections(
  sections: Section[],
  context?: { themeId?: string; theme_id?: string; theme?: string; tier?: string } | string,
  tierArg?: string,
): Promise<string[]> {
  const ctx =
    typeof context === "string"
      ? { themeId: context, tier: tierArg }
      : context && typeof context === "object"
        ? {
            themeId: context.themeId ?? context.theme_id ?? context.theme,
            tier: context.tier ?? tierArg,
          }
        : { tier: tierArg };
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.code)) {
      errors.push(`${section.code}: duplikat.`);
    }
    seen.add(section.code);

    const slot = await loadSectionSlot(section.code);
    if (section.variantId) {
      if (!slot) {
        errors.push(`${section.code}: slot tidak dikenal.`);
      } else {
        const variant = await loadSectionVariant(section.code, section.variantId);
        if (!variant) {
          errors.push(`${section.code}: varian "${section.variantId}" tidak ditemukan.`);
        } else if (variant.slot_code !== section.code) {
          errors.push(`${section.code}: varian "${section.variantId}" bukan untuk slot ini.`);
        } else if (variant.status !== "READY") {
          errors.push(`${section.code}: varian "${section.variantId}" belum READY.`);
        } else {
          if (ctx.themeId && variant.compatible_themes?.length && !variant.compatible_themes.includes(ctx.themeId)) {
            errors.push(`${section.code}: varian "${section.variantId}" tidak kompatibel dengan theme "${ctx.themeId}".`);
          }
          if (ctx.tier && variant.compatible_tiers?.length && !variant.compatible_tiers.includes(ctx.tier)) {
            errors.push(`${section.code}: varian "${section.variantId}" tidak kompatibel dengan tier "${ctx.tier}".`);
          }
        }
      }
    }
    if (section.content && slot) {
      errors.push(...validateSectionContent(slot, section.content));
    }
  }
  return [...new Set(errors)];
}

export function parseSections(
  input: unknown,
): { sections: Section[]; error?: undefined } | { sections?: undefined; error: string } {
  if (!Array.isArray(input)) {
    return { error: "Body wajib berupa array section." };
  }
  const sections: Section[] = [];
  for (const [index, raw] of input.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { error: `Section #${index + 1} tidak valid.` };
    }
    const item = raw as Record<string, unknown>;
    const code = typeof item.code === "string" ? item.code.trim() : "";
    if (!code) {
      return { error: `Section #${index + 1}: code wajib diisi.` };
    }

    const variantId =
      typeof item.variantId === "string"
        ? item.variantId
        : typeof item.variant_id === "string"
          ? item.variant_id
          : undefined;

    const rawContent = item.content;
    const content =
      rawContent && typeof rawContent === "object" && !Array.isArray(rawContent)
        ? (rawContent as Record<string, unknown>)
        : undefined;
    if (rawContent != null && !content) {
      return { error: `Section ${code}: content harus berupa object.` };
    }

    const order = typeof item.order === "number" ? item.order : index + 1;
    if (!Number.isFinite(order) || order < 1) {
      return { error: `Section ${code}: order tidak valid.` };
    }

    sections.push({
      code,
      name:
        typeof item.name === "string" && item.name.trim()
          ? item.name.trim()
          : code,
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      order,
      ...(variantId !== undefined ? { variantId } : {}),
      ...(content ? { content } : {}),
    });
  }
  return { sections };
}

// Canonical CMS aliases / validation helpers
export function parseCmsSections(input: unknown) {
  return parseSections(input);
}

export function validateCmsSectionContent(slot: SectionSlotSchema, content: Record<string, unknown>) {
  return validateSectionContent(slot, content);
}

export async function validateCmsSections(
  sections: Section[],
  context?: { themeId?: string; theme_id?: string; theme?: string; tier?: string } | string,
  tierArg?: string,
) {
  return validateSections(sections, context, tierArg);
}

export async function validateCmsSectionInstances(
  instances: { section_code: string; variant_id?: string; content?: Record<string, unknown> }[],
  context?: { themeId?: string; theme_id?: string; theme?: string; tier?: string } | string,
  tierArg?: string,
) {
  const sections: Section[] = instances.map((instance) => ({
    code: instance.section_code,
    name: instance.section_code,
    enabled: true,
    order: 1,
    ...(instance.variant_id ? { variantId: instance.variant_id } : {}),
    ...(instance.content ? { content: instance.content } : {}),
  }));
  return validateSections(sections, context, tierArg);
}
