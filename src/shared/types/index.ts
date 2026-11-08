export type ProductType = "LAND" | "WEB" | "COMM";

export const MVP_PRODUCT_TYPES: ProductType[] = ["LAND"];
export const ALL_PRODUCT_TYPES: ProductType[] = ["LAND", "WEB", "COMM"];

export function isMvpProductType(value: string): value is ProductType {
  return value === "LAND";
}

export type ProjectStatus =
  | "DRAFT"
  | "INTAKE"
  | "COMPREHENDED"
  | "TEMPLATE_CHOSEN"
  | "GENERATING"
  | "PREVIEWS"
  | "PICKED"
  | "PAID"
  | "DEPLOYED"
  | "ACTIVE";

export interface PublishedPage {
  slug: string;
  url: string;
  status: "PUBLISHED" | "UNPUBLISHED";
  version: number;
  title: string;
  noindex: boolean;
  publishedAt?: string;
  unpublishedAt?: string;
  customDomain?: string;
}

export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED" | "REFUNDED";
export type DeploymentStatus =
  | "PENDING"
  | "PROVISIONING"
  | "LIVE"
  | "DEGRADED"
  | "SUSPENDED"
  | "DELETED";

export interface Project {
  id: string;
  clientLabel: string;
  productType: ProductType;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  businessName?: string;
  templateCode?: string;
  previewUrl?: string;
  domain?: string;
}

export interface BusinessContext {
  businessName: string;
  industry: string;
  businessPurpose: string[];
  targetAudience: string;
  channels: string[];
  designPref: string;
  businessGoals: string;
}

export interface ComprehendResult {
  summary: string;
  confidence: number;
}

export type ThemeTier = "BASIC" | "PRO" | "AGENCY";
export type ThemeStatus = "READY" | "CLASSIFIED" | "DRAFT" | "DEPRECATED";

export interface Template {
  code: string;
  name: string;
  productType: ProductType;
  layout: string;
  style: string;
  industries: string[];
  purposes: string[];
  description: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  previewHash?: string;
  previewStatus?: "READY" | "STALE" | "FAILED" | "MISSING";
  themeId?: string;
  tier?: ThemeTier;
  variantLabel?: string;
}

export interface ThemeTierGroup {
  tier: ThemeTier;
  variants: Template[];
}

export interface ThemeProductGroup {
  type: ProductType;
  tiers: ThemeTierGroup[];
}

export interface Theme {
  themeId: string;
  name: string;
  description: string;
  style: string;
  thumbnailUrl?: string;
  primaryVariantCode?: string;
  status: ThemeStatus;
  products: ThemeProductGroup[];
  variantCount: number;
}

export interface JobVariant {
  id: string;
  label: string;
  previewUrl: string;
}

export interface GenerationJob {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  progress: number;
  variants: JobVariant[];
}

export interface Section {
  code: string;
  name: string;
  enabled: boolean;
  order: number;
  variantId?: string;
  content?: Record<string, unknown>;
}

export interface SectionVariantOption {
  code: string;
  name: string;
}

export interface SectionWithVariants extends Section {
  variants: SectionVariantOption[];
}

export interface CopyField {
  key: string;
  label: string;
  value: string;
}

export interface Payment {
  id: string;
  projectId: string;
  amount: number;
  status: PaymentStatus;
  qrString: string;
  expiresAt: string;
  createdAt: string;
  invoiceNo?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo?: string;
  amount: number;
  status: "PAID" | "PENDING" | "FAILED" | "REFUNDED";
  issuedAt: string;
}

export interface Subscription {
  plan: string;
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED";
  quotaUsed: number;
  quotaTotal: number;
  renewAt: string;
}

export interface UserWithSubscription {
  id: string;
  email: string;
  name: string;
  subscription: {
    id: string;
    package_id: string;
    package_name?: string;
    period_start: string;
    period_end: string | null;
    quota_landing_total: number;
    quota_landing_used: number;
    quota_web_total: number;
    quota_web_used: number;
    status: string;
  } | null;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  createdAt: string;
}

export interface Package {
  id: string;
  name: string;
  tier: "FREE" | "PRO" | "AGENCY" | "ADDON";
  billing_type: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY" | "LIFETIME";
  price: number;
  max_sections: number;
  js_allowed: boolean;
  cms: boolean;
  custom_domain: boolean;
  deploy_included: number;
  valid_from?: string;
  valid_until?: string;
  status: "ACTIVE" | "EXPIRED" | "DRAFT";
  active: boolean;
}

