export {
  findSlotContent,
  loadWorkspace,
} from "./application/workspace";
export {
  createVersion,
  getRestorePayload,
  listVersions,
  versionHash,
  VERSION_LIMIT,
} from "./application/versioning";
export type {
  SiteVersion,
  SiteVersionInput,
} from "./application/versioning";
export type {
  WorkspaceBlock,
  WorkspaceComposition,
  WorkspaceData,
  WorkspaceSlotMeta,
  WorkspaceTheme,
  WorkspaceVariant,
} from "./application/workspace";
export {
  renderComposition,
  renderCompositionRequest,
  renderVariantPreview,
  resolveCssAssetPath,
  collectCssAssets,
} from "./infrastructure/composition-render";
export type {
  Composition,
  CompositionBlock,
  RenderCompositionOptions,
  RenderCompositionResult,
} from "./infrastructure/composition-render";
export type {
  RenderAsset,
  RenderBlock,
  RenderMode,
  RenderRequest,
  RenderResult,
  RenderWrapper,
} from "@/modules/renderer";

export {
  DEFAULT_WORKSPACE_EDITOR_CAPABILITIES,
  WORKSPACE_EDITOR_OPERATIONS,
  negotiateWorkspaceCapabilities,
  resolveWorkspaceAdapter,
  resolveWorkspaceCapabilities,
  isWorkspaceOperationSupported,
  requireWorkspaceOperation,
} from "./components/workspace-capabilities";
export type {
  WorkspaceEditorCapabilities,
  WorkspaceEditorOperation,
  WorkspaceCapabilityProject,
  ResolvedWorkspaceAdapter,
} from "./components/workspace-capabilities";

// Section SDK types
export type {
  SectionSlotRecord,
  SectionVariantRecord,
  SectionSlotContentSchema,
  SectionFieldDefinition,
  SectionFieldType,
  SectionBlockProps,
  SectionLink,
  SectionImage,
  SectionThemeTokens,
  SectionManifest,
  SectionValidationError,
  SectionValidationErrorCode,
  SectionValidationResult,
  SectionTier,
  SectionStatus,
  SectionLicense,
  SectionSlotSchemaZod,
  SectionVariantSchemaZod,
  SectionManifestZod,
} from "./types/section-manifest";

// Section validation utilities
export {
  slotSchema,
  variantSchema,
  manifestSchema,
  sectionFieldSchema,
  slotContentSchema,
  SECTION_TIERS,
  SECTION_STATUSES,
  validateSlotRecord,
  validateVariantRecord,
  validateSectionFiles,
  getLibraryRoot,
  readJsonFile,
} from "./utils/section-validation";
