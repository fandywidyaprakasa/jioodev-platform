import {
  HTML_ADAPTER_DESCRIPTOR,
  HTML_ADAPTER_ID,
  HTML_ADAPTER_VERSION,
  assertSupportedVersions,
  type HtmlAdapterDescriptor,
} from "@/modules/adapters";

export const WORKSPACE_EDITOR_OPERATIONS = [
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
] as const;

export type WorkspaceEditorOperation =
  (typeof WORKSPACE_EDITOR_OPERATIONS)[number];

export interface WorkspaceEditorCapabilities {
  supported: boolean;
  adapterId: string;
  adapterVersion: string;
  operations: ReadonlySet<string>;
  reason: string | null;
  isSupported: (operation: WorkspaceEditorOperation | string) => boolean;
  reasonFor: (operation: WorkspaceEditorOperation | string) => string | null;
}

export interface NegotiateWorkspaceCapabilitiesInput {
  adapterId?: string | null;
  adapterVersion?: string | null;
  descriptor?: HtmlAdapterDescriptor;
}

function unsupportedCapabilities(
  adapterId: string,
  adapterVersion: string,
  reason: string,
): WorkspaceEditorCapabilities {
  return {
    supported: false,
    adapterId,
    adapterVersion,
    operations: new Set<string>(),
    reason,
    isSupported: () => false,
    reasonFor: () => reason,
  };
}

export function negotiateWorkspaceCapabilities(
  input: NegotiateWorkspaceCapabilitiesInput = {},
): WorkspaceEditorCapabilities {
  const descriptor = input.descriptor ?? HTML_ADAPTER_DESCRIPTOR;
  const adapterId = input.adapterId ?? descriptor.adapter_id;
  const adapterVersion = input.adapterVersion ?? descriptor.adapter_version;

  if (
    descriptor.adapter_id !== HTML_ADAPTER_ID ||
    descriptor.adapter_version !== HTML_ADAPTER_VERSION
  ) {
    return unsupportedCapabilities(
      adapterId,
      adapterVersion,
      `Adapter ${descriptor.adapter_id} v${descriptor.adapter_version} tidak didukung. Editor ini hanya untuk adapter HTML v${HTML_ADAPTER_VERSION}.`,
    );
  }

  if (!adapterId || adapterId !== HTML_ADAPTER_ID) {
    return unsupportedCapabilities(
      adapterId,
      adapterVersion,
      `Adapter ${adapterId || "(tidak dikenal)"} tidak didukung. Editor ini hanya untuk adapter HTML v${HTML_ADAPTER_VERSION}.`,
    );
  }

  if (!adapterVersion || adapterVersion !== HTML_ADAPTER_VERSION) {
    return unsupportedCapabilities(
      adapterId,
      adapterVersion,
      `Versi adapter ${adapterVersion || "(tidak dikenal)"} tidak didukung. Editor ini hanya untuk adapter HTML v${HTML_ADAPTER_VERSION}.`,
    );
  }

  const operations = new Set(descriptor.editor_operations);

  return {
    supported: true,
    adapterId,
    adapterVersion,
    operations,
    reason: null,
    isSupported: (operation) => operations.has(operation),
    reasonFor: (operation) =>
      operations.has(operation)
        ? null
        : `Operasi ${operation} tidak didukung oleh adapter HTML v${HTML_ADAPTER_VERSION}.`,
  };
}

export const DEFAULT_WORKSPACE_EDITOR_CAPABILITIES =
  negotiateWorkspaceCapabilities();

export interface WorkspaceCapabilityProject {
  product_type?: string | null;
  active_sections?: unknown;
}

export interface ResolvedWorkspaceAdapter {
  adapterId: string;
  adapterVersion: string;
  descriptor: HtmlAdapterDescriptor;
}

export function resolveWorkspaceAdapter(
  project?: WorkspaceCapabilityProject | null,
): ResolvedWorkspaceAdapter | null {
  if (!project) return null;
  if (project.product_type !== "LAND") return null;

  const state =
    project.active_sections &&
    typeof project.active_sections === "object" &&
    !Array.isArray(project.active_sections)
      ? (project.active_sections as Record<string, unknown>)
      : {};
  const technology =
    state.technology &&
    typeof state.technology === "object" &&
    !Array.isArray(state.technology)
      ? (state.technology as Record<string, unknown>)
      : null;

  if (!technology) {
    return {
      adapterId: HTML_ADAPTER_ID,
      adapterVersion: HTML_ADAPTER_VERSION,
      descriptor: HTML_ADAPTER_DESCRIPTOR,
    };
  }

  if (
    typeof technology.adapter_id !== "string" ||
    typeof technology.adapter_version !== "string" ||
    typeof technology.contract_version !== "string" ||
    typeof technology.content_schema_version !== "number" ||
    typeof technology.snapshot_schema_version !== "number" ||
    typeof technology.renderer_version !== "string" ||
    typeof technology.hash_algorithm_version !== "string"
  ) {
    return null;
  }

  const adapterId = technology.adapter_id;
  const adapterVersion = technology.adapter_version;

  try {
    assertSupportedVersions({
      adapter_id: adapterId,
      adapter_version: adapterVersion,
      platform_contract_version: technology.contract_version,
      content_schema_version: technology.content_schema_version,
      snapshot_schema_version: technology.snapshot_schema_version,
      renderer_version: technology.renderer_version,
      hash_algorithm_version: technology.hash_algorithm_version,
    });
  } catch {
    return null;
  }

  if (adapterId !== HTML_ADAPTER_ID || adapterVersion !== HTML_ADAPTER_VERSION) {
    return null;
  }

  return {
    adapterId,
    adapterVersion,
    descriptor: HTML_ADAPTER_DESCRIPTOR,
  };
}

export function resolveWorkspaceCapabilities(
  project?: WorkspaceCapabilityProject | null,
): WorkspaceEditorCapabilities | null {
  const resolved = resolveWorkspaceAdapter(project);
  if (!resolved) return null;
  return negotiateWorkspaceCapabilities({
    adapterId: resolved.adapterId,
    adapterVersion: resolved.adapterVersion,
    descriptor: resolved.descriptor,
  });
}

export function isWorkspaceOperationSupported(
  project: WorkspaceCapabilityProject | null | undefined,
  operation: string,
): boolean {
  const capabilities = resolveWorkspaceCapabilities(project);
  if (!capabilities) return false;
  return capabilities.isSupported(operation);
}

export function requireWorkspaceOperation(
  project: WorkspaceCapabilityProject | null | undefined,
  operation: string,
): WorkspaceEditorCapabilities {
  const capabilities = resolveWorkspaceCapabilities(project);
  if (!capabilities || !capabilities.isSupported(operation)) {
    throw new Error(`Unsupported workspace operation: ${operation}`);
  }
  return capabilities;
}
