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
  amount: number;
  status: "PAID" | "PENDING" | "FAILED";
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
  price: number;
  quota: number;
  active: boolean;
}

export interface AuditItem {
  id: string;
  actor: string;
  action: string;
  ip: string;
  createdAt: string;
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
