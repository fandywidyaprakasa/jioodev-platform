import { AccountForm } from "@/modules/account/components/account-form";
import { ThemeToggle } from "@/modules/account/components/theme-toggle";
import { Card, PageHeader } from "@/shared/ui";

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Akun"
        title="Profil & Pengaturan"
        description="Kelola profil, preferensi tampilan, dan keamanan."
      />
      <AccountForm />
      <Card title="Tampilan" description="Pilih tema terang atau gelap.">
        <ThemeToggle />
      </Card>
      <Card title="Keamanan">
        <p className="text-sm text-muted">
          Login memakai Google OAuth. Sesi dikelola NextAuth dan dapat diakhiri dari tombol keluar.
        </p>
      </Card>
    </div>
  );
}
