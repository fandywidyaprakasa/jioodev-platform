import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, type NavItem } from "@/shared/ui";
import { LogoutButton } from "@/shared/ui/logout-button";
import { getLocale } from "@/shared/lib/locale";
import { t } from "@/shared/lib/i18n";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const NAV: NavItem[] = [
    { label: t(locale, "nav.admin.dashboard"), href: "/admin" },
    { label: t(locale, "nav.admin.projects"), href: "/admin/projects" },
    { label: t(locale, "nav.admin.packages"), href: "/admin/packages" },
    { label: t(locale, "nav.admin.payments"), href: "/admin/payments" },
    { label: t(locale, "nav.admin.deploy"), href: "/admin/deploy" },
    { label: t(locale, "nav.admin.content"), href: "/admin/content" },
    { label: t(locale, "nav.admin.settings"), href: "/admin/settings" },
    { label: t(locale, "nav.admin.audit"), href: "/admin/audit" },
  ];

  return (
    <AppShell
      brand="JiooDev Admin"
      title="Panel Internal"
      subtitle="Operasional platform"
      items={NAV}
      actions={
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm text-muted transition-colors duration-150 hover:border-ink/30 hover:text-ink"
        >
          {t(locale, "action.workspace")}
        </Link>
      }
      footer={<LogoutButton />}
    >
      {children}
    </AppShell>
  );
}
