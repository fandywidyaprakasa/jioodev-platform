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
  },
} as const;

export type DictionaryKey = keyof (typeof dictionaries)["id"];

export function t(locale: Locale, key: DictionaryKey): string {
  return dictionaries[locale][key] ?? key;
}
