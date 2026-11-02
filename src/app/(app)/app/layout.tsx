import Link from "next/link";
import { LogoutButton } from "@/shared/ui/logout-button";

const NAV = [
  ["Dashboard", "/app"],
  ["Projects", "/app/projects"],
  ["Akun", "/app/account"],
  ["Notifikasi", "/app/account/notifications"],
  ["Tagihan", "/app/account/invoices"],
  ["Paket & Kuota", "/app/account/subscription"],
  ["Pengaturan", "/app/account/settings"],
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/app" className="font-display text-lg font-semibold text-ink">
            JSDEV
          </Link>
          <span className="hidden text-xs text-muted sm:inline">Workspace</span>
          <div className="ml-auto flex items-center gap-3">
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
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-5 pb-3 text-sm text-muted sm:hidden">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="whitespace-nowrap hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-5 py-8">
        <aside className="hidden w-52 shrink-0 sm:block">
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
