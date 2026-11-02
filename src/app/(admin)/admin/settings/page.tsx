import { AdminSettings } from "@/modules/admin/components/admin-settings";
import { ThemeToggle } from "@/modules/account/components/theme-toggle";
import { Card, PageHeader } from "@/shared/ui";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Pengaturan Global"
        description="Feature toggle dan integrasi platform."
      />
      <AdminSettings />
      <Card title="Tema admin">
        <ThemeToggle />
      </Card>
    </div>
  );
}
