import Link from "next/link";
import { mockPackages } from "@/shared/lib/mock-data";
import { rupiah } from "@/shared/lib/format";
import { Badge, Card, PageHeader } from "@/shared/ui";

export default function PricingPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Harga"
        title="Harga & Paket"
        description="Pay-per-deploy untuk mulai cepat, subscription untuk produksi rutin."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {mockPackages.map((item) => (
          <Card key={item.id} title={item.name}>
            <p className="font-display text-3xl text-ink">{rupiah(item.price)}</p>
            <p className="mt-1 text-sm text-muted">{item.quota} deploy · revisi section</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>Business context & comprehend</li>
              <li>Template library akses</li>
              <li>Preview dua sumbu</li>
              <li>Deploy semi-manual</li>
            </ul>
            <div className="mt-5 flex items-center justify-between">
              <Badge variant={item.active ? "success" : "neutral"}>
                {item.active ? "Tersedia" : "Segera"}
              </Badge>
              <Link
                href={item.active ? "/register" : "/contact"}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
              >
                {item.active ? "Mulai" : "Tanya"}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
