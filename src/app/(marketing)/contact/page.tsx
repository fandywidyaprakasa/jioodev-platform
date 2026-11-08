import { Mail, MessageCircle, Timer } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/modules/marketing/client";
import { PageHeader } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Kontak — JiooDev",
  description:
    "Ceritakan kebutuhan bisnis Anda. Tim JiooDev membantu memetakan produk dan paket yang masuk akal.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title="Ceritakan kebutuhan bisnis Anda."
        description="Kami bantu petakan produk yang masuk akal, bukan menjual paket yang tidak Anda butuhkan."
      />

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <ContactForm />

        <aside>
          <h2 className="text-[15px] font-semibold text-ink">Kontak langsung</h2>
          <ul className="mt-4 border-t border-line">
            <li className="flex items-start gap-3 border-b border-line py-4">
              <MessageCircle className="mt-0.5 h-4 w-4 text-accent" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                  WhatsApp
                </p>
                <p className="mt-1 text-sm text-ink">+62 812-0000-0000</p>
              </div>
            </li>
            <li className="flex items-start gap-3 border-b border-line py-4">
              <Mail className="mt-0.5 h-4 w-4 text-accent" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                  Email
                </p>
                <a
                  href="mailto:hello@jioo.site"
                  className="mt-1 block text-sm text-ink underline-offset-4 hover:text-accent hover:underline"
                >
                  hello@jioo.site
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3 border-b border-line py-4">
              <Timer className="mt-0.5 h-4 w-4 text-accent" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                  Jam operasional
                </p>
                <p className="mt-1 text-sm text-ink">Senin–Jumat, 09.00–17.00 WIB</p>
              </div>
            </li>
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Belum yakin harus mulai dari mana? Kirim konteks singkat dan kami akan
            sarankan tipe produk yang paling dekat dengan kebutuhan Anda.
          </p>
        </aside>
      </div>
    </div>
  );
}
