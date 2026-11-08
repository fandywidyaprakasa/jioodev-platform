export const HTML_ADAPTER_ID = "html";
export const HTML_ADAPTER_VERSION = "1";
export const HTML_PLATFORM_CONTRACT_VERSION = "0.1";
export const HTML_CONTENT_SCHEMA_VERSION = 1;
export const HTML_SNAPSHOT_SCHEMA_VERSION = 1;
export const HTML_RENDERER_VERSION = "1";
export const HTML_HASH_ALGORITHM_VERSION = "uwps-render-hash/1";

export const HTML_PROJECT_TECHNOLOGY_CONFIG = {
  adapter_id: HTML_ADAPTER_ID,
  adapter_version: HTML_ADAPTER_VERSION,
  contract_version: HTML_PLATFORM_CONTRACT_VERSION,
  content_schema_version: HTML_CONTENT_SCHEMA_VERSION,
  snapshot_schema_version: HTML_SNAPSHOT_SCHEMA_VERSION,
  renderer_version: HTML_RENDERER_VERSION,
  hash_algorithm_version: HTML_HASH_ALGORITHM_VERSION,
} as const;

export interface HtmlAdapterDescriptor {
  adapter_id: string;
  adapter_version: string;
  platform_contract_version: string;
  supported_product_types: string[];
  render_modes: string[];
  supports_javascript: boolean;
  editor_operations: string[];
  content_schema_version: number;
  snapshot_schema_version: number;
  renderer_version: string;
  hash_algorithm_version: string;
  asset_model: string;
  publishing_executor: string;
  preview_renderer: string;
  status: "READY" | "DRAFT" | "DEPRECATED";
  capability_notes: string[];
}

export const HTML_ADAPTER_DESCRIPTOR: HtmlAdapterDescriptor = {
  adapter_id: HTML_ADAPTER_ID,
  adapter_version: HTML_ADAPTER_VERSION,
  platform_contract_version: HTML_PLATFORM_CONTRACT_VERSION,
  supported_product_types: ["LAND"],
  render_modes: ["canvas", "preview", "publish"],
  supports_javascript: false,
  editor_operations: [
    "page.create",
    "page.update",
    "page.delete",
    "page.reorder",
    "section.toggle",
    "section.reorder",
    "section.variant.select",
    "section.content.edit",
    "site.settings.edit",
    "theme.select",
    "tier.select",
    "canvas.select",
    "media.upload",
    "media.apply",
    "undo.redo",
  ],
  content_schema_version: HTML_CONTENT_SCHEMA_VERSION,
  snapshot_schema_version: HTML_SNAPSHOT_SCHEMA_VERSION,
  renderer_version: HTML_RENDERER_VERSION,
  hash_algorithm_version: HTML_HASH_ALGORITHM_VERSION,
  asset_model: "library-files+project-media",
  publishing_executor: "platform-published-page",
  preview_renderer: "composition-html",
  status: "DRAFT",
  capability_notes: [
    "LAND + composition HTML only",
    "JavaScript variants are rejected",
    "Navigation management is deferred",
    "Public media manifest remains a gap",
  ],
};

export const HTML_ADAPTER_SUPPORTED_VERSIONS = {
  platform_contract_version: HTML_PLATFORM_CONTRACT_VERSION,
  content_schema_version: HTML_CONTENT_SCHEMA_VERSION,
  snapshot_schema_version: HTML_SNAPSHOT_SCHEMA_VERSION,
  renderer_version: HTML_RENDERER_VERSION,
  hash_algorithm_version: HTML_HASH_ALGORITHM_VERSION,
  adapter_version: HTML_ADAPTER_VERSION,
};

export function validateHtmlAdapterConformance(
  descriptor: HtmlAdapterDescriptor = HTML_ADAPTER_DESCRIPTOR,
): string[] {
  const errors: string[] = [];
  if (descriptor.adapter_id !== HTML_ADAPTER_ID) errors.push("adapter_id must be html.");
  if (!descriptor.adapter_version) errors.push("adapter_version is required.");
  if (descriptor.platform_contract_version !== HTML_PLATFORM_CONTRACT_VERSION) {
    errors.push("platform_contract_version mismatch.");
  }
  if (descriptor.supported_product_types.length === 0) errors.push("supported_product_types is required.");
  if (descriptor.supported_product_types.some((type) => type !== "LAND")) {
    errors.push("only LAND is supported on v0.1.");
  }
  if (!descriptor.render_modes.includes("canvas")) errors.push("canvas render mode is required.");
  if (!descriptor.render_modes.includes("preview")) errors.push("preview render mode is required.");
  if (!descriptor.render_modes.includes("publish")) errors.push("publish render mode is required.");
  if (descriptor.supports_javascript) errors.push("supports_javascript must be false on v0.1.");
  if (descriptor.content_schema_version !== HTML_CONTENT_SCHEMA_VERSION) errors.push("content_schema_version mismatch.");
  if (descriptor.snapshot_schema_version !== HTML_SNAPSHOT_SCHEMA_VERSION) errors.push("snapshot_schema_version mismatch.");
  if (descriptor.renderer_version !== HTML_RENDERER_VERSION) errors.push("renderer_version mismatch.");
  if (descriptor.hash_algorithm_version !== HTML_HASH_ALGORITHM_VERSION) errors.push("hash_algorithm_version mismatch.");
  if (!["READY", "DRAFT", "DEPRECATED"].includes(descriptor.status)) {
    errors.push("status must be READY, DRAFT, or DEPRECATED.");
  }
  return errors;
}

export function assertSupportedVersions(input: {
  platform_contract_version?: string;
  content_schema_version?: number;
  snapshot_schema_version?: number;
  renderer_version?: string;
  hash_algorithm_version?: string;
  adapter_version?: string;
  adapter_id?: string;
}): void {
  if (input.adapter_id !== undefined && input.adapter_id !== HTML_ADAPTER_ID) {
    throw new Error("Unsupported adapter: only html is supported on v0.1.");
  }
  if (input.platform_contract_version !== undefined && input.platform_contract_version !== HTML_PLATFORM_CONTRACT_VERSION) {
    throw new Error("Unsupported platform_contract_version.");
  }
  if (input.content_schema_version !== undefined && input.content_schema_version !== HTML_CONTENT_SCHEMA_VERSION) {
    throw new Error("Unsupported content_schema_version.");
  }
  if (input.snapshot_schema_version !== undefined && input.snapshot_schema_version !== HTML_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error("Unsupported snapshot_schema_version.");
  }
  if (input.renderer_version !== undefined && input.renderer_version !== HTML_RENDERER_VERSION) {
    throw new Error("Unsupported renderer_version.");
  }
  if (input.hash_algorithm_version !== undefined && input.hash_algorithm_version !== HTML_HASH_ALGORITHM_VERSION) {
    throw new Error("Unsupported hash_algorithm_version.");
  }
  if (input.adapter_version !== undefined && input.adapter_version !== HTML_ADAPTER_VERSION) {
    throw new Error("Unsupported adapter_version.");
  }
}

// aliases
export const htmlAdapterDescriptor = HTML_ADAPTER_DESCRIPTOR;
export const checkHtmlAdapterConformance = validateHtmlAdapterConformance;
export const isHtmlAdapterConformant = (descriptor?: HtmlAdapterDescriptor) =>
  validateHtmlAdapterConformance(descriptor).length === 0;
export const pinVersions = assertSupportedVersions;
export const assertVersions = assertSupportedVersions;
