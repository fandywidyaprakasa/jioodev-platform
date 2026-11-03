import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="konten" className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="hidden flex-col justify-between bg-ink px-10 py-12 text-paper lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-paper font-display text-base text-ink">
            J
          </span>
          <span className="font-display text-xl font-semibold tracking-[-0.02em]">
            JiooDev
          </span>
        </Link>

        <div className="max-w-md">
          <h2 className="font-display text-[2.75rem] leading-[1.05] tracking-[-0.035em]">
            Produk digital yang dimulai dari konteks, bukan template.
          </h2>
          <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-paper/65">
            Satu alur dari brief bisnis ke website siap deploy. Anda memegang
            keputusan; produksinya kami urus.
          </p>
          <ol className="mt-8 border-t border-paper/15">
            {[
              "Konteks bisnis",
              "Pilih arah desain",
              "Sesuaikan & deploy",
            ].map((item, index) => (
              <li
                key={item}
                className="flex items-baseline gap-4 border-b border-paper/15 py-3.5 text-sm text-paper/80"
              >
                <span className="font-mono text-[10px] tracking-[0.16em] text-paper/70">
                  0{index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/70">
          Design Foundation · Business Context · AI Transformation
        </p>
      </aside>

      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-ink font-display text-sm text-paper">
                J
              </span>
              <span className="font-display text-xl font-semibold text-ink">
                JiooDev
              </span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
