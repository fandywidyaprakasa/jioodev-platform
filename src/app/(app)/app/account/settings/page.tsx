import Link from "next/link";
import { NotificationSettings } from "@/modules/account/components/notification-settings";
import { ThemeToggle } from "@/modules/account/components/theme-toggle";
import { LanguageToggle } from "@/modules/account/components/language-toggle";
import { getLocale } from "@/shared/lib/locale";
import { t } from "@/shared/lib/i18n";
import { Card, PageHeader } from "@/shared/ui";

export default function SettingsPage() {
  const locale = getLocale();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Notifikasi, tema, bahasa, dan keamanan akun."
      />
      <NotificationSettings />
      <Card title="Tema" description="Perubahan langsung diterapkan.">
        <ThemeToggle />
      </Card>
      <Card
        title={t(locale, "settings.language")}
        description={t(locale, "settings.languageHint")}
      >
        <LanguageToggle initial={locale} />
      </Card>
      <Card title="Pembayaran" description="Metode dan riwayat tagihan.">
        <p className="text-sm text-muted">
          Pembayaran memakai QRIS. Invoice dan status tersedia di halaman tagihan.
        </p>
        <Link
          href="/app/account/invoices"
          className="mt-3 inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink/40"
        >
          Lihat Tagihan
        </Link>
      </Card>
      <Card title="Keamanan" description="Sesi dan akses akun.">
        <ul className="space-y-2 text-sm text-muted">
          <li>Login hanya melalui Google OAuth (tanpa password lokal).</li>
          <li>Sesi default 12 jam; opsi “Ingat saya” memperpanjang hingga 30 hari.</li>
          <li>Admin memiliki batas sesi 8 jam.</li>
        </ul>
      </Card>
      <Card title="Zona berbahaya">
        <p className="text-sm text-muted">
          Penghapusan akun bersifat permanen dan menghapus seluruh project. Hubungi
          admin di{" "}
          <a href="mailto:hello@jioo.site" className="text-accent hover:underline">
            hello@jioo.site
          </a>{" "}
          untuk memproses.
        </p>
      </Card>
    </div>
  );
}
