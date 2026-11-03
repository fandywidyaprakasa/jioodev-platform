import Link from "next/link";
import { MarketingNav } from "@/modules/marketing/components/marketing-nav";
import { ThemeSwitcher } from "@/shared/ui";

const FOOTER_NAV = [
  { href: "/features", label: "Fitur" },
  { href: "/pricing", label: "Harga" },
  { href: "/templates", label: "Template" },
  { href: "/contact", label: "Kontak" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-ink font-display text-sm text-paper">
              J
            </span>
            <span className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              JiooDev
            </span>
          </Link>
          <MarketingNav />
          <details className="relative ml-auto sm:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-full border border-line px-3.5 text-sm text-ink">
              Menu
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-line bg-surface p-2 text-sm shadow-md">
              <MarketingNav mobile />
            </div>
          </details>
          <ThemeSwitcher />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-strong"
          >
            Masuk
          </Link>
        </div>
      </header>
      <main id="konten">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded bg-ink font-display text-xs text-paper">
                J
              </span>
              <span className="font-display text-base font-semibold text-ink">
                JiooDev
              </span>
            </div>
            <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted">
              AI-powered digital production untuk bisnis yang ingin tampil relevan,
              bukan sekadar hadir.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Produk
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {FOOTER_NAV.slice(0, 3).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-ink hover:text-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Akun
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/login" className="text-ink hover:text-accent">
                  Masuk
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-ink hover:text-accent">
                  Daftar
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-ink hover:text-accent">
                  Kontak
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs text-muted">
            <p>© {new Date().getFullYear()} JiooDev. Seluruh hak dilindungi.</p>
            <p className="font-mono uppercase tracking-[0.12em]">
              Design Foundation · Business Context · AI Transformation
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
