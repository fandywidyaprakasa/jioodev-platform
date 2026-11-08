import type { Metadata } from "next";
import { ThemeCatalog } from "@/modules/catalog/client";
import { listThemes } from "@/modules/catalog";
import { ALL_PRODUCT_TYPES } from "@/shared/types";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalog Theme — JiooDev",
  description:
    "Jelajahi theme JiooDev: satu theme, banyak varian untuk Landing, Website, dan Commerce.",
};

export default async function TemplatesPage() {
  const themes = await listThemes(ALL_PRODUCT_TYPES);
  const variantCount = themes.reduce(
    (total, theme) => total + theme.variantCount,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title="Pilih theme, lalu variannya."
        description={`${themes.length} theme · ${variantCount} varian terkurasi. Filter berdasarkan produk, style, layout, tier, industri, atau tujuan.`}
        back={{ href: "/", label: "Kembali ke beranda" }}
      />
      <ThemeCatalog themes={themes} mode="browse" />
    </div>
  );
}
