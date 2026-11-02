import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, type NavItem } from "@/shared/ui";
import { LogoutButton } from "@/shared/ui/logout-button";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Projects", href: "/admin/projects" },
  { label: "Paket", href: "/admin/packages" },
  { label: "Pembayaran", href: "/admin/payments" },
  { label: "Deploy", href: "/admin/deploy" },
  { label: "Konten", href: "/admin/content" },
  { label: "Pengaturan", href: "/admin/settings" },
  { label: "Audit", href: "/admin/audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      brand="JiooDev Admin"
      title="Panel Internal"
      subtitle="Operasional platform"
      items={NAV}
      actions={
        <Link href="/app" className="text-sm text-muted hover:text-ink">
          Ke Workspace
        </Link>
      }
      footer={<LogoutButton />}
    >
      {children}
    </AppShell>
  );
}
