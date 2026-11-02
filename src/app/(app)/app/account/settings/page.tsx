import { NotificationSettings } from "@/modules/account/components/notification-settings";
import { ThemeToggle } from "@/modules/account/components/theme-toggle";
import { Card, PageHeader } from "@/shared/ui";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Akun"
        title="Pengaturan"
        description="Notifikasi, tema, dan keamanan akun."
      />
      <NotificationSettings />
      <Card title="Tema" description="Perubahan langsung diterapkan.">
        <ThemeToggle />
      </Card>
    </div>
  );
}
