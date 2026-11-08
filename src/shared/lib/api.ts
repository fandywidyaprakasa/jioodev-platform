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
  Deployment,
  DomainRecord,
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
  PublishedPage,
  Section,
  Subscription,
  Template,
} from "@/shared/types";
import { isMvpProductType } from "@/shared/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
const USE_MOCK = process.env.NEXT_PUBLIC_API_MODE === "mock";

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
    create: (
      productType: ProductType,
      templateCode?: string,
    ): Promise<Project> => {
      if (!isMvpProductType(productType)) {
        return Promise.reject(new Error("MVP hanya mendukung Landing (LAND)."));
      }
      if (!USE_MOCK) {
        return request("/projects", {
          method: "POST",
          body: JSON.stringify({
            product_type: productType,
            ...(templateCode ? { template_code: templateCode } : {}),
          }),
        });
      }
      const project: Project = {
        id: `proj_${Date.now()}`,
        clientLabel: "Project Baru",
        productType,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(templateCode ? { templateCode } : {}),
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
    deployment: (id: string): Promise<{ deployment: Deployment | null; projectStatus: string }> =>
      USE_MOCK
        ? delay({ deployment: null, projectStatus: "PAID" })
        : request(`/projects/${id}/deploy`),
    deploy: (id: string): Promise<Deployment> =>
      USE_MOCK
        ? delay({
            id: `dep_${Date.now()}`,
            projectId: id,
            target: "container",
            environment: "production",
            status: "LIVE",
            liveUrl: `/p/${id}`,
            health: "OK",
          })
        : request(`/projects/${id}/deploy`, { method: "POST" }),
    publish: (id: string): Promise<PublishedPage> =>
      USE_MOCK
        ? delay({
            slug: id.toLowerCase(),
            url: `/p/${id.toLowerCase()}`,
            status: "PUBLISHED" as const,
            version: 1,
            title: "Project Baru",
            noindex: false,
          })
        : request(`/projects/${id}/publish`, { method: "POST" }),
    published: (id: string): Promise<{ published: boolean; page: PublishedPage | null }> =>
      USE_MOCK
        ? delay({ published: false, page: null })
        : request(`/projects/${id}/publish`),
    unpublish: (id: string): Promise<{ ok: boolean }> =>
      USE_MOCK
        ? delay({ ok: true })
        : request(`/projects/${id}/publish`, { method: "DELETE" }),
    assets: (id: string): Promise<{ id: string; name: string; url: string; size: number; createdAt: string }[]> =>
      USE_MOCK ? delay([]) : request(`/projects/${id}/assets`),
    uploadAsset: async (
      id: string,
      file: File,
    ): Promise<{ id: string; name: string; url: string; size: number; createdAt: string }> => {
      if (USE_MOCK) {
        return await delay({
          id: `asset_${Date.now()}`,
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          createdAt: new Date().toISOString(),
        });
      }
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`${BASE}/projects/${id}/assets`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message ?? "Upload gagal.");
      }
      return await response.json();
    },
    domains: (id: string): Promise<DomainRecord[]> =>
      USE_MOCK ? delay([]) : request(`/projects/${id}/domains`),
    addDomain: (id: string, domain: string): Promise<DomainRecord> =>
      USE_MOCK
        ? delay({ id: `dom_${Date.now()}`, projectId: id, domain, type: "CNAME", status: "PENDING", sslStatus: "PENDING" })
        : request(`/projects/${id}/domains`, {
            method: "POST",
            body: JSON.stringify({ domain }),
          }),
    verifyDomain: (id: string, domainId: string): Promise<DomainRecord> =>
      USE_MOCK
        ? delay({ id: domainId, projectId: id, domain: "example.com", type: "CNAME", status: "VERIFIED", sslStatus: "PENDING" })
        : request(`/projects/${id}/domains/${domainId}/verify`, { method: "POST" }),
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
    list: (projectId: string): Promise<Section[]> =>
      USE_MOCK
        ? delay(mockSections)
        : request(`/projects/${projectId}/sections`),
    update: (projectId: string, sections: Section[]): Promise<Section[]> =>
      USE_MOCK
        ? delay(sections)
        : request(`/projects/${projectId}/sections`, {
            method: "PATCH",
            body: JSON.stringify(sections),
          }),
  },
  copy: {
    list: (projectId: string): Promise<CopyField[]> =>
      USE_MOCK
        ? delay(mockCopy)
        : request(`/projects/${projectId}/copy`),
    save: (projectId: string, fields: CopyField[]): Promise<CopyField[]> =>
      USE_MOCK
        ? delay(fields)
        : request(`/projects/${projectId}/copy`, {
            method: "PUT",
            body: JSON.stringify(fields),
          }),
    suggest: (projectId: string, key: string): Promise<string[]> =>
      USE_MOCK
        ? delay([
            `Saran JiooDev untuk ${key}: ringkas, konkret, berorientasi manfaat.`,
            `Versi hangat untuk ${key}: ajak pembaca mengambil langkah kecil.`,
            `Versi tegas untuk ${key}: hilangkan keraguan, tunjukkan hasil.`,
          ])
        : request(`/projects/${projectId}/copy/suggest`, {
            method: "POST",
            body: JSON.stringify({ key }),
          }),
  },
  payments: {
    get: (projectId: string): Promise<Payment> =>
      USE_MOCK
        ? delay({ ...mockPayment, projectId })
        : request(`/projects/${projectId}/payment`),
    create: (projectId: string, packageId?: string): Promise<Payment> =>
      USE_MOCK
        ? delay({ ...mockPayment, projectId })
        : request(`/projects/${projectId}/payment`, {
            method: "POST",
            body: JSON.stringify({ package_id: packageId }),
          }),
    refresh: (paymentId: string): Promise<Payment> =>
      USE_MOCK
        ? delay({ ...mockPayment, id: paymentId })
        : request(`/payments/${paymentId}/refresh`, { method: "POST" }),
  },
  account: {
    profile: (): Promise<{
      id: string;
      name: string;
      email: string;
      phone: string;
      company: string;
      locale: string;
      timezone: string;
      notificationsPref?: Record<string, boolean>;
    }> => (USE_MOCK ? delay({ id: "mock-user", name: "Fandy Widyaprakasa", email: "fandy@jioo.site", phone: "0812-0000-0000", company: "JiooDev", locale: "id", timezone: "Asia/Jakarta" }) : request("/account")),
    updateProfile: (patch: Record<string, unknown>) =>
      USE_MOCK
        ? delay({ ...patch })
        : request("/account", { method: "PATCH", body: JSON.stringify(patch) }),
    notifications: (): Promise<Notification[]> =>
      USE_MOCK ? delay(mockNotifications) : request("/account/notifications"),
    markNotificationRead: (id: string): Promise<Notification> =>
      USE_MOCK
        ? delay(mockNotifications[0])
        : request(`/account/notifications/${id}/read`, { method: "POST" }),
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
    createPackage: (input: {
      name: string;
      price: number;
      deploy_included: number;
      tier?: Package["tier"];
      billing_type?: Package["billing_type"];
    }): Promise<Package> =>
      USE_MOCK
        ? delay({
            id: `pkg_${Date.now()}`,
            name: input.name,
            tier: input.tier ?? "FREE",
            billing_type: input.billing_type ?? "PAY_PER_DEPLOY",
            price: input.price,
            max_sections: 5,
            js_allowed: false,
            cms: false,
            custom_domain: false,
            deploy_included: input.deploy_included,
            status: "ACTIVE",
            active: true,
          })
        : request("/admin/packages", {
            method: "POST",
            body: JSON.stringify(input),
          }),
    updatePackage: (
      id: string,
      patch: Partial<Pick<Package, "name" | "price" | "deploy_included" | "active" | "tier" | "billing_type">>,
    ): Promise<Package> =>
      USE_MOCK
        ? delay({
            id,
            name: "Paket",
            tier: "FREE",
            billing_type: "PAY_PER_DEPLOY",
            price: 0,
            max_sections: 5,
            js_allowed: false,
            cms: false,
            custom_domain: false,
            deploy_included: 0,
            status: "ACTIVE",
            active: true,
            ...patch,
          })
        : request("/admin/packages", {
            method: "PATCH",
            body: JSON.stringify({ id, ...patch }),
          }),
    deletePackage: (id: string): Promise<{ ok: true }> =>
      USE_MOCK
        ? delay({ ok: true as const })
        : request(`/admin/packages?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          }),
    audit: (): Promise<AuditItem[]> =>
      USE_MOCK ? delay(mockAudit) : request("/admin/audit"),
    settings: (): Promise<Record<string, boolean>> =>
      USE_MOCK
        ? delay({ mockAuth: false, autoDeploy: false, qrisSandbox: true, emailWorker: false })
        : request("/admin/settings"),
    deployments: (): Promise<Deployment[]> =>
      USE_MOCK ? delay([]) : request("/admin/deploy"),
    deployProject: (projectId: string): Promise<Deployment> =>
      USE_MOCK
        ? delay({ id: `dep_${Date.now()}`, projectId, target: "coolify", environment: "production", status: "PROVISIONING", liveUrl: `${projectId}.jioo.site`, health: "PENDING" })
        : request(`/admin/deploy/${projectId}`, { method: "POST" }),
    deployHealth: (projectId: string): Promise<Deployment> =>
      USE_MOCK
        ? delay({ id: `dep_${Date.now()}`, projectId, target: "coolify", environment: "production", status: "LIVE", liveUrl: `${projectId}.jioo.site`, health: "OK" })
        : request(`/admin/deploy/${projectId}/health`, { method: "POST" }),
    rollbackDeployment: (projectId: string): Promise<Deployment> =>
      USE_MOCK
        ? delay({ id: `dep_${Date.now()}`, projectId, target: "coolify", environment: "production", status: "SUSPENDED", liveUrl: `${projectId}.jioo.site`, health: "UNKNOWN" })
        : request(`/admin/deploy/${projectId}/rollback`, { method: "POST" }),
    updateSettings: (patch: Record<string, unknown>) =>
      USE_MOCK
        ? delay({ ...patch })
        : request("/admin/settings", {
            method: "PATCH",
            body: JSON.stringify(patch),
          }),
    refundPayment: (id: string): Promise<{ ok: true; payment: Payment }> =>
      USE_MOCK
        ? delay({ ok: true as const, payment: { ...mockPayment, id, status: "REFUNDED" } })
        : request(`/admin/payments/${id}/refund`, { method: "POST" }),
    confirmPayment: (id: string): Promise<{ ok: true; payment: Payment }> => {
      if (!USE_MOCK) {
        return request(`/admin/payments/${id}/confirm`, { method: "POST" });
      }
      const payment = mockPayment.id === id ? mockPayment : { ...mockPayment, id };
      payment.status = "CONFIRMED";
      const project = mockProjects.find((item) => item.id === payment.projectId);
      if (project && project.status === "PICKED") project.status = "PAID";
      return delay({ ok: true as const, payment });
    },
    listUsersWithSubscriptions: (): Promise<
      Array<{
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
      }>
    > => USE_MOCK ? delay([]) : request("/admin/subscriptions"),
    grantSubscription: (input: {
      userId: string;
      packageId: string;
      periodEnd?: string | null;
      quotaLanding?: number;
      quotaWeb?: number;
    }): Promise<{ id: string }> =>
      USE_MOCK
        ? delay({ id: `sub_${Date.now()}` })
        : request("/admin/subscriptions", {
            method: "POST",
            body: JSON.stringify(input),
          }),
    updateSubscription: (
      id: string,
      patch: {
        package_id?: string;
        period_end?: string | null;
        quota_landing_total?: number;
        quota_web_total?: number;
        quota_landing_used?: number;
        quota_web_used?: number;
        status?: string;
      },
    ): Promise<void> =>
      USE_MOCK
        ? delay(undefined)
        : request(`/admin/subscriptions/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          }),
    revokeSubscription: (id: string): Promise<void> =>
      USE_MOCK
        ? delay(undefined)
        : request(`/admin/subscriptions/${id}`, {
            method: "DELETE",
          }),
  },
};

export type Api = typeof api;
