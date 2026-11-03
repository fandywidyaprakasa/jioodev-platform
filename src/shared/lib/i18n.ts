export type Locale = "id" | "en";

export const dictionaries = {
  id: {
    "nav.dashboard": "Dashboard",
    "nav.projects": "Projects",
    "nav.account": "Akun",
    "nav.notifications": "Notifikasi",
    "nav.invoices": "Tagihan",
    "nav.subscription": "Paket & Kuota",
    "nav.settings": "Pengaturan",
    "action.createProject": "Buat Project",
    "action.continue": "Lanjut",
    "action.save": "Simpan",
    "action.back": "Kembali",
    "action.admin": "Admin",
    "action.workspace": "Ke Workspace",
    "nav.admin.dashboard": "Dashboard",
    "nav.admin.projects": "Projects",
    "nav.admin.packages": "Paket",
    "nav.admin.payments": "Pembayaran",
    "nav.admin.deploy": "Deploy",
    "nav.admin.content": "Konten",
    "nav.admin.settings": "Pengaturan",
    "nav.admin.audit": "Audit",
    "settings.language": "Bahasa",
    "settings.languageHint": "Pilih bahasa antarmuka.",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.projects": "Projects",
    "nav.account": "Account",
    "nav.notifications": "Notifications",
    "nav.invoices": "Invoices",
    "nav.subscription": "Plan & Quota",
    "nav.settings": "Settings",
    "action.createProject": "Create Project",
    "action.continue": "Continue",
    "action.save": "Save",
    "action.back": "Back",
    "action.admin": "Admin",
    "action.workspace": "Go to Workspace",
    "nav.admin.dashboard": "Dashboard",
    "nav.admin.projects": "Projects",
    "nav.admin.packages": "Packages",
    "nav.admin.payments": "Payments",
    "nav.admin.deploy": "Deploy",
    "nav.admin.content": "Content",
    "nav.admin.settings": "Settings",
    "nav.admin.audit": "Audit",
    "settings.language": "Language",
    "settings.languageHint": "Choose the interface language.",
  },
} as const;

export type DictionaryKey = keyof (typeof dictionaries)["id"];

export function t(locale: Locale, key: DictionaryKey): string {
  return dictionaries[locale][key] ?? key;
}
