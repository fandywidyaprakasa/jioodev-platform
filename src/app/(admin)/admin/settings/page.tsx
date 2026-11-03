import { AdminSettings } from "@/modules/admin/components/admin-settings";
import { ThemeToggle } from "@/modules/account/components/theme-toggle";
import { LanguageToggle } from "@/modules/account/components/language-toggle";
import { getLocale } from "@/shared/lib/locale";
import { t } from "@/shared/lib/i18n";
import { Card, PageHeader } from "@/shared/ui";

export default function AdminSettingsPage() {
  const locale = getLocale();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Global"
        description="Feature toggle dan integrasi platform."
      />
      <AdminSettings />
      <Card title="Tema admin">
        <ThemeToggle />
      </Card>
      <Card
        title={t(locale, "settings.language")}
        description={t(locale, "settings.languageHint")}
      >
        <LanguageToggle initial={locale} />
      </Card>
    </div>
  );
}
