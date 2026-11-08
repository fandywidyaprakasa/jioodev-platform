import { AdminSettings } from "@/modules/admin/client";
import { ThemeToggle } from "@/modules/account/client";
import { LanguageToggle } from "@/modules/account/client";
import { getLocale } from "@/shared/lib/locale";
import { t } from "@/shared/lib/i18n";
import { Card, PageHeader } from "@/shared/ui";

export default async function AdminSettingsPage() {
  const locale = await getLocale();
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
