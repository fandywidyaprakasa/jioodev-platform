import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, type NavItem } from "@/shared/ui";
import { LogoutButton } from "@/shared/ui/logout-button";
import { getLocale } from "@/shared/lib/locale";
import { t } from "@/shared/lib/i18n";
import { currentUser } from "@/shared/lib/server-auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const user = await currentUser();
  const isGuest = !user || user.role === "guest";

  const NAV: NavItem[] = isGuest
    ? [
        { label: t(locale, "nav.dashboard"), href: "/app" },
        { label: t(locale, "nav.projects"), href: "/app/projects" },
      ]
    : [
        { label: t(locale, "nav.dashboard"), href: "/app" },
        { label: t(locale, "nav.projects"), href: "/app/projects" },
        { label: t(locale, "nav.account"), href: "/app/account" },
        { label: t(locale, "nav.notifications"), href: "/app/account/notifications" },
        { label: t(locale, "nav.invoices"), href: "/app/account/invoices" },
        { label: t(locale, "nav.subscription"), href: "/app/account/subscription" },
        { label: t(locale, "nav.settings"), href: "/app/account/settings" },
      ];

  return (
    <AppShell
      brand="JiooDev"
      title="Workspace"
      subtitle={isGuest ? "Mulai project tanpa akun" : "Kelola project dan akun Anda"}
      items={NAV}
      actions={
        <>
          <Link
            href="/app/projects/new"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-strong"
          >
            {t(locale, "action.createProject")}
          </Link>
          {isGuest ? (
            <Link
              href="/login?next=/app"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink/40"
            >
              Masuk
            </Link>
          ) : (
            <>
              {user.role === "admin" ? (
                <Link
                  href="/admin"
                  className="hidden min-h-11 items-center px-2 text-sm text-muted transition-colors hover:text-ink sm:inline-flex"
                >
                  {t(locale, "action.admin")}
                </Link>
              ) : null}
              <LogoutButton />
            </>
          )}
        </>
      }
    >
      {children}
    </AppShell>
  );
}
