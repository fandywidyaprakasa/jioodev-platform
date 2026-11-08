/**
 * Section SDK — TypeScript types for section development
 * Covers: slot config, variant config, block props, theme tokens
 */

// ─── Theme / License ────────────────────────────────────────────────────────

export type ThemeTier = "BASIC" | "PRO" | "AGENCY";
export type SectionTier = ThemeTier;

export const SECTION_TIERS: SectionTier[] = ["BASIC", "PRO", "AGENCY"];

export type SectionStatus = "DRAFT" | "CLASSIFIED" | "READY" | "DEPRECATED";

export type SectionLicense = "JiooDev Free" | "JiooDev Commercial" | "JiooDev Enterprise";

// ─── Record type tags ───────────────────────────────────────────────────────

export const RECORD_TYPE_SLOT = "slot" as const;
export const RECORD_TYPE_VARIANT = "variant" as const;
export type RecordTypeSlot = typeof RECORD_TYPE_SLOT;
export type RecordTypeVariant = typeof RECORD_TYPE_VARIANT;

// ─── Slot manifest ──────────────────────────────────────────────────────────

export interface SectionSlotRecord {
  record_type: RecordTypeSlot;
  code: string;
  name: string;
  display_name: string;
  required: boolean;
  order_min: number;
  order_max: number;
  content_schema: SectionSlotContentSchema;
  tier_min: SectionTier;
  license: SectionLicense;
  status: SectionStatus;
  version: number;
}

export interface SectionSlotContentSchema {
  version: number;
  fields: Record<string, SectionFieldDefinition>;
}

export interface SectionFieldDefinition {
  type: SectionFieldType;
  required?: boolean;
  values?: string[]; // for enum
  label?: string;
  placeholder?: string;
  default?: unknown;
  validation?: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
  };
}

export type SectionFieldType =
  | "text"
  | "richtext"
  | "link"
  | "image"
  | "video"
  | "file"
  | "color"
  | "number"
  | "boolean"
  | "enum"
  | "array"
  | "object";

// ─── Variant manifest ───────────────────────────────────────────────────────

export interface SectionVariantRecord {
  record_type: RecordTypeVariant;
  code: string;
  name: string;
  display_name: string;
  slot_code: string;
  html_partial: string; // e.g. "sections/S-HERO/hero-centered/index.html"
  css_scope: string; // e.g. "sections/S-HERO/hero-centered/style.css"
  js_scope: string; // empty string if no JS
  compatible_themes: string[];
  compatible_tiers: SectionTier[];
  dependencies: string[];
  license: SectionLicense;
  status: SectionStatus;
  version: number;
  reviewer?: string;
}

// ─── Block props ───────────────────────────────────────────────────────────

/** Props injected into HTML partials at render time */
export interface SectionBlockProps {
  slot_code: string;
  variant_code: string;
  content: Record<string, unknown>;
  theme_id?: string;
  tier?: SectionTier;
}

/** Known link shape in content */
export interface SectionLink {
  href?: string;
  url?: string;
  label?: string;
  target?: string;
}

/** Known image shape in content */
export interface SectionImage {
  src?: string;
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
}

// ─── Theme tokens ───────────────────────────────────────────────────────────

export interface SectionThemeTokens {
  // Colors
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_background: string;
  color_text: string;
  color_muted: string;
  color_border: string;
  color_error: string;
  color_success: string;

  // Typography
  font_family_heading: string;
  font_family_body: string;
  font_size_base: string;
  line_height_base: string;

  // Spacing
  spacing_unit: string;
  border_radius: string;

  // Breakpoints
  breakpoint_sm: string;
  breakpoint_md: string;
  breakpoint_lg: string;
  breakpoint_xl: string;
}

// ─── Section manifest (composite) ──────────────────────────────────────────

export interface SectionManifest {
  slot: SectionSlotRecord;
  variant: SectionVariantRecord;
}

// ─── Validation result ─────────────────────────────────────────────────────

export interface SectionValidationError {
  file: string;
  path: string;
  message: string;
  code: SectionValidationErrorCode;
}

export type SectionValidationErrorCode =
  | "MISSING_FILE"
  | "INVALID_JSON"
  | "MISSING_FIELD"
  | "INVALID_FIELD"
  | "INVALID_TYPE"
  | "INVALID_STATUS"
  | "MISSING_HTML_PARTIAL"
  | "MISSING_CSS_SCOPE"
  | "SLOT_VARIANT_MISMATCH"
  | "UNKNOWN_TIER";

export interface SectionValidationResult {
  valid: boolean;
  errors: SectionValidationError[];
  warnings: string[];
}

// ─── Zod schema types (re-export inferred types) ────────────────────────────

import type { slotSchema, variantSchema, manifestSchema } from "@/modules/workspace/utils/section-validation";
import { z } from "zod";
export type SectionSlotSchemaZod = z.infer<typeof slotSchema>;
export type SectionVariantSchemaZod = z.infer<typeof variantSchema>;
export type SectionManifestZod = z.infer<typeof manifestSchema>;
