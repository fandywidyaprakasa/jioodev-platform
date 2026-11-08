import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/shared/ui";
import { LogoutButton } from "@/shared/ui/logout-button";
import { getLocale } from "@/shared/lib/locale";
import { t } from "@/shared/lib/i18n";
import { currentUser } from "@/modules/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || user.role !== "admin") {
    redirect("/login?next=/admin");
  }
  const locale = await getLocale();
  const NAV: NavItem[] = [
    {
      label: t(locale, "nav.admin.dashboard"),
      href: "/admin",
      group: t(locale, "nav.group.operations"),
      exact: true,
    },
    {
      label: t(locale, "nav.admin.projects"),
      href: "/admin/projects",
      group: t(locale, "nav.group.operations"),
    },
    {
      label: t(locale, "nav.admin.payments"),
      href: "/admin/payments",
      group: t(locale, "nav.group.operations"),
      exact: true,
    },
    {
      label: t(locale, "nav.admin.subscriptions"),
      href: "/admin/subscriptions",
      group: t(locale, "nav.group.operations"),
      exact: true,
    },
    {
      label: t(locale, "nav.admin.deploy"),
      href: "/admin/deploy",
      group: t(locale, "nav.group.operations"),
      exact: true,
    },
    {
      label: t(locale, "nav.admin.packages"),
      href: "/admin/packages",
      group: t(locale, "nav.group.content"),
      exact: true,
    },
    {
      label: t(locale, "nav.admin.content"),
      href: "/admin/content",
      group: t(locale, "nav.group.content"),
      exact: true,
    },
    {
      label: t(locale, "nav.admin.settings"),
      href: "/admin/settings",
      group: t(locale, "nav.group.system"),
      exact: true,
    },
    {
      label: t(locale, "nav.admin.audit"),
      href: "/admin/audit",
      group: t(locale, "nav.group.system"),
      exact: true,
    },
  ];

  return (
    <AppShell
      brand="JiooDev Admin"
      homeHref="/admin"
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
