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
  Project,
  Section,
  Subscription,
  Template,
} from "@/shared/types";

export const mockProjects: Project[] = [
  {
    id: "proj_kopi_pagi",
    clientLabel: "Kopi Pagi Hari",
    productType: "LAND",
    status: "PAID",
    createdAt: "2026-10-28T09:12:00+07:00",
    updatedAt: "2026-11-02T14:30:00+07:00",
    businessName: "Kopi Pagi Hari",
    templateCode: "LAND-LMENU-EDT-003",
    previewUrl: "/preview/kopi-pagi",
  },
  {
    id: "proj_batik_lestari",
    clientLabel: "Batik Lestari",
    productType: "LAND",
    status: "PREVIEWS",
    createdAt: "2026-10-30T10:05:00+07:00",
    updatedAt: "2026-11-03T08:15:00+07:00",
    businessName: "Batik Lestari",
    templateCode: "LAND-LMENU-EDT-003",
  },
  {
    id: "proj_sinar_jaya",
    clientLabel: "Sinar Jaya Konsultan",
    productType: "LAND",
    status: "COMPREHENDED",
    createdAt: "2026-11-01T13:40:00+07:00",
    updatedAt: "2026-11-03T09:20:00+07:00",
    businessName: "Sinar Jaya Konsultan",
    templateCode: "LAND-LSVC-EDT-002",
  },
  {
    id: "proj_rumah_herbal",
    clientLabel: "Rumah Herbal",
    productType: "LAND",
    status: "DRAFT",
    createdAt: "2026-11-03T07:55:00+07:00",
    updatedAt: "2026-11-03T07:55:00+07:00",
  },
];

export const mockTemplates: Template[] = [
  {
    code: "LAND-LSPLIT-EDT-001",
    name: "Split",
    productType: "LAND",
    layout: "L-SPLIT",
    style: "EDT",
    industries: ["GEN"],
    purposes: ["LDG", "BRD"],
    description: "Landing split hero untuk penawaran utama dan form kontak.",
    previewUrl: "/template-preview/LAND-LSPLIT-EDT-001",
    themeId: "editorial-warm",
    tier: "BASIC",
    variantLabel: "Split",
  },
  {
    code: "LAND-LSVC-EDT-002",
    name: "Advisory",
    productType: "LAND",
    layout: "L-SVC",
    style: "EDT",
    industries: ["PRO", "FIN", "GEN"],
    purposes: ["SSV", "LDG"],
    description: "Landing layanan profesional dengan keunggulan dan CTA.",
    previewUrl: "/template-preview/LAND-LSVC-EDT-002",
    themeId: "editorial-warm",
    tier: "BASIC",
    variantLabel: "Advisory",
  },
  {
    code: "LAND-LMENU-EDT-003",
    name: "Bloom",
    productType: "LAND",
    layout: "L-MENU",
    style: "EDT",
    industries: ["BEA", "HTH", "FNB", "GEN"],
    purposes: ["SSV", "ORD", "VIS"],
    description: "Landing menu untuk katalog layanan, harga, dan CTA.",
    previewUrl: "/template-preview/LAND-LMENU-EDT-003",
    themeId: "editorial-warm",
    tier: "PRO",
    variantLabel: "Bloom",
  },
  {
    code: "LAND-LCONV-EDT-004",
    name: "Studio",
    productType: "LAND",
    layout: "L-CONV",
    style: "EDT",
    industries: ["PRO", "TCI"],
    purposes: ["LDG", "BRD"],
    description: "Landing konversi dengan CTA besar dan bukti sosial.",
    previewUrl: "/template-preview/LAND-LCONV-EDT-004",
    themeId: "editorial-warm",
    tier: "PRO",
    variantLabel: "Studio",
  },
  {
    code: "LAND-LSTORY-EDT-005",
    name: "Story",
    productType: "LAND",
    layout: "L-STORY",
    style: "EDT",
    industries: ["PRO"],
    purposes: ["BRD", "LDG"],
    description: "Landing naratif untuk membangun kredibilitas merek.",
    previewUrl: "/template-preview/LAND-LSTORY-EDT-005",
    themeId: "editorial-warm",
    tier: "PRO",
    variantLabel: "Story",
  },
  {
    code: "LAND-LCONV-EDT-006",
    name: "Boardroom",
    productType: "LAND",
    layout: "L-CONV",
    style: "EDT",
    industries: ["PRO", "FIN"],
    purposes: ["LDG", "BRD"],
    description: "Landing korporat dengan penawaran dan alur kontak.",
    previewUrl: "/template-preview/LAND-LCONV-EDT-006",
    themeId: "editorial-warm",
    tier: "PRO",
    variantLabel: "Boardroom",
  },
  {
    code: "LAND-LMENU-EDT-007",
    name: "Launch",
    productType: "LAND",
    layout: "L-MENU",
    style: "EDT",
    industries: ["TCI", "RET"],
    purposes: ["SAL", "LDG"],
    description: "Landing peluncuran produk dengan menu dan CTA.",
    previewUrl: "/template-preview/LAND-LMENU-EDT-007",
    themeId: "editorial-warm",
    tier: "PRO",
    variantLabel: "Launch",
  },
  {
    code: "LAND-LPORT-EDT-008",
    name: "Petal",
    productType: "LAND",
    layout: "L-PORT",
    style: "EDT",
    industries: ["RET", "EVE"],
    purposes: ["POR", "ORD"],
    description: "Landing portofolio dengan galeri dan ajakan order.",
    previewUrl: "/template-preview/LAND-LPORT-EDT-008",
    themeId: "editorial-warm",
    tier: "PRO",
    variantLabel: "Petal",
  },
];

