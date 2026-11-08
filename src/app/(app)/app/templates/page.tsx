import type { Metadata } from "next";
import { ThemeCatalog } from "@/modules/catalog/client";
import { listThemes } from "@/modules/catalog";
import { ALL_PRODUCT_TYPES } from "@/shared/types";
import { PageHeader } from "@/shared/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Template Library — JiooDev",
};

export default async function AppTemplatesPage() {
  const themes = await listThemes(ALL_PRODUCT_TYPES);
  const variantCount = themes.reduce(
    (total, theme) => total + theme.variantCount,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Template Library"
        description={`${themes.length} theme · ${variantCount} varian. Pilih template untuk langsung membuat project.`}
      />
      <ThemeCatalog
        themes={themes}
        mode="browse"
        useTemplateHref="/app/projects/new"
      />
    </div>
  );
}
