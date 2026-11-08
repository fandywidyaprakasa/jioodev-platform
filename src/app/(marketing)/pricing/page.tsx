import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listPackages } from "@/modules/admin";
import { rupiah } from "@/shared/lib/format";
import { tierLabel } from "@/shared/lib/taxonomy";
import { Badge, Empty, PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Harga — JiooDev",
  description: "Paket transparan untuk landing page, website, dan commerce.",
};

const INCLUDED = [
  "Business context & comprehend",
  "Akses Design Foundation",
  "Preview desktop & mobile",
];

export default async function PricingPage() {
  const packages = (await listPackages().catch(() => [])).filter(
    (item) => item.active,
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title="Harga yang mengikuti pekerjaan."
        description="Mulai per deploy untuk kebutuhan sesekali, atau pilih paket untuk produksi rutin. Tidak ada biaya tersembunyi."
      />

      {packages.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {packages.map((item, index) => {
            const featured = index === 0 && packages.length > 1;
            return (
              <article
                key={item.id}
                className={`flex flex-col rounded-lg border bg-surface p-6 ${
                  featured ? "border-accent shadow-md" : "border-line shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[15px] font-semibold text-ink">{item.name}</h2>
                  {featured ? <Badge variant="accent">Paling sering</Badge> : null}
                </div>
                <p className="mt-5 font-display text-4xl leading-none tracking-[-0.03em] text-ink tabular-nums">
                  {rupiah(item.price)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {item.deploy_included} deploy · {item.max_sections} section · {tierLabel(item.tier)}
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm text-muted">
                  {INCLUDED.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Deploy semi-manual
                  </li>
                </ul>
                <Link
                  href="/register"
                  className={`mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] ${
                    featured
                      ? "bg-accent text-on-accent hover:bg-accent-strong"
                      : "border border-line bg-surface text-ink hover:border-ink/40"
                  }`}
                >
                  Mulai dengan paket ini
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Paket belum tersedia"
          description="Hubungi kami untuk penawaran awal sementara katalog paket disiapkan."
          action={
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] hover:bg-accent-strong"
            >
              Hubungi kami
            </Link>
          }
        />
      )}

      <p className="mt-8 max-w-[62ch] text-sm leading-relaxed text-muted">
        Butuh volume lebih besar atau alur khusus?{" "}
        <Link href="/contact" className="font-medium text-accent hover:underline">
          Bicarakan kebutuhan Anda
        </Link>
        . Kami bantu petakan paket dan kuota yang masuk akal.
      </p>
    </div>
  );
}
