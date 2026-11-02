import Link from "next/link";
import { LogoutButton } from "@/shared/ui/logout-button";

const NAV = [
  ["Dashboard", "/admin"],
  ["Projects", "/admin/projects"],
  ["Paket", "/admin/packages"],
  ["Pembayaran", "/admin/payments"],
  ["Deploy", "/admin/deploy"],
  ["Konten", "/admin/content"],
  ["Pengaturan", "/admin/settings"],
  ["Audit", "/admin/audit"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3">
          <Link href="/admin" className="font-display text-lg font-semibold text-ink">
            JSDEV Admin
          </Link>
          <span className="hidden text-xs text-muted sm:inline">Panel Internal</span>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/app" className="text-sm text-muted hover:text-ink">
              Ke Workspace
            </Link>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-5 pb-3 text-sm text-muted sm:hidden">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="whitespace-nowrap hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-5 py-8">
        <aside className="hidden w-48 shrink-0 sm:block">
          <nav className="flex flex-col gap-1 text-sm">
            {NAV.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-muted hover:bg-surface hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
