import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Fitur — JiooDev",
  description:
    "Business context, template relevan, preview varian, dan deploy terkelola.",
};

const FEATURES = [
  [
    "Konteks bisnis lebih dulu",
    "Industri, tujuan, audiens, dan kanal dibaca sebelum satu keputusan desain dibuat. Hasilnya relevan, bukan sekadar rapi.",
  ],
  [
    "Design Foundation",
    "Template terkurasi dengan struktur section yang bisa ditransformasi. Fondasi kuat, variasi tetap luas.",
  ],
  [
    "Preview dua sumbu",
    "Bandingkan gaya dan layout secara terpisah, di desktop dan mobile, sebelum memilih arah.",
  ],
  [
    "Editor section & copy",
    "Aktifkan section, ubah urutan, dan override teks tanpa menyentuh HTML atau merusak struktur.",
  ],
  [
    "Preview aman",
    "Setiap preview memakai token sementara dan noindex. Hanya pemilik project yang bisa membuka.",
  ],
  [
    "Deploy terukur",
    "HTML statis ringan, siap dipasang di subdomain JiooDev atau domain sendiri.",
  ],
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title="Dari konteks bisnis sampai produk digital siap deploy."
        description="JiooDev bukan page builder. Ini alur produksi yang menyimpan alasan di balik setiap keputusan desain."
      />

      <div className="grid gap-x-12 border-t border-line sm:grid-cols-2">
        {FEATURES.map(([title, body]) => (
          <article key={title} className="border-b border-line py-7">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            <p className="mt-2 max-w-[48ch] text-pretty text-sm leading-relaxed text-muted">
              {body}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-5">
        <p className="max-w-[52ch] text-sm leading-relaxed text-muted">
          Mulai dari satu project. Anda bisa berhenti di preview, atau lanjut ke deploy
          saat sudah yakin.
        </p>
        <Link
          href="/register"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
        >
          Mulai sekarang
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
