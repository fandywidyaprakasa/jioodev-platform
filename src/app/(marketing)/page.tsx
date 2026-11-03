import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "JiooDev — Website profesional dari konteks bisnis",
  description:
    "AI memahami bisnis Anda, memilih template, lalu menghasilkan website siap deploy.",
};

const WORKFLOW = [
  {
    step: "01",
    title: "Ceritakan bisnis Anda",
    body: "Industri, audiens, tujuan, dan kanal. Konteks ini menjadi dasar setiap keputusan desain.",
  },
  {
    step: "02",
    title: "Pilih arah, bukan tebak-tebakan",
    body: "Tiga varian dari Design Foundation yang sama. Bandingkan desktop dan mobile sebelum memilih.",
  },
  {
    step: "03",
    title: "Sesuaikan, lalu deploy",
    body: "Atur section dan copy tanpa menyentuh HTML. Preview aman, deploy terkelola.",
  },
];

const TEMPLATE_ROWS = [
  {
    code: "LAND",
    name: "Landing page",
    use: "Menu, layanan, penawaran",
    sample: "LAND-LSPLIT-EDT-001",
  },
  {
    code: "WEB",
    name: "Website profil",
    use: "Multi-halaman, kredibilitas",
    sample: "WEB-LPORT-EDT-012",
  },
  {
    code: "COMM",
    name: "Commerce lite",
    use: "Katalog, order WhatsApp",
    sample: "COMM-LGRID-EDT-015",
  },
];

function MiniPreview() {
  return (
    <figure className="relative">
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
        <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="ml-2 truncate font-mono text-[10px] text-muted">
            preview.jioo.site/kopi-pagi
          </span>
        </div>
        <div aria-hidden="true" className="p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <span className="font-display text-lg text-ink">Kopi Pagi</span>
            <div className="hidden gap-4 text-[10px] text-muted sm:flex">
              <span>Menu</span>
              <span>Cerita</span>
              <span>Lokasi</span>
            </div>
            <span className="rounded-full bg-accent px-3 py-1.5 text-[10px] font-medium text-on-accent">
              Pesan
            </span>
          </div>
          <div className="grid gap-5 pt-6 sm:grid-cols-[1.15fr_0.85fr] sm:items-center">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                Roastery · Bandung
              </p>
              <p className="mt-2 font-display text-2xl leading-[1.05] text-ink sm:text-[2rem]">
                Kopi pagi,
                <br />
                energi baru.
              </p>
              <p className="mt-3 max-w-[30ch] text-[11px] leading-relaxed text-muted">
                Biji lokal, racikan konsisten, dan ruang tenang untuk memulai hari.
              </p>
              <span className="mt-4 inline-flex rounded-full bg-accent px-3 py-1.5 text-[10px] font-medium text-on-accent">
                Lihat menu
              </span>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-md bg-accent-soft">
              <span className="absolute left-4 top-4 font-display text-5xl leading-none text-accent/80">
                KP
              </span>
              <div className="absolute inset-x-4 bottom-4 space-y-1.5">
                <span className="block h-px bg-accent/25" />
                <span className="block h-px w-3/4 bg-accent/25" />
                <span className="block h-px w-1/2 bg-accent/25" />
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-4">
            {["Espresso", "Manual brew", "Pastry"].map((item, index) => (
              <div key={item} className="rounded border border-line px-2.5 py-2">
                <p className="text-[9px] font-medium text-ink">{item}</p>
                <p className="mt-0.5 font-mono text-[8px] text-muted">
                  0{index + 1} · mulai 25k
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <span>Contoh hasil · LAND</span>
        <span className="text-accent">3 varian</span>
      </figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="grid gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <h1 className="max-w-[14ch] font-display text-[2.75rem] leading-[1.02] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[4.4rem]">
            Website yang paham{" "}
            <em className="italic text-accent">bisnis Anda</em>, bukan cuma tampil rapi.
          </h1>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-muted">
            JiooDev membaca konteks bisnis, memilih fondasi desain yang relevan, lalu
            menyusun website siap deploy. Anda fokus pada keputusan; kami urus produksinya.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app/projects/new"
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Mulai tanpa akun
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/templates"
              className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-6 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink/40"
            >
              Lihat template
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sudah punya akun? Masuk
            </Link>
            <Link href="/register" className="text-muted hover:text-ink">
              atau daftar dengan Google
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {["Tanpa coding", "Preview aman", "Deploy terkelola"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <MiniPreview />
      </section>

      <section className="border-y border-line py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h2 className="max-w-[16ch] font-display text-3xl leading-tight tracking-[-0.025em] text-ink sm:text-4xl">
              Dari brief ke live dalam satu alur.
            </h2>
            <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-muted">
              Setiap langkah menyimpan keputusan dan alasan di baliknya. Tidak ada
              desain yang dimulai dari halaman kosong.
            </p>
          </div>
          <ol className="border-t border-line">
            {WORKFLOW.map((item) => (
              <li key={item.step} className="grid gap-2 border-b border-line py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-6">
                <span className="font-mono text-xs tracking-[0.14em] text-accent">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 max-w-[58ch] text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="font-display text-3xl leading-tight tracking-[-0.025em] text-ink sm:text-4xl">
              Template bukan titik akhir.
            </h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted">
              Fondasi yang sama, tiga arah produk. Struktur dan section tetap bisa
              disesuaikan setelah arah dipilih.
            </p>
          </div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            Jelajahi katalog
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-8 border-t border-line">
          {TEMPLATE_ROWS.map((item) => (
            <Link
              key={item.code}
              href="/templates"
              className="group grid gap-2 border-b border-line py-5 transition-colors duration-150 hover:bg-surface sm:grid-cols-[5rem_1fr_1fr_auto] sm:items-center sm:gap-6 sm:px-3"
            >
              <span className="font-mono text-xs tracking-[0.14em] text-accent">
                {item.code}
              </span>
              <span className="text-[15px] font-semibold text-ink">{item.name}</span>
              <span className="text-sm text-muted">{item.use}</span>
              <span className="hidden items-center gap-3 font-mono text-[10px] text-muted sm:flex">
                {item.sample}
                <ArrowUpRight
                  className="h-4 w-4 text-accent transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pb-16 lg:pb-24">
        <div className="rounded-lg border border-line bg-accent-soft px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div>
              <h2 className="max-w-[22ch] font-display text-3xl leading-tight tracking-[-0.025em] text-ink sm:text-4xl">
                Mulai dari satu konteks bisnis.
              </h2>
              <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-muted">
                Gratis untuk membuat project dan melihat varian. Bayar hanya saat siap
                deploy.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app/projects/new"
                className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-strong"
              >
                Buat project
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center rounded-full border border-ink/15 bg-surface/70 px-6 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink/40"
              >
                Tanya dulu
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
