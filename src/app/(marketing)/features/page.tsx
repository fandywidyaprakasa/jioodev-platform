import { Card, PageHeader } from "@/shared/ui";

const FEATURES = [
  ["Business context first", "AI memahami industri, tujuan, audiens, dan kanal sebelum menyusun desain."],
  ["Design foundation", "Template terkurasi dengan struktur section yang bisa ditransformasi."],
  ["Two-axis preview", "Bandingkan style dan layout secara terpisah sebelum memilih."],
  ["Section & copy editor", "Aktifkan section, ubah urutan, dan override copy tanpa menyentuh HTML."],
  ["Preview aman", "Preview ephemeral dengan noindex; hanya pemilik yang bisa mengakses."],
  ["Deploy terukur", "HTML statis ringan, siap dipasang di subdomain JiooDev atau domain sendiri."],
];

export default function FeaturesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Fitur"
        title="Fitur JiooDev"
        description="Dari konteks bisnis sampai produk digital siap deploy."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([title, body]) => (
          <Card key={title} title={title}>
            <p className="text-sm text-muted">{body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