export const mockBusinessContext: BusinessContext = {
  businessName: "Kopi Pagi Hari",
  industry: "FNB",
  businessPurpose: ["SAL", "VIS"],
  targetAudience: "Pekerja kantor dan mahasiswa di sekitar Bandung",
  channels: ["WhatsApp", "Instagram"],
  designPref: "Editorial hangat, tipografi tegas",
  businessGoals: "Menambah pesanan online dan memperkenalkan menu baru",
};

export const mockComprehend: ComprehendResult = {
  summary:
    "Kopi Pagi Hari adalah kedai kopi lokal yang menargetkan pekerja kantor dan mahasiswa. Fokus utama: menambah pesanan online dan memperkenalkan menu baru melalui halaman menu yang hangat dan mudah dipindai.",
  confidence: 0.88,
};

export const mockJob: GenerationJob = {
  id: "job_kopi_01",
  status: "READY",
  progress: 100,
  variants: [
    {
      id: "var_menu",
      label: "Menu-forward",
      previewUrl: "/preview/kopi-pagi?variant=menu",
    },
    {
      id: "var_story",
      label: "Story-forward",
      previewUrl: "/preview/kopi-pagi?variant=story",
    },
    {
      id: "var_convert",
      label: "Conversion-forward",
      previewUrl: "/preview/kopi-pagi?variant=convert",
    },
  ],
};

export const mockSections: Section[] = [
  { code: "S-HERO", name: "Hero", enabled: true, order: 1 },
  { code: "S-MENU", name: "Menu", enabled: true, order: 2 },
  { code: "S-STORY", name: "Cerita", enabled: false, order: 3 },
  { code: "S-GAL", name: "Galeri", enabled: true, order: 4 },
  { code: "S-LOC", name: "Lokasi", enabled: true, order: 5 },
  { code: "S-FOOT", name: "Footer", enabled: true, order: 6 },
];

export const mockCopy: CopyField[] = [
  { key: "hero_eyebrow", label: "Hero eyebrow", value: "Kopi pagi, energi baru" },
  { key: "hero_title", label: "Hero title", value: "Secangkir rutinitas yang lebih baik" },
  {
    key: "hero_subtitle",
    label: "Hero subtitle",
    value: "Biji lokal, racikan konsisten, dan ruang tenang untuk memulai hari.",
  },
  { key: "cta_button", label: "CTA button", value: "Pesan via WhatsApp" },
];

