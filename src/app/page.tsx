export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl font-semibold text-ink">JSDEV</span>
        <span className="text-sm text-muted">Blueprint v0.12 · Phase 1</span>
      </header>

      <section className="mt-16 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          AI-Powered Digital Production
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight text-ink sm:text-5xl">
          Bangun produk digital yang{" "}
          <em className="italic text-accent">benar-benar bekerja</em>.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Design Foundation + Business Context + AI Transformation =
          Customized Digital Product.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#mulai"
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Mulai Sekarang
          </a>
          <a
            href="#fitur"
            className="rounded-full border border-line px-5 py-3 text-sm font-medium text-ink hover:border-ink"
          >
            Lihat Fitur
          </a>
        </div>
      </section>

      <section id="fitur" className="mt-20 grid gap-4 sm:grid-cols-3">
        {[
          ["Konteks bisnis dulu", "AI memahami bisnis sebelum memilih desain."],
          ["Fondasi yang ditransformasi", "Bukan sekadar ganti teks dan gambar."],
          ["Section reusable", "Satu fondasi, banyak variasi produk."],
        ].map(([title, body]) => (
          <article
            key={title}
            className="rounded-lg border border-line bg-surface p-5"
          >
            <h2 className="font-display text-lg text-ink">{title}</h2>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </article>
        ))}
      </section>

      <section
        id="mulai"
        className="mt-16 rounded-lg border border-line bg-surface p-6"
      >
        <h2 className="font-display text-2xl text-ink">Status</h2>
        <p className="mt-2 text-sm text-muted">
          Scaffold Phase 1 aktif. Workspace & API menyusul pada task berikutnya.
        </p>
      </section>
    </main>
  );
}
