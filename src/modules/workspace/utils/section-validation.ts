/**
 * Section SDK — Zod validation schemas
 * Validates: variant.json, slot.json, section HTML partials
 */

import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { SectionSlotRecord, SectionVariantRecord } from "../types/section-manifest";

// ─── Constants ──────────────────────────────────────────────────────────────

export const SECTION_TIERS = ["BASIC", "PRO", "AGENCY"] as const;
export const SECTION_STATUSES = ["DRAFT", "CLASSIFIED", "READY", "DEPRECATED"] as const;
export const RECORD_TYPES = ["slot", "variant"] as const;

export const SLOT_REQUIRED_FIELDS = [
  "record_type",
  "code",
  "name",
  "display_name",
  "required",
  "order_min",
  "order_max",
  "content_schema",
  "tier_min",
  "license",
  "status",
  "version",
] as const;

export const VARIANT_REQUIRED_FIELDS = [
  "record_type",
  "code",
  "name",
  "display_name",
  "slot_code",
  "html_partial",
  "css_scope",
  "js_scope",
  "compatible_themes",
  "compatible_tiers",
  "dependencies",
  "license",
  "status",
  "version",
] as const;

// ─── Field type schema ──────────────────────────────────────────────────────

export const sectionFieldSchema = z.object({
  type: z.string(),
  required: z.boolean().optional(),
  values: z.array(z.string()).optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  default: z.unknown().optional(),
  validation: z
    .object({
      min_length: z.number().int().positive().optional(),
      max_length: z.number().int().positive().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

// ─── Slot schema ────────────────────────────────────────────────────────────

export const slotContentSchema = z.object({
  version: z.number().int().positive(),
  fields: z.record(z.string(), sectionFieldSchema),
});

export const slotSchema = z.object({
  record_type: z.literal("slot"),
  code: z.string().min(1).regex(/^[A-Za-z0-9-]+$/),
  name: z.string().min(1),
  display_name: z.string().min(1),
  required: z.boolean(),
  order_min: z.number().int().positive(),
  order_max: z.number().int().positive(),
  content_schema: slotContentSchema,
  tier_min: z.enum(SECTION_TIERS),
  license: z.string().min(1),
  status: z.enum(SECTION_STATUSES),
  version: z.number().int().positive(),
});

// ─── Variant schema ─────────────────────────────────────────────────────────

export const variantSchema = z.object({
  record_type: z.literal("variant"),
  code: z.string().min(1).regex(/^[A-Za-z0-9-]+$/),
  name: z.string().min(1),
  display_name: z.string().min(1),
  slot_code: z.string().min(1).regex(/^[A-Za-z0-9-]+$/),
  html_partial: z.string().min(1),
  css_scope: z.string().min(1),
  js_scope: z.string(),
  compatible_themes: z.array(z.string()),
  compatible_tiers: z.array(z.enum(SECTION_TIERS)).min(1),
  dependencies: z.array(z.string()),
  license: z.string().min(1),
  status: z.enum(SECTION_STATUSES),
  version: z.number().int().positive(),
  reviewer: z.string().optional(),
});

// ─── Manifest schema (composite) ────────────────────────────────────────────

export const manifestSchema = z.object({
  slot: slotSchema,
  variant: variantSchema,
});

// ─── Validation helpers ─────────────────────────────────────────────────────

export interface ValidationContext {
  libraryRoot: string;
  slotCode: string;
  variantCode?: string;
}

export function getLibraryRoot(): string {
  return process.env.JIOODEV_LIBRARY_DIR ?? path.join(process.cwd(), "..", "library");
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function validateSlotRecord(data: unknown): { valid: boolean; errors: string[] } {
  const result = slotSchema.safeParse(data);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}

export function validateVariantRecord(data: unknown): { valid: boolean; errors: string[] } {
  const result = variantSchema.safeParse(data);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}

export async function validateSectionFiles(
  ctx: ValidationContext,
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const slotPath = path.join(ctx.libraryRoot, "sections", ctx.slotCode, "slot.json");
  const slotData = await readJsonFile<SectionSlotRecord>(slotPath);

  if (!slotData) {
    errors.push(`Missing slot.json at ${slotPath}`);
    return { valid: false, errors, warnings };
  }

  const slotResult = validateSlotRecord(slotData);
  if (!slotResult.valid) {
    errors.push(...slotResult.errors.map((e) => `slot.json: ${e}`));
  }

  if (ctx.variantCode) {
    const variantDir = path.join(ctx.libraryRoot, "sections", ctx.slotCode, ctx.variantCode);
    const variantPath = path.join(variantDir, "variant.json");
    const variantData = await readJsonFile<SectionVariantRecord>(variantPath);

    if (!variantData) {
      errors.push(`Missing variant.json at ${variantPath}`);
      return { valid: false, errors, warnings };
    }

    const variantResult = validateVariantRecord(variantData);
    if (!variantResult.valid) {
      errors.push(...variantResult.errors.map((e) => `variant.json: ${e}`));
    }

    if (variantData?.slot_code !== ctx.slotCode) {
      errors.push(`variant.json slot_code "${variantData.slot_code}" does not match slot "${ctx.slotCode}"`);
    }

    // Check HTML partial exists
    if (variantData?.html_partial) {
      const htmlPath = path.join(ctx.libraryRoot, variantData.html_partial);
      try {
        await fs.access(htmlPath);
      } catch {
        errors.push(`HTML partial not found: ${variantData.html_partial}`);
      }
    }

    // Check CSS scope exists
    if (variantData?.css_scope) {
      const cssPath = path.join(ctx.libraryRoot, variantData.css_scope);
      try {
        await fs.access(cssPath);
      } catch {
        warnings.push(`CSS scope not found: ${variantData.css_scope}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}