export interface AuditItem {
  id: string;
  actor: string;
  action: string;
  ip: string;
  createdAt: string;
}

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

export interface AdminStats {
  projects: number;
  pendingPayments: number;
  liveDeployments: number;
  activeUsers: number;
}

export interface ProjectAsset {
  id: string;
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

export interface SiteSettings {
  site_name?: string;
  footer_tagline?: string;
  theme_id?: string;
  tier?: "BASIC" | "PRO" | "AGENCY";
}

export interface Site {
  id: string;
  project_ref: string;
  site_settings: SiteSettings;
  navigation_ref?: string;
  theme_tier_ref?: { theme_id: string; tier: "BASIC" | "PRO" | "AGENCY" };
}

export interface Seo {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

export interface Page {
  id: string;
  site_id: string;
  title: string;
  slug: string;
  is_home: boolean;
  order: number;
  seo: Seo;
  settings: Record<string, unknown>;
  visibility?: "public" | "private";
}

export interface SectionInstance {
  page_id: string;
  section_code: string;
  variant_id?: string;
  order: number;
  enabled: boolean;
  content?: Record<string, unknown>;
}

export interface Media {
  id: string;
  project_ref: string;
  site_ref?: string;
  type: "image" | "logo" | "document" | string;
  file?: string;
  url?: string;
  alt: string;
  metadata?: Record<string, unknown>;
  license_provenance?: Record<string, unknown>;
}

export interface DraftSnapshot {
  site: Site;
  page: Page;
  sections: SectionInstance[];
  settings: SiteSettings;
  content: Record<string, Record<string, unknown>>;
  assets: { base_url: string; manifest: Array<{ path: string; hash: string }> };
  snapshot_schema_version: number;
  content_schema_version: number;
}

export interface RenderRequest {
  contract_version: "0.1";
  hash_algorithm_version: "uwps-render-hash/1";
  adapter: { id: string; version: string };
  render_mode: "canvas" | "preview" | "publish";
  snapshot: DraftSnapshot;
  options: { device: "web"; no_js: boolean; locale: string };
}

export interface RenderResult {
  status: "READY" | "FAILED";
  html: string;
  assets: Array<{ path: string; hash: string }>;
  render_hash: string;
  hash_algorithm_version: "uwps-render-hash/1";
  renderer_version: string;
  diagnostics: string[];
  warnings: string[];
  wrapper: {
    title: string;
    description: string;
    canonical: string;
    noindex: boolean;
  };
}

export interface PublishedPage {
  slug: string;
  url: string;
  status: "PUBLISHED" | "UNPUBLISHED";
  version: number;
  title: string;
  noindex: boolean;
  publishedAt?: string;
  unpublishedAt?: string;
  customDomain?: string;
}

export interface PublishSnapshotReport {
  kind: "publish";
  template: string;
  site: { site_id: string; site_settings: SiteSettings } | null;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    isHome: boolean;
    seo: Seo;
    settings: Record<string, unknown>;
    site: { site_id: string; site_settings: SiteSettings };
    html: string;
    html_hash: string;
  }>;
  publish_revision: string;
  idempotency_key: string;
  client_idempotency_key?: string;
  render_hash: string;
  hash_algorithm_version: string;
  snapshot_schema_version: number;
  adapter_id: string;
  adapter_version: string;
  renderer_version: string;
  legacy?: {
    template: string;
    variantId?: string;
    businessName: string;
    html: string;
    html_hash: string;
  };
}

export interface PublishCandidatePage {
  snapshot: PublishSnapshotReport["pages"][0];
  html: string;
  hash: string;
  url: string;
  title: string;
  noindex: boolean;
}

export interface PublishCandidate {
  projectId: string;
  projectLabel?: string;
  slug: string;
  template: string;
  businessName?: string;
  site: { site_id: string; site_settings: SiteSettings } | null;
  pages: PublishCandidatePage[];
  renderHash: string;
}

export interface PublishHealth {
  ok: boolean;
  message?: string;
  checks?: Record<string, boolean>;
}

export type PublishHealthCheck = (
  candidate: PublishCandidate,
) => Promise<PublishHealth>;

export type PublishResult =
  | { ok: true; page: PublishedPage; idempotent?: boolean }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "INVALID_TRANSITION"
        | "NO_OUTPUT"
        | "PAYMENT_REQUIRED"
        | "VALIDATION_FAILED"
        | "RENDER_FAILED"
        | "HEALTH_FAILED"
        | "CONFLICT";
      message: string;
    };
