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
    productType: "COMM",
    status: "PREVIEWS",
    createdAt: "2026-10-30T10:05:00+07:00",
    updatedAt: "2026-11-03T08:15:00+07:00",
    businessName: "Batik Lestari",
    templateCode: "COMM-LGRID-EDT-015",
  },
  {
    id: "proj_sinar_jaya",
    clientLabel: "Sinar Jaya Konsultan",
    productType: "WEB",
    status: "COMPREHENDED",
    createdAt: "2026-11-01T13:40:00+07:00",
    updatedAt: "2026-11-03T09:20:00+07:00",
    businessName: "Sinar Jaya Konsultan",
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
    code: "LAND-LMENU-EDT-003",
    name: "Menu Editorial",
    productType: "LAND",
    layout: "L-MENU",
    style: "EDT",
    industries: ["FNB", "RET"],
    purposes: ["SAL", "VIS"],
    description: "Landing menu dengan daftar layanan, harga, dan CTA.",
  },
  {
    code: "LAND-LSPLIT-EDT-001",
    name: "Split Hero",
    productType: "LAND",
    layout: "L-SPLIT",
    style: "EDT",
    industries: ["GEN"],
    purposes: ["LDG", "BRD"],
    description: "Hero terbelah dengan penawaran utama dan form kontak.",
  },
  {
    code: "LAND-LSVC-EDT-002",
    name: "Layanan Profesional",
    productType: "LAND",
    layout: "L-SVC",
    style: "EDT",
    industries: ["PRO"],
    purposes: ["SSV", "LDG"],
    description: "Landing layanan dengan keunggulan, statistik, dan CTA.",
  },
  {
    code: "WEB-LPORT-EDT-012",
    name: "Portofolio Properti",
    productType: "WEB",
    layout: "L-PORT",
    style: "EDT",
    industries: ["REA", "CON"],
    purposes: ["POR", "VIS"],
    description: "Website properti dengan galeri, layanan, dan statistik.",
  },
  {
    code: "COMM-LGRID-EDT-015",
    name: "Katalog Grid",
    productType: "COMM",
    layout: "L-GRID",
    style: "EDT",
    industries: ["RET", "FSH", "BEA"],
    purposes: ["SAL", "ORD"],
    description: "Commerce Lite dengan katalog produk dan CTA WhatsApp.",
  },
  {
    code: "COMM-LMENU-EDT-016",
    name: "Paket Acara",
    productType: "COMM",
    layout: "L-MENU",
    style: "EDT",
    industries: ["EVE", "PRO"],
    purposes: ["SSV", "BOK"],
    description: "Commerce jasa dengan paket acara, portofolio, dan CTA.",
  },
  {
    code: "LAND-LSTORY-MIN-004",
    name: "Cerita Bisnis",
    productType: "LAND",
    layout: "L-STORY",
    style: "MIN",
    industries: ["FNB", "BEA"],
    purposes: ["VIS", "BRD"],
    description: "Landing naratif dengan alur cerita dan galeri ringkas.",
  },
  {
    code: "LAND-LCONV-BLD-005",
    name: "Konversi Tegas",
    productType: "LAND",
    layout: "L-CONV",
    style: "BLD",
    industries: ["PRO", "GEN"],
    purposes: ["LDG", "SAL"],
    description: "Landing konversi dengan CTA besar dan bukti sosial.",
  },
  {
    code: "LAND-LPRICE-EDT-006",
    name: "Tabel Harga",
    productType: "LAND",
    layout: "L-PRICE",
    style: "EDT",
    industries: ["PRO", "GEN"],
    purposes: ["SAL", "SSV"],
    description: "Landing harga dengan perbandingan paket yang jelas.",
  },
  {
    code: "WEB-LTEAM-MIN-013",
    name: "Profil Tim",
    productType: "WEB",
    layout: "L-TEAM",
    style: "MIN",
    industries: ["PRO", "CON"],
    purposes: ["SSV", "TRU"],
    description: "Website profil tim dengan kredibilitas dan kontak.",
  },
  {
    code: "WEB-LSTORY-BLD-014",
    name: "Visi Perusahaan",
    productType: "WEB",
    layout: "L-STORY",
    style: "BLD",
    industries: ["PRO", "REA"],
    purposes: ["BRD", "VIS"],
    description: "Website korporat dengan narasi visi dan pencapaian.",
  },
  {
    code: "WEB-LSVC-EDT-015",
    name: "Katalog Layanan",
    productType: "WEB",
    layout: "L-SVC",
    style: "EDT",
    industries: ["PRO", "CON"],
    purposes: ["SSV", "LDG"],
    description: "Website layanan multi-halaman dengan studi kasus.",
  },
  {
    code: "WEB-LCONV-BLD-016",
    name: "Lead Magnet",
    productType: "WEB",
    layout: "L-CONV",
    style: "BLD",
    industries: ["GEN", "PRO"],
    purposes: ["LDG", "SAL"],
    description: "Website akuisisi lead dengan form dan penawaran.",
  },
  {
    code: "WEB-LGALLERY-MIN-017",
    name: "Galeri Karya",
    productType: "WEB",
    layout: "L-GALLERY",
    style: "MIN",
    industries: ["REA", "CON"],
    purposes: ["POR", "VIS"],
    description: "Website galeri proyek dengan filter dan detail.",
  },
  {
    code: "COMM-LPRICE-MIN-017",
    name: "Paket Langganan",
    productType: "COMM",
    layout: "L-PRICE",
    style: "MIN",
    industries: ["GEN", "PRO"],
    purposes: ["SAL", "ORD"],
    description: "Commerce langganan dengan tabel paket dan checkout.",
  },
  {
    code: "COMM-LGALLERY-BLD-018",
    name: "Etalase Visual",
    productType: "COMM",
    layout: "L-GALLERY",
    style: "BLD",
    industries: ["RET", "FSH", "BEA"],
    purposes: ["SAL", "VIS"],
    description: "Etalase produk visual dengan CTA order cepat.",
  },
  {
    code: "COMM-LCONV-EDT-019",
    name: "Order Cepat",
    productType: "COMM",
    layout: "L-CONV",
    style: "EDT",
    industries: ["FNB", "RET"],
    purposes: ["ORD", "SAL"],
    description: "Commerce satu halaman dengan jalur order WhatsApp.",
  },
  {
    code: "COMM-LSTORY-MIN-020",
    name: "Kisah Produk",
    productType: "COMM",
    layout: "L-STORY",
    style: "MIN",
    industries: ["BEA", "FNB"],
    purposes: ["VIS", "SAL"],
    description: "Commerce storytelling dengan asal-usul dan manfaat.",
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