export const mockPayment: Payment = {
  id: "pay_kopi_01",
  projectId: "proj_kopi_pagi",
  amount: 349000,
  status: "PENDING",
  qrString: "00020101021226670016COM.JIOODEV.WWW011893600000000000000000",
  expiresAt: "2026-11-03T12:00:00+07:00",
  createdAt: "2026-11-03T09:30:00+07:00",
};

export const mockNotifications: Notification[] = [
  {
    id: "notif_1",
    title: "Preview siap dipilih",
    body: "Batik Lestari punya 3 varian baru. Tinjau dan pilih satu.",
    read: false,
    createdAt: "2026-11-03T08:15:00+07:00",
  },
  {
    id: "notif_2",
    title: "Pembayaran dikonfirmasi",
    body: "Pembayaran Kopi Pagi Hari sudah diterima.",
    read: true,
    createdAt: "2026-11-02T14:30:00+07:00",
  },
  {
    id: "notif_3",
    title: "Deploy berhasil",
    body: "Kopi Pagi Hari aktif di kopi-pagi.jioo.site.",
    read: true,
    createdAt: "2026-11-02T14:35:00+07:00",
  },
];

export const mockInvoices: Invoice[] = [
  { id: "INV-2026-0012", amount: 349000, status: "PAID", issuedAt: "2026-11-02" },
  { id: "INV-2026-0013", amount: 349000, status: "PENDING", issuedAt: "2026-11-03" },
];

export const mockSubscription: Subscription = {
  plan: "Concierge Starter",
  status: "ACTIVE",
  quotaUsed: 2,
  quotaTotal: 5,
  renewAt: "2026-12-03",
};

export const mockActivity: ActivityItem[] = [
  { id: "act_1", actor: "You", action: "Membuat project Rumah Herbal", createdAt: "2026-11-03T07:55:00+07:00" },
  { id: "act_2", actor: "You", action: "Mengonfirmasi pemahaman Sinar Jaya Konsultan", createdAt: "2026-11-03T09:20:00+07:00" },
  { id: "act_3", actor: "Admin", action: "Mengonfirmasi pembayaran Kopi Pagi Hari", createdAt: "2026-11-02T14:30:00+07:00" },
];

export const mockAdminStats: AdminStats = {
  projects: 24,
  pendingPayments: 3,
  liveDeployments: 11,
  activeUsers: 18,
};

export const mockPackages: Package[] = [
  { id: "pkg_starter", name: "Concierge Starter", tier: "FREE", billing_type: "PAY_PER_DEPLOY", price: 349000, max_sections: 5, js_allowed: false, cms: false, custom_domain: false, deploy_included: 1, status: "ACTIVE", active: true },
  { id: "pkg_growth", name: "Concierge Growth", tier: "PRO", billing_type: "SUBSCRIPTION", price: 899000, max_sections: 8, js_allowed: true, cms: false, custom_domain: true, deploy_included: 3, status: "ACTIVE", active: true },
  { id: "pkg_reseller", name: "Reseller Partner", tier: "AGENCY", billing_type: "SUBSCRIPTION", price: 2490000, max_sections: 10, js_allowed: true, cms: true, custom_domain: true, deploy_included: 10, status: "ACTIVE", active: false },
];

export const mockAudit: AuditItem[] = [
  { id: "aud_1", actor: "admin@jioo.site", action: "payment.confirm", ip: "103.119.237.122", createdAt: "2026-11-02T14:30:00+07:00" },
  { id: "aud_2", actor: "admin@jioo.site", action: "deploy.trigger", ip: "103.119.237.122", createdAt: "2026-11-02T14:33:00+07:00" },
  { id: "aud_3", actor: "system", action: "health.ok", ip: "127.0.0.1", createdAt: "2026-11-02T14:35:00+07:00" },
];
