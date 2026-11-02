import {
  mockActivity,
  mockAdminStats,
  mockAudit,
  mockBusinessContext,
  mockComprehend,
  mockCopy,
  mockInvoices,
  mockJob,
  mockNotifications,
  mockPackages,
  mockPayment,
  mockProjects,
  mockSections,
  mockSubscription,
  mockTemplates,
} from "./mock-data";
import type {
  ActivityItem,
  AdminStats,
  AuditItem,
  BusinessContext,
  ComprehendResult,
  CopyField,
  GenerationJob,
  Invoice,
  Notification,
  Package,
  Payment,
  ProductType,
  Project,
  Section,
  Subscription,
  Template,
} from "@/shared/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
const USE_MOCK =
  process.env.NEXT_PUBLIC_API_MODE === "mock" ||
  (typeof window === "undefined" && process.env.NEXT_PUBLIC_API_MODE !== "live");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new Error(body?.error?.message ?? `Request gagal (${response.status})`);
  }

  return (await response.json()) as T;
}

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(clone(value)), ms);
  });
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export const api = {
  projects: {
    list: (): Promise<Project[]> =>
      USE_MOCK ? delay(mockProjects) : request("/projects"),
    get: (id: string): Promise<Project | undefined> =>
      USE_MOCK
        ? delay(mockProjects.find((project) => project.id === id))
        : request(`/projects/${id}`),
    create: (productType: ProductType): Promise<Project> => {
      if (!USE_MOCK) {
        return request("/projects", {
          method: "POST",
          body: JSON.stringify({ product_type: productType }),
        });
      }
      const project: Project = {
        id: `proj_${Date.now()}`,
        clientLabel: "Project Baru",
        productType,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockProjects.unshift(project);
      return delay(project);
    },
    update: (id: string, patch: Partial<Project>): Promise<Project | undefined> => {
      if (!USE_MOCK) {
        return request(`/projects/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
      }
      const project = mockProjects.find((item) => item.id === id);
      if (project) Object.assign(project, patch);
      return delay(project);
    },
    saveContext: (id: string, context: BusinessContext): Promise<BusinessContext> =>
      USE_MOCK
        ? delay(context)
        : request(`/projects/${id}/context`, {
            method: "PUT",
            body: JSON.stringify(context),
          }),
    comprehend: (id: string): Promise<ComprehendResult> =>
      USE_MOCK ? delay(mockComprehend) : request(`/projects/${id}/comprehend`, { method: "POST" }),
    confirmComprehend: (
      id: string,
      corrections?: string,
    ): Promise<{ ok: true }> => {
      if (!USE_MOCK) {
        return request(`/projects/${id}/comprehend`, {
          method: "PATCH",
          body: JSON.stringify({ confirmed: true, corrections }),
        });
      }
      const project = mockProjects.find((item) => item.id === id);
      if (project) project.status = "COMPREHENDED";
      return delay({ ok: true } as const);
    },
  },
  templates: {
    list: (): Promise<Template[]> =>
      USE_MOCK ? delay(mockTemplates) : request("/templates"),
    get: (code: string): Promise<Template | undefined> =>
      USE_MOCK
        ? delay(mockTemplates.find((template) => template.code === code))
        : request(`/templates/${code}`),
  },
  generation: {
    start: (projectId: string): Promise<GenerationJob> =>
      USE_MOCK ? delay(mockJob) : request(`/projects/${projectId}/generate`, { method: "POST" }),
    get: (projectId: string, jobId: string): Promise<GenerationJob> =>
      USE_MOCK ? delay(mockJob) : request(`/projects/${projectId}/jobs/${jobId}`),
    select: (projectId: string, variantId: string): Promise<{ status: string }> =>
      USE_MOCK
        ? delay({ status: "PICKED", variantId })
        : request(`/projects/${projectId}/select`, {
            method: "POST",
            body: JSON.stringify({ variant_id: variantId }),
          }),
  },
  sections: {
    list: (): Promise<Section[]> =>
      USE_MOCK ? delay(mockSections) : request("/sections"),
    update: (projectId: string, sections: Section[]): Promise<Section[]> =>
      USE_MOCK
        ? delay(sections)
        : request(`/projects/${projectId}/sections`, {
            method: "PATCH",
            body: JSON.stringify(sections),
          }),
  },
  copy: {
    list: (): Promise<CopyField[]> =>
      USE_MOCK ? delay(mockCopy) : request("/copy"),
    suggest: (key: string): Promise<string[]> =>
      USE_MOCK
        ? delay([
            `Saran JiooDev untuk ${key}: ringkas, konkret, berorientasi manfaat.`,
            `Versi hangat untuk ${key}: ajak pembaca mengambil langkah kecil.`,
            `Versi tegas untuk ${key}: hilangkan keraguan, tunjukkan hasil.`,
          ])
        : request("/copy/suggest", {
            method: "POST",
            body: JSON.stringify({ key }),
          }),
  },
  payments: {
    get: (projectId: string): Promise<Payment> =>
      USE_MOCK ? delay({ ...mockPayment, projectId }) : request(`/payments/${projectId}`),
    refresh: (paymentId: string): Promise<Payment> =>
      USE_MOCK ? delay({ ...mockPayment, id: paymentId }) : request(`/payments/${paymentId}/refresh`, { method: "POST" }),
  },
  account: {
    notifications: (): Promise<Notification[]> =>
      USE_MOCK ? delay(mockNotifications) : request("/account/notifications"),
    invoices: (): Promise<Invoice[]> =>
      USE_MOCK ? delay(mockInvoices) : request("/account/invoices"),
    subscription: (): Promise<Subscription> =>
      USE_MOCK ? delay(mockSubscription) : request("/account/subscription"),
    activity: (): Promise<ActivityItem[]> =>
      USE_MOCK ? delay(mockActivity) : request("/account/activity"),
  },
  admin: {
    stats: (): Promise<AdminStats> =>
      USE_MOCK ? delay(mockAdminStats) : request("/admin/stats"),
    packages: (): Promise<Package[]> =>
      USE_MOCK ? delay(mockPackages) : request("/admin/packages"),
    audit: (): Promise<AuditItem[]> =>
      USE_MOCK ? delay(mockAudit) : request("/admin/audit"),
  },
};

export type Api = typeof api;
