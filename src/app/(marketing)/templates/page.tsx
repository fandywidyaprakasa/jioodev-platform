import type { Metadata } from "next";
import { ThemeCatalog } from "@/modules/catalog/components/theme-catalog";
import { listThemes } from "@/shared/lib/catalog-server";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalog Theme — JiooDev",
  description:
    "Jelajahi theme JiooDev: satu theme, banyak varian untuk landing page, website, dan commerce.",
};

export default async function TemplatesPage() {
  const themes = await listThemes();
  const variantCount = themes.reduce(
    (total, theme) => total + theme.variantCount,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <PageHeader
        title="Pilih theme, lalu variannya."
        description={`${themes.length} theme · ${variantCount} varian terkurasi. Buka theme untuk melihat tipe produk, tier, dan varian.`}
      />
      <ThemeCatalog themes={themes} mode="browse" />
    </div>
  );
}
