import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-4">
          <Link href="/" className="font-display text-xl font-semibold text-ink">
            JiooDev
          </Link>
          <nav className="ml-auto hidden gap-5 text-sm text-muted sm:flex">
            <Link href="/features" className="hover:text-ink">Fitur</Link>
            <Link href="/pricing" className="hover:text-ink">Harga</Link>
            <Link href="/templates" className="hover:text-ink">Template</Link>
            <Link href="/contact" className="hover:text-ink">Kontak</Link>
          </nav>
          <Link
            href="/login"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Masuk
          </Link>
        </div>
      </header>
      <main id="konten">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} JiooDev. AI-Powered Digital Production Ecosystem.</p>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-ink">Kontak</Link>
            <Link href="/login" className="hover:text-ink">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
