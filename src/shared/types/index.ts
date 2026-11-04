export type ProductType = "LAND" | "WEB" | "COMM";

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
  billing_type: "FREE" | "SUBSCRIPTION" | "PAY_PER_DEPLOY";
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

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
