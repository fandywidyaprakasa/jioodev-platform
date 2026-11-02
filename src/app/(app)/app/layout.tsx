import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, type NavItem } from "@/shared/ui";
import { LogoutButton } from "@/shared/ui/logout-button";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/app" },
  { label: "Projects", href: "/app/projects" },
  { label: "Akun", href: "/app/account" },
  { label: "Notifikasi", href: "/app/account/notifications" },
  { label: "Tagihan", href: "/app/account/invoices" },
  { label: "Paket & Kuota", href: "/app/account/subscription" },
  { label: "Pengaturan", href: "/app/account/settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      brand="JiooDev"
      title="Workspace"
      subtitle="Kelola project dan akun Anda"
      items={NAV}
      actions={
        <>
          <Link
            href="/app/projects/new"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Buat Project
          </Link>
          <Link href="/admin" className="text-sm text-muted hover:text-ink">
            Admin
          </Link>
          <LogoutButton />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